import { BrandingView } from "@/components/BrandingView";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const { role, isRoleLoaded } = useRole();
  const [isReady, setIsReady] = useState(false);

  // -- Initial Load Logic --
  useEffect(() => {
    // Artificial delay to show branding animation if desired,
    // or just wait for auth loading to finish
    if (!isLoading && isRoleLoaded) {
      // Small buffer to ensure animations play smoothly
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 1500); // 1.5s branding duration
      return () => clearTimeout(timer);
    }
  }, [isLoading, isRoleLoaded]);

  // -- Navigation Handoff --
  useEffect(() => {
    if (isReady) {
      if (session) {
        // User authenticated -> Go to role-based tabs
        const target =
          role === "freelancer"
            ? "/(role-pager)/(freelancer-tabs)/dashboard"
            : "/(role-pager)/(founder-tabs)/home";
        router.replace(target);
      } else {
        // New/Guest user -> Show Branding/Landing
        router.replace("/branding");
      }
    }
  }, [isReady, session, role]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <BrandingView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
