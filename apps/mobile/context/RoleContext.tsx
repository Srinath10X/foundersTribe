import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type PagerView from "react-native-pager-view";

export type UserRole = "founder" | "freelancer";
export type SwitchDirection = "left" | "right" | null;

type RoleContextType = {
  role: UserRole;
  switchRole: (role: UserRole) => void;
  toggleRole: () => void;
  isRoleLoaded: boolean;
  /** Ref to the PagerView instance so the tab bar can call setPage(). */
  pagerRef: React.MutableRefObject<PagerView | null>;
  /** Whether a role switch animation is currently in progress. */
  isSwitching: boolean;
  /** Programmatically switch role with pager animation. */
  animatedSwitchRole: (targetRole: UserRole) => void;
  /** @deprecated — kept for backward compat; prefer animatedSwitchRole. */
  switchDirection: React.MutableRefObject<SwitchDirection>;
};

const ROLE_STORAGE_KEY = "@app_user_role";

const defaultDirRef = { current: null as SwitchDirection };
const defaultPagerRef = { current: null as PagerView | null };

const RoleContext = createContext<RoleContextType>({
  role: "founder",
  switchRole: () => {},
  toggleRole: () => {},
  isRoleLoaded: false,
  pagerRef: defaultPagerRef,
  isSwitching: false,
  animatedSwitchRole: () => {},
  switchDirection: defaultDirRef,
});

export const useRole = () => useContext(RoleContext);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("founder");
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const switchDirection = useRef<SwitchDirection>(null);
  const pagerRef = useRef<PagerView | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
        if (saved === "founder" || saved === "freelancer") {
          setRole(saved);
        }
      } catch (e) {
        console.error("Error loading role preference:", e);
      } finally {
        setIsRoleLoaded(true);
      }
    })();
  }, []);

  const switchRole = useCallback(async (newRole: UserRole) => {
    setRole(newRole);
    try {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch (e) {
      console.error("Error saving role preference:", e);
    }
  }, []);

  const toggleRole = useCallback(() => {
    const next = role === "founder" ? "freelancer" : "founder";
    switchRole(next);
  }, [role, switchRole]);

  /**
   * Programmatically switch role with a pager slide animation.
   * The pager slides to the target page, then we update the role state.
   * Includes debounce to prevent rapid double-taps.
   */
  const animatedSwitchRole = useCallback(
    (targetRole: UserRole) => {
      if (isSwitching) return;
      if (targetRole === role) return;

      setIsSwitching(true);

      const targetPage = targetRole === "founder" ? 0 : 1;
      pagerRef.current?.setPage(targetPage);

      // Update role state immediately so the UI reflects the new role
      switchRole(targetRole);

      // Re-enable after the pager transition completes (~350ms)
      setTimeout(() => {
        setIsSwitching(false);
      }, 400);
    },
    [isSwitching, role, switchRole]
  );

  return (
    <RoleContext.Provider
      value={{
        role,
        switchRole,
        toggleRole,
        isRoleLoaded,
        pagerRef,
        isSwitching,
        animatedSwitchRole,
        switchDirection,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}
