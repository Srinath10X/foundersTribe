import DiscoverTab from "@/components/home/DiscoverTab";
import FeedTab from "@/components/home/FeedTab";
import LibraryTab from "@/components/home/LibraryTab";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: windowWidth } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;

type SubTab = "feed" | "discover" | "library";

const SUB_TABS: {
  key: SubTab;
  label: string;
  icon: string;
  iconFocused: string;
}[] = [
  { key: "feed", label: "Feed", icon: "newspaper-outline", iconFocused: "newspaper" },
  { key: "discover", label: "Discover", icon: "compass-outline", iconFocused: "compass" },
  { key: "library", label: "Library", icon: "bookmarks-outline", iconFocused: "bookmarks" },
];

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<SubTab>("feed");
  const [isSubTabVisible, setIsSubTabVisible] = useState(true);
  const indicatorX = useSharedValue(0);
  const subTabVisibility = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabWidth = (windowWidth - 48) / 3;

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

  const handleTabPress = useCallback(
    (tab: SubTab, index: number) => {
      setActiveTab(tab);
      indicatorX.value = withSpring(index * tabWidth, {
        damping: 20,
        stiffness: 180,
      });
      showSubTabsTemporarily();
    },
    [showSubTabsTemporarily, tabWidth]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const subTabVisibilityStyle = useAnimatedStyle(() => ({
    opacity: subTabVisibility.value,
    transform: [{ translateY: (1 - subTabVisibility.value) * 56 }],
  }));

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <FeedTab isSubTabVisible={isSubTabVisible} />;
      case "discover":
        return <DiscoverTab />;
      case "library":
        return <LibraryTab />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {renderContent()}

      {/* Header Overlay — gradient fade top→bottom */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.85)", "rgba(0,0,0,0.6)", "transparent"]
              : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.6)", "transparent"]
          }
          style={styles.headerGradient}
        >
          <View style={styles.headerInner}>
            <Image
              source={
                isDark
                  ? require("@/assets/images/logo-dark.png")
                  : require("@/assets/images/logo-light.png")
              }
              style={styles.brandLogo}
              contentFit="contain"
            />
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Bottom Glassmorphism Sub-Tabs */}
      <Animated.View style={[styles.bottomTabContainer, subTabVisibilityStyle]}>
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
            {/* Animated active indicator */}
            <Animated.View
              style={[
                styles.activeIndicator,
                {
                  width: tabWidth,
                  backgroundColor: isDark
                    ? "rgba(255,0,0,0.12)"
                    : "rgba(255,0,0,0.08)",
                },
                indicatorStyle,
              ]}
            />

            {SUB_TABS.map((tab, index) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, { width: tabWidth }]}
                  onPress={() => handleTabPress(tab.key, index)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 36,
    paddingBottom: 4,
  },
  brandLogo: {
    height: 24,
    width: 140,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom Sub-Tabs
  bottomTabContainer: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bottomBlur: {
    borderRadius: 16,
    overflow: "hidden",
  },
  glassTabBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 16,
    borderWidth: 0.5,
    paddingHorizontal: 4,
  },
  activeIndicator: {
    position: "absolute",
    height: 40,
    borderRadius: 12,
    left: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: -0.2,
    fontFamily: "Poppins_600SemiBold",
  },
});
