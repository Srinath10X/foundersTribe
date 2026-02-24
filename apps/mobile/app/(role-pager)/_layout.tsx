import { TabRouter } from "@react-navigation/native";
import { Navigator } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";

import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

type AllowedUserType = "founder" | "freelancer" | "both";

function parseUserType(raw: unknown): AllowedUserType | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "founder" || normalized === "freelancer" || normalized === "both") {
    return normalized;
  }
  return null;
}

/**
 * Custom slot that renders BOTH tab groups inside a PagerView.
 * Page 0 = (founder-tabs), Page 1 = (freelancer-tabs).
 * PagerView keeps both pages mounted and provides native 60fps horizontal slide.
 */
function PagerSlot({ allowedUserType }: { allowedUserType: AllowedUserType }) {
  const { state, descriptors } = Navigator.useContext();
  const { role, pagerRef: contextPagerRef } = useRole();
  const pagerViewRef = useRef<PagerView>(null);
  const isInitialMount = useRef(true);

  // Callback ref: register PagerView in RoleContext as soon as it mounts.
  const setPagerRef = useCallback(
    (ref: PagerView | null) => {
      pagerViewRef.current = ref;
      if (contextPagerRef) {
        contextPagerRef.current = ref;
      }
    },
    [contextPagerRef]
  );

  // Find the route indices for each tab group
  const founderIndex = state.routes.findIndex(
    (r) => r.name === "(founder-tabs)"
  );
  const freelancerIndex = state.routes.findIndex(
    (r) => r.name === "(freelancer-tabs)"
  );

  // Map role to pager page index
  const targetPage = role === "founder" ? 0 : 1;

  // Sync pager to role on mount (jump without animation) and on role changes
  useEffect(() => {
    if (!pagerViewRef.current) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      pagerViewRef.current.setPageWithoutAnimation(targetPage);
      return;
    }
    // Subsequent role changes are animated via pagerRef.setPage() from ModeSwitchPill.
    // This effect is a fallback for programmatic role changes (e.g., deep links).
    pagerViewRef.current.setPage(targetPage);
  }, [targetPage]);

  // Get descriptors for both tab groups
  const founderDescriptor =
    founderIndex >= 0 ? descriptors[state.routes[founderIndex].key] : null;
  const freelancerDescriptor =
    freelancerIndex >= 0
      ? descriptors[state.routes[freelancerIndex].key]
      : null;

  if (allowedUserType === "founder") {
    return <View style={styles.page}>{founderDescriptor?.render()}</View>;
  }

  if (allowedUserType === "freelancer") {
    return <View style={styles.page}>{freelancerDescriptor?.render()}</View>;
  }

  return (
    <PagerView
      ref={setPagerRef}
      style={styles.pager}
      initialPage={targetPage}
      scrollEnabled={false}
      overdrag={false}
      overScrollMode="never"
    >
      <View key="founder-page" style={styles.page}>
        {founderDescriptor?.render()}
      </View>
      <View key="freelancer-page" style={styles.page}>
        {freelancerDescriptor?.render()}
      </View>
    </PagerView>
  );
}

export default function RolePagerLayout() {
  const { session } = useAuth();
  const { role, switchRole } = useRole();
  const { theme } = useTheme();
  const [allowedUserType, setAllowedUserType] = useState<AllowedUserType | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveUserType = async () => {
      const token = session?.access_token || "";
      let freshMetadataType: AllowedUserType | null = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        freshMetadataType =
          parseUserType(user?.user_metadata?.user_type) ||
          parseUserType(user?.user_metadata?.role);
      } catch {
        // noop
      }
      const sessionMetadataType =
        parseUserType(session?.user?.user_metadata?.user_type) ||
        parseUserType(session?.user?.user_metadata?.role);

      let dbType: AllowedUserType | null = null;
      if (token) {
        try {
          const profile = await tribeApi.getMyProfile(token);
          dbType = parseUserType(profile?.user_type);
        } catch (error: any) {
          console.warn("[role-pager] getMyProfile failed while resolving user_type:", error?.message);
        }
      } else {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          dbType =
            parseUserType(user?.user_metadata?.user_type) ||
            parseUserType(user?.user_metadata?.role);
        } catch {
          // noop
        }
      }

      const resolved = dbType || freshMetadataType || sessionMetadataType || "both";
      if (cancelled) return;
      setAllowedUserType(resolved);

      // Keep role context aligned when only one role is allowed.
      if ((resolved === "founder" || resolved === "freelancer") && role !== resolved) {
        switchRole(resolved);
      }
    };

    resolveUserType();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.access_token, role, switchRole]);

  if (!allowedUserType) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <Navigator router={TabRouter} screenOptions={{ headerShown: false }}>
      <Navigator.Screen name="(founder-tabs)" />
      <Navigator.Screen name="(freelancer-tabs)" />
      <PagerSlot allowedUserType={allowedUserType} />
    </Navigator>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
