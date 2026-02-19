import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useFocusEffect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";


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
const { width: windowWidth } = Dimensions.get("window");

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
  const navigation = useNavigation();
  const { session } = useAuth();
  const authToken = session?.access_token || "";

  const [activeView, setActiveView] = useState<ActiveView>("tribes");
  const [tribesMode, setTribesMode] = useState<"explore" | "my">("explore");
  const [showCreateTribe, setShowCreateTribe] = useState(false);
  const [isSubTabVisible, setIsSubTabVisible] = useState(true);
  const tabWidth = (windowWidth - 48) / 3;
  const indicatorX = useSharedValue(0);
  const subTabVisibility = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTribeHeaderActions =
    activeView === "tribes" || activeView === "voice-channels";

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const showSubTabsTemporarily = useCallback(() => {
    clearHideTimer();
    setIsSubTabVisible(true);
    subTabVisibility.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
    hideTimer.current = setTimeout(() => {
      setIsSubTabVisible(false);
      subTabVisibility.value = withTiming(0, {
        duration: 320,
        easing: Easing.inOut(Easing.quad),
      });
    }, 2000);
  }, [clearHideTimer, subTabVisibility]);

  useFocusEffect(
    useCallback(() => {
      showSubTabsTemporarily();
      return () => clearHideTimer();
    }, [clearHideTimer, showSubTabsTemporarily])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      showSubTabsTemporarily();
    });
    return unsubscribe;
  }, [navigation, showSubTabsTemporarily]);

  const getSubTabIndex = useCallback((view: ActiveView) => {
    return SUB_TABS.findIndex((t) => t.key === view);
  }, []);

  useEffect(() => {
    const index = getSubTabIndex(activeView);
    if (index >= 0) {
      indicatorX.value = withSpring(index * tabWidth, {
        damping: 20,
        stiffness: 180,
      });
    }
  }, [activeView, getSubTabIndex, indicatorX, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const subTabVisibilityStyle = useAnimatedStyle(() => ({
    opacity: subTabVisibility.value,
    transform: [{ translateY: (1 - subTabVisibility.value) * 56 }],
  }));

  const floatingFabStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - subTabVisibility.value) * 56 }],
  }));

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
        return <TribesTab mode={tribesMode} showSegmentedControl={false} />;
      case "find-cofounder":
        return <FindCofounderTab />;
      case "find-freelancer":
        return <FindFreelancerTab />;
      case "voice-channels":
        return <VoiceChannelsTab subTabVisible={isSubTabVisible} />;
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

        {showTribeHeaderActions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.headerActions}
          >
            <TouchableOpacity
              style={[
                styles.headerBtn,
                activeView === "tribes" && tribesMode === "explore"
                  ? { backgroundColor: theme.brand.primary }
                  : {
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
              ]}
              onPress={() => {
                setTribesMode("explore");
                setActiveView("tribes");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  activeView === "tribes" && tribesMode === "explore"
                    ? "compass"
                    : "compass-outline"
                }
                size={16}
                color={
                  activeView === "tribes" && tribesMode === "explore"
                    ? theme.text.inverse
                    : theme.brand.primary
                }
              />
              <Text
                style={[
                  styles.headerBtnText,
                  {
                    color: activeView === "tribes" && tribesMode === "explore"
                      ? theme.text.inverse
                      : theme.text.primary,
                  },
                ]}
              >
                Explore
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerBtn,
                activeView === "tribes" && tribesMode === "my"
                  ? { backgroundColor: theme.brand.primary }
                  : {
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
              ]}
              onPress={() => {
                setTribesMode("my");
                setActiveView("tribes");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  activeView === "tribes" && tribesMode === "my"
                    ? "people"
                    : "people-outline"
                }
                size={16}
                color={
                  activeView === "tribes" && tribesMode === "my"
                    ? theme.text.inverse
                    : theme.brand.primary
                }
              />
              <Text
                style={[
                  styles.headerBtnText,
                  {
                    color: activeView === "tribes" && tribesMode === "my"
                      ? theme.text.inverse
                      : theme.text.primary,
                  },
                ]}
              >
                My Tribes
              </Text>
            </TouchableOpacity>

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
                color={
                  activeView === "voice-channels"
                    ? theme.text.inverse
                    : theme.brand.primary
                }
              />
              <Text
                style={[
                  styles.headerBtnText,
                  {
                    color:
                      activeView === "voice-channels"
                        ? theme.text.inverse
                        : theme.text.primary,
                  },
                ]}
              >
                Channels
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── Content ────────────────────────────────────────── */}
      {renderContent()}

      {/* ── Sub-tabs just above bottom tab bar ─────────────── */}
      <Animated.View style={[styles.subTabContainer, subTabVisibilityStyle]}>
        <BlurView
          intensity={Platform.OS === "ios" ? 90 : 120}
          tint={isDark ? "dark" : "light"}
          style={styles.bottomBlur}
        >
          <View
            style={[
              styles.glassTabBar,
              {
                backgroundColor: isDark
                  ? "rgba(0,0,0,0.45)"
                  : "rgba(255,255,255,0.65)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <Animated.View
              style={[
                styles.activeIndicator,
                {
                  width: tabWidth,
                  opacity: getSubTabIndex(activeView) >= 0 ? 1 : 0,
                  backgroundColor: isDark
                    ? "rgba(255,0,0,0.12)"
                    : "rgba(255,0,0,0.08)",
                },
                indicatorStyle,
              ]}
            />

            {SUB_TABS.map((tab) => {
              const isActive = activeView === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, { width: tabWidth }]}
                  onPress={() => {
                    setActiveView(tab.key);
                    showSubTabsTemporarily();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={(isActive ? tab.iconFocused : tab.icon) as any}
                    size={18}
                    color={
                      isActive
                        ? "#FF0000"
                        : isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.4)"
                    }
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isActive
                          ? "#FF0000"
                          : isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.4)",
                        fontWeight: isActive ? "700" : "500",
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </Animated.View>

      {activeView === "tribes" && (
        <Animated.View style={[styles.createFab, floatingFabStyle]}>
          <TouchableOpacity
            style={[
              styles.createFabButton,
              { backgroundColor: theme.brand.primary },
              Layout.shadows.lg,
            ]}
            onPress={() => setShowCreateTribe(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={theme.text.inverse} />
          </TouchableOpacity>
        </Animated.View>
      )}

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
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  bottomBlur: {
    borderRadius: Layout.radius.xl,
    overflow: "hidden",
  },
  glassTabBar: {
    flexDirection: "row",
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    paddingVertical: 6,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: Layout.radius.lg,
  },
  tabButton: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    gap: 4,
  },
  tabLabel: {
    ...Typography.presets.caption,
    fontFamily: "Poppins_600SemiBold",
  },
  createFab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: TAB_BAR_HEIGHT + 96,
    zIndex: 120,
  },
  createFabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
