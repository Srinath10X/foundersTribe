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
import { Stack, useFocusEffect, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import TribesTab from "@/components/community/TribesTab";
import FindCofounderTab from "@/components/community/FindCofounderTab";
import FindFreelancerTab from "@/components/community/FindFreelancerTab";
import VoiceChannelsTab from "@/components/community/VoiceChannelsTab";
import CreateTribeModal from "@/components/CreateTribeModal";
import SubTabBar from "@/components/SubTabBar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import * as tribeApi from "@/lib/tribeApi";
import { Spacing, Layout } from "@/constants/DesignSystem";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;
const { width: windowWidth } = Dimensions.get("window");

/* ── Sub-tab config ─────────────────────────────────────────── */

type SubTab = "tribes" | "find-cofounder" | "find-freelancer";
type ActiveView = SubTab | "voice-channels";

const SUB_TABS: {
  key: SubTab;
  label: string;
  icon: string;
  iconFocused?: string;
}[] = [
  {
    key: "tribes",
    label: "Tribes",
    icon: "shield-outline",
    iconFocused: "shield",
  },
  {
    key: "find-cofounder",
    label: "founders",
    icon: "people-outline",
    iconFocused: "people",
  },
  {
    key: "find-freelancer",
    label: "Freelancers",
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
  const router = useRouter();
  const { session } = useAuth();
  const authToken = session?.access_token || "";

  const [activeView, setActiveView] = useState<ActiveView>("tribes");
  const [tribesMode, setTribesMode] = useState<"explore" | "my">("explore");
  const [showCreateTribe, setShowCreateTribe] = useState(false);
  const [isSubTabVisible, setIsSubTabVisible] = useState(true);
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
    avatarUrl?: string,
    coverUrl?: string
  ) => {
    try {
      await tribeApi.createTribe(authToken, {
        name,
        description: description || undefined,
        avatar_url: avatarUrl || undefined,
        cover_url: coverUrl || undefined,
        is_public: isPublic,
      });
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      const coverFieldIssue =
        msg.includes("cover_url") ||
        msg.includes("column") ||
        msg.includes("schema");
      if (!coverFieldIssue) throw e;
      // Compatibility fallback for environments without cover_url migrated yet.
      await tribeApi.createTribe(authToken, {
        name,
        description: description || undefined,
        avatar_url: avatarUrl || undefined,
        is_public: isPublic,
      });
    }
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
        <Text style={[styles.brandLogoText, { color: theme.text.primary }]}>
          Communities
        </Text>

        {showTribeHeaderActions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.headerActions}
          >
                        <TouchableOpacity
              style={[
                styles.headerBtn,
                activeView === "tribes" && tribesMode === "my"
                  ? { backgroundColor: theme.brand.primary }
                  : {
                      backgroundColor: theme.surface,
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
                    : theme.text.primary
                }
              />
              <Text
                style={[
                  styles.headerBtnText,
                  {
                    color:
                      activeView === "tribes" && tribesMode === "my"
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
                activeView === "tribes" && tribesMode === "explore"
                  ? { backgroundColor: theme.brand.primary }
                  : {
                      backgroundColor: theme.surface,
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
                    : theme.text.primary
                }
              />
              <Text
                style={[
                  styles.headerBtnText,
                  {
                    color:
                      activeView === "tribes" && tribesMode === "explore"
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
                activeView === "voice-channels"
                  ? { backgroundColor: theme.brand.primary }
                  : {
                      backgroundColor: theme.surface,
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
                    : theme.text.primary
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
        <SubTabBar
          tabs={SUB_TABS}
          activeKey={activeView as SubTab}
          isDark={isDark}
          onTabPress={(tab) => {
            if (tab === "find-freelancer") {
              router.push("/freelancer-stack");
              return;
            }
            setActiveView(tab);
            showSubTabsTemporarily();
          }}
        />
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
  brandLogoText: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
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
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  headerBtnText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
    fontFamily: "Poppins_600SemiBold",
  },

  /* Sub-tabs above bottom tab bar */
  subTabContainer: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT + 2,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Math.max((windowWidth - 420) / 2, 16),
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
