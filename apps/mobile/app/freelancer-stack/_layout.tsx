import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BottomMiniNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function FreelancerFlowLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { palette } = useFlowPalette();

  const activeLabel: "home" | "my gigs" | "create" | "chat" | "profile" =
    pathname.includes("/contract-chat")
      ? "chat"
      : pathname.includes("/post-gig")
        ? "create"
        : pathname.includes("/freelancer-profile") || pathname.includes("/founder-profile")
          ? "profile"
          : pathname.includes("/my-gigs") || pathname.includes("/gig-details")
            ? "my gigs"
            : "home";

  const hideTabBar =
    pathname.includes("/post-gig") ||
    pathname.includes("/gig-details") ||
    pathname.includes("/gig-proposals") ||
    pathname.includes("/contract-details") ||
    pathname.includes("/contract-chat-thread") ||
    pathname.includes("/review-proposals") ||
    pathname.includes("/leave-review") ||
    pathname.includes("/service-search") ||
    pathname.includes("/freelancer-profile") ||
    pathname.includes("/freelancer-profile-2");

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
      {!hideTabBar && (
        <TouchableOpacity
          style={[styles.exitFab, { backgroundColor: palette.accent }]}
          onPress={() => router.replace("/(role-pager)/(founder-tabs)/community")}
          activeOpacity={0.9}
        >
          <Ionicons name="exit-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {!hideTabBar && <BottomMiniNav activeLabel={activeLabel} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  exitFab: {
    position: "absolute",
    right: 20,
    bottom: 102,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 250,
  },
});
