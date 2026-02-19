import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";


import TribesTab from "../../components/community/TribesTab";
import FindCofounderTab from "../../components/community/FindCofounderTab";
import FindFreelancerTab from "../../components/community/FindFreelancerTab";
import VoiceChannelsTab from "../../components/community/VoiceChannelsTab";
import CreateTribeModal from "../../components/CreateTribeModal";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import * as tribeApi from "../../lib/tribeApi";
import { Typography, Spacing, Layout } from "../../constants/DesignSystem";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;

/* ── Sub-tab config ─────────────────────────────────────────── */

type SubTab = "tribes" | "find-cofounder" | "find-freelancer";
type ActiveView = SubTab | "voice-channels";

const SUB_TABS: {
  key: SubTab;
  label: string;
  icon: string;
  iconFocused: string;
}[] = [
  {
    key: "tribes",
    label: "Tribes",
    icon: "shield-outline",
    iconFocused: "shield",
  },
  {
    key: "find-cofounder",
    label: "Co-Founder",
    icon: "people-outline",
    iconFocused: "people",
  },
  {
    key: "find-freelancer",
    label: "Freelancer",
    icon: "briefcase-outline",
    iconFocused: "briefcase",
  },
];

/* ================================================================ */
/*  Community Screen                                                 */
/* ================================================================ */

export default function CommunityScreen() {
  const { theme, isDark } = useTheme();
  const { session } = useAuth();
  const authToken = session?.access_token || "";

  const [activeView, setActiveView] = useState<ActiveView>("tribes");
  const [showCreateTribe, setShowCreateTribe] = useState(false);

  /* ── Header action handlers ──────────────────────────────── */

  const handleCreateTribe = async (
    name: string,
    description: string,
    isPublic: boolean,
  ) => {
    await tribeApi.createTribe(authToken, {
      name,
      description: description || undefined,
      is_public: isPublic,
    });
    setShowCreateTribe(false);
  };

  /* ── Sub-tab content ─────────────────────────────────────── */

  const renderContent = () => {
    switch (activeView) {
      case "tribes":
        return <TribesTab />;
      case "find-cofounder":
        return <FindCofounderTab />;
      case "find-freelancer":
        return <FindFreelancerTab />;
      case "voice-channels":
        return <VoiceChannelsTab />;
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Image
          source={
            isDark
              ? require("@/assets/images/logo-dark.png")
              : require("@/assets/images/logo-light.png")
          }
          style={styles.brandLogo}
          contentFit="contain"
        />

        {/* Header action buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.headerActions}
        >
          {/* Create a Tribe */}
          <TouchableOpacity
            style={[
              styles.headerBtn,
              { backgroundColor: theme.brand.primary },
            ]}
            onPress={() => setShowCreateTribe(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.text.inverse} />
            <Text style={[styles.headerBtnText, { color: theme.text.inverse }]}>
              Create a Tribe
            </Text>
          </TouchableOpacity>

          {/* Channels */}
          <TouchableOpacity
            style={[
              styles.headerBtn,
              activeView === "voice-channels"
                ? { backgroundColor: theme.brand.primary }
                : {
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
            ]}
            onPress={() => setActiveView("voice-channels")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeView === "voice-channels" ? "mic" : "mic-outline"}
              size={16}
              color={activeView === "voice-channels" ? theme.text.inverse : theme.brand.primary}
            />
            <Text
              style={[
                styles.headerBtnText,
                {
                  color: activeView === "voice-channels"
                    ? theme.text.inverse
                    : theme.text.primary,
                },
              ]}
            >
              Channels
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Content ────────────────────────────────────────── */}
      {renderContent()}

      {/* ── Sub-tabs just above bottom tab bar ─────────────── */}
      <View style={styles.subTabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabRow}
        >
          {SUB_TABS.map((tab) => {
            const isActive = activeView === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.subTab,
                  {
                    backgroundColor: isActive
                      ? theme.brand.primary
                      : theme.surface,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setActiveView(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={(isActive ? tab.iconFocused : tab.icon) as any}
                  size={15}
                  color={isActive ? theme.text.inverse : theme.text.secondary}
                />
                <Text
                  style={[
                    styles.subTabText,
                    {
                      color: isActive
                        ? theme.text.inverse
                        : theme.text.secondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Modals ─────────────────────────────────────────── */}
      <CreateTribeModal
        visible={showCreateTribe}
        onClose={() => setShowCreateTribe(false)}
        onCreate={handleCreateTribe}
      />
    </View>
  );
}

/* ================================================================ */
/*  Styles                                                           */
/* ================================================================ */

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  brandLogo: {
    height: 24,
    width: 140,
    marginVertical: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.full,
  },
  headerBtnText: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
  },

  /* Sub-tabs above bottom tab bar */
  subTabContainer: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  subTabRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  subTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.full,
  },
  subTabText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
});
