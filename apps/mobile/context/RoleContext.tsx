import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserRole = "founder" | "freelancer";

type RoleContextType = {
  role: UserRole;
  switchRole: (role: UserRole) => void;
  toggleRole: () => void;
  isRoleLoaded: boolean;
};

const ROLE_STORAGE_KEY = "@app_user_role";

const RoleContext = createContext<RoleContextType>({
  role: "founder",
  switchRole: () => {},
  toggleRole: () => {},
  isRoleLoaded: false,
});

export const useRole = () => useContext(RoleContext);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("founder");
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);

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

  return (
    <RoleContext.Provider value={{ role, switchRole, toggleRole, isRoleLoaded }}>
      {children}
    </RoleContext.Provider>
  );
}
