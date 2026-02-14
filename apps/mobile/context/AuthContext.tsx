import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  refreshOnboardingStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  hasCompletedOnboarding: false,
  refreshOnboardingStatus: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isStartupFinished, setIsStartupFinished] = useState(false);
  const isStartupFinishedRef = useRef(false); // Used inside listener to avoid stale closure
  const [isAuthInternalLoading, setIsAuthInternalLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Computed isLoading: True if either internal auth is working OR the 2s branding window is open
  const isLoading = isAuthInternalLoading || !isStartupFinished;

  const checkOnboarding = async (userObj: User) => {
    const startTime = Date.now();
    try {
      console.log('DEBUG: Checking onboarding for user:', userObj.id);
      
      // Reduced timeout to 5s for better UX (was 10s)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Onboarding check timed out after 5s')), 5000)
      );

      const dbCheck = supabase
        .from('user_interests')
        .select('user_id')
        .eq('user_id', userObj.id)
        .limit(1);
      
      const result = await Promise.race([dbCheck, timeoutPromise]) as any;
      const duration = Date.now() - startTime;
      console.log(`DEBUG: Onboarding check took ${duration}ms`);
      
      // Check if it was a timeout
      if (result instanceof Error) {
        throw result;
      }
      
      const { data, error } = result;
      
      if (error) {
        console.error('DEBUG: Database error during onboarding check:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      const completed = data && data.length > 0;
      console.log('DEBUG: Onboarding check result:', completed ? 'COMPLETED' : 'NOT COMPLETED', `(found ${data?.length || 0} interests)`);
      setHasCompletedOnboarding(completed);
      return completed;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`ERROR checking onboarding status (took ${duration}ms):`, error?.message || error);
      
      // Log additional error details if available
      if (error?.code) console.error('ERROR code:', error.code);
      if (error?.details) console.error('ERROR details:', error.details);
      if (error?.hint) console.error('ERROR hint:', error.hint);
      if (error?.status) console.error('ERROR status:', error.status);
      
      // Check for RLS/permission issues
      if (error?.code === 'PGRST301' || error?.status === 403) {
        console.error('⚠️ RLS POLICY ISSUE: User does not have permission to read user_interests table');
        console.error('💡 Check your Supabase dashboard RLS policies for the user_interests table');
      }
      
      // STRICT MODE: If check fails for ANY reason, assume onboarding NOT complete
      // This ensures onboarding is mandatory and users can't bypass it
      console.log('DEBUG: Onboarding check failed - defaulting to NOT COMPLETED (user must onboard)');
      setHasCompletedOnboarding(false);
      return false;
    }
  };

    const refreshOnboardingStatus = async () => {
    if (user) {
      console.log('DEBUG: Refreshing onboarding status for user:', user.id);
      const result = await checkOnboarding(user);
      console.log('DEBUG: Refresh result:', result);
    }
  };

  useEffect(() => {
    // 1. Mandatory 2-second branding timer
    const brandingTimer = setTimeout(() => {
      console.log('DEBUG: 2s Branding timer finished');
      setIsStartupFinished(true);
      isStartupFinishedRef.current = true;
    }, 2000);

    // 2. Safety "Kill Switch" - Never hang for more than 5s
    const safetyTimer = setTimeout(() => {
      if (!isStartupFinishedRef.current) {
        console.log('DEBUG: Safety timeout fired - forcing branding end');
        setIsStartupFinished(true);
        isStartupFinishedRef.current = true;
        setIsAuthInternalLoading(false);
      }
    }, 5000);

    // 3. Auth Initialization
    const initializeAuth = async () => {
      try {
        setIsAuthInternalLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Await to ensure we route correctly (splash will show due to isLoading)
          await checkOnboarding(currentUser);
        }
      } catch (error) {
        console.error('DEBUG: Auth initialization error:', error);
      } finally {
        setIsAuthInternalLoading(false);
        console.log('DEBUG: Internal auth initialization finished');
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('DEBUG: Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && isStartupFinishedRef.current) {
        console.log('DEBUG: User signed in - starting non-blocking onboarding check');
        
        setIsAuthInternalLoading(true);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Optimistic approach: Assume valid user to enter app immediately
        // This avoids blocking the UI or timing out
        setHasCompletedOnboarding(true);
        
        if (currentUser) {
          // Verify in background without blocking
          setTimeout(async () => {
             console.log('DEBUG: Waiting 2s for backend propagation...');
             
             // Refresh session to ensure we have the latest token/state before checking DB
             const { data: { session: currentSession }, error: refreshError } = await supabase.auth.getSession();
             
             if (refreshError || !currentSession) {
               console.log('DEBUG: Session not available during background check - aborting');
               return;
             }
             
             console.log('DEBUG: Running background onboarding check...');
             const completed = await checkOnboarding(currentSession.user);
             console.log('DEBUG: Background check result:', completed);
             
             // Only if explicitly FALSE (user definitely has no interests), redirect
             if (!completed) {
               console.log('DEBUG: User has NO interests - redirecting to onboarding');
               setHasCompletedOnboarding(false);
             }
          }, 2000); // 2 second delay as requested
        }
        
        setIsAuthInternalLoading(false);
        return;
      }

      // For other auth events (TOKEN_REFRESHED, etc.)
      setIsAuthInternalLoading(true);
      try {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (!currentUser) {
          setHasCompletedOnboarding(false);
        }
      } finally {
        setIsAuthInternalLoading(false);
      }
    });

    return () => {
      clearTimeout(brandingTimer);
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []); // Run only on mount

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      hasCompletedOnboarding, 
      refreshOnboardingStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
