import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BottomTalentNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

export default function TalentStackLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { palette } = useFlowPalette();

  const activeLabel: "dashboard" | "gigs" | "contracts" | "messages" | "profile" =
    pathname.includes("/browse-gigs") || pathname.includes("/gig-details") || pathname.includes("/send-proposal")
      ? "gigs"
      : pathname.includes("/contracts") || pathname.includes("/contract-details")
        ? "contracts"
        : pathname.includes("/messages") || pathname.includes("/chat-thread")
          ? "messages"
          : pathname.includes("/profile")
            ? "profile"
            : "dashboard";

  const hideTabBar =
    pathname.includes("/gig-details") ||
    pathname.includes("/send-proposal") ||
    pathname.includes("/contract-details") ||
    pathname.includes("/chat-thread") ||
    pathname.includes("/leave-review");

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
      {!hideTabBar && (
        <TouchableOpacity
          style={[styles.exitFab, { backgroundColor: palette.accent }]}
          onPress={() => router.replace("/(role-pager)/(freelancer-tabs)/dashboard")}
          activeOpacity={0.9}
        >
          <Ionicons name="exit-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {!hideTabBar && <BottomTalentNav activeLabel={activeLabel} />}
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
