import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

import { BrandingView } from '@/components/BrandingView';
import WebLandingPage from '@/components/WebLandingPage';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts as useBricolageFonts
} from '@expo-google-fonts/bricolage-grotesque';
import { PlayfairDisplay_400Regular, PlayfairDisplay_400Regular_Italic, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic, useFonts as usePlayfairFonts } from '@expo-google-fonts/playfair-display';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts as usePoppinsFonts
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

// Suppress known warnings
LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental is currently a no-op',
]);

import * as SystemUI from 'expo-system-ui';

// Custom Deep Black Theme
const BlackTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    border: '#1a1a1a',
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading: authLoading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [playfairLoaded] = usePlayfairFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold_Italic,
  });

  const [bricolageLoaded] = useBricolageFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });

  const [poppinsLoaded] = usePoppinsFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const fontsLoaded = playfairLoaded && bricolageLoaded && poppinsLoaded;

  useEffect(() => {
    // Set root view background to prevent white flash
    SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Navigation protection and proactive redirection logic
  // -- Navigation Protection & Proactive Redirection --
  useEffect(() => {
    // 0. Wait for initialization
    if (!fontsLoaded || authLoading) return;
    
    // 1. Analyze current state
    const inTabs = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const isIndex = pathname === '/';
    const isLogin = pathname === '/login';
    
    if (session) {
      // 2. Handling Logged In Users
      if (!hasCompletedOnboarding) {
        // A. Onboarding Incomplete -> Force Onboarding
        if (segments[0] !== 'onboarding') {
           setTimeout(() => router.replace('/onboarding'), 0);
        }
      } else {
        // B. Onboarding Complete -> Protect from Public Routes
        const currentPath = pathname;
        const segment = segments[0] || '';
        
        // whitelist allowed paths
        const isAllowedPath = 
          segment === '(tabs)' || 
          segment === 'article' || 
          segment === 'edit-interests' || 
          currentPath.includes('edit-interests');
        
        // Redirect to Home if on unauthorized public page (like /login or /)
        if (!isAllowedPath) {
          console.log('DEBUG: Redirecting to home from:', currentPath);
          setTimeout(() => router.replace('/home'), 0);
        }
      }
    } else {
      // 3. Handling Logged Out Users
      // Restore protection for private routes (tabs, onboarding)
      if (segments[0] === '(tabs)' || segments[0] === 'onboarding') {
        setTimeout(() => router.replace('/'), 0);
      }
    }
  }, [session, segments, authLoading, fontsLoaded, hasCompletedOnboarding]);

  // Create dynamic Navigation Theme
  const navTheme = {
    ...DarkTheme,
    dark: isDark,
    colors: {
      ...DarkTheme.colors,
      primary: theme.brand.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text.primary,
      border: theme.border,
      notification: theme.brand.secondary,
    },
  };

  // Don't show content until ready
  const isReady = fontsLoaded && !authLoading;

  // Show landing page on web, full app on mobile
  if (Platform.OS === 'web') {
    return <WebLandingPage />;
  }

  return (
    <NavigationThemeProvider value={navTheme}>
      <Slot />
      {authLoading && <BrandingView />}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}
