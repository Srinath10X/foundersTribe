import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BottomMiniNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function FreelancerFlowLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { palette } = useFlowPalette();

  const activeLabel: "home" | "ai" | "create" | "chat" | "profile" =
    pathname.includes("/contract-chat")
      ? "chat"
      : pathname.includes("/post-gig")
        ? "create"
        : pathname.includes("/ai-search") || pathname.includes("/feed")
        ? "ai"
        : pathname.includes("/freelancer-profile") || pathname.includes("/founder-profile")
          ? "profile"
          : "home";

  const hideTabBar =
    pathname.includes("/gig-details") ||
    pathname.includes("/gig-proposals") ||
    pathname.includes("/contract-details") ||
    pathname.includes("/contract-chat-thread") ||
    pathname.includes("/review-proposals") ||
    pathname.includes("/leave-review") ||
    pathname.includes("/service-search") ||
    pathname.includes("/freelancer-profile") ||
    pathname.includes("/freelancer-profile-2") ||
    pathname.includes("/my-gigs") ||
    pathname.includes("/post-detail");

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
          <Text style={styles.exitFabText}>Exit</Text>
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
    bottom: 108,
    minWidth: 82,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 250,
  },
  exitFabText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 16,
  },
});
