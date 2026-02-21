import { TabRouter } from "@react-navigation/native";
import { Navigator } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";

import { useRole } from "@/context/RoleContext";

/**
 * Custom slot that renders BOTH tab groups inside a PagerView.
 * Page 0 = (founder-tabs), Page 1 = (freelancer-tabs).
 * PagerView keeps both pages mounted and provides native 60fps horizontal slide.
 */
function PagerSlot() {
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
  return (
    <Navigator router={TabRouter} screenOptions={{ headerShown: false }}>
      <Navigator.Screen name="(founder-tabs)" />
      <Navigator.Screen name="(freelancer-tabs)" />
      <PagerSlot />
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
});
