import DiscoverTab from "@/components/home/DiscoverTab";
import FeedTab from "@/components/home/FeedTab";
import ForYouTab from "@/components/home/ForYouTab";
import SubTabBar from "@/components/SubTabBar";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width: windowWidth } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 70;

type SubTab = "feed" | "discover" | "foryou";

const SUB_TABS: {
  key: SubTab;
  label: string;
  icon: string;
  iconFocused?: string;
}[] = [
    {
      key: "feed",
      label: "Feed",
      icon: "newspaper-outline",
      iconFocused: "newspaper",
    },
    {
      key: "discover",
      label: "Discover",
      icon: "compass-outline",
      iconFocused: "compass",
    },
    {
      key: "foryou",
      label: "For you",
      icon: "bs-stars",
      iconFocused: "bs-stars",
    },
  ];

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<SubTab>("feed");
  const [isSubTabVisible, setIsSubTabVisible] = useState(true);
  const subTabVisibility = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    (tab: SubTab) => {
      setActiveTab(tab);
      showSubTabsTemporarily();
    },
    [showSubTabsTemporarily]
  );

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
      case "foryou":
        return <ForYouTab />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {renderContent()}

      {/* Header Overlay — gradient fade top→bottom */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.85)", "rgba(0,0,0,0.6)", "transparent"]
              : ["transparent", "transparent", "transparent"]
          }
          style={styles.headerGradient}
        >
          <View style={styles.headerInner}>
            <Image
              source={require("@/assets/images/logo-dark.png")}
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
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Bottom Sub-Tabs */}
      <Animated.View style={[styles.bottomTabContainer, subTabVisibilityStyle]}>
        <SubTabBar
          tabs={SUB_TABS}
          activeKey={activeTab}
          isDark={isDark}
          onTabPress={handleTabPress}
        />
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
    paddingBottom: 40,
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
    bottom: TAB_BAR_HEIGHT + 2,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Math.max((windowWidth - 420) / 2, 16),
    paddingBottom: 8,
  },
});
