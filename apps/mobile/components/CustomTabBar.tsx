import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Layout constants ──────────────────────────────────────────
export const BAR_HEIGHT = 68;
export const BAR_BOTTOM = Platform.OS === "ios" ? 28 : 20;
export const BAR_MX = 16;

// ─── The "switch to other role" pill button ────────────────────
function ModeSwitchPill() {
  const { role, switchRole } = useRole();
  const { theme } = useTheme();
  const router = useRouter();

  // The pill always shows the OPPOSITE role
  const targetRole = role === "founder" ? "freelancer" : "founder";
  const targetLabel = targetRole === "founder" ? "Founder" : "Freelancer";
  const targetIcon: keyof typeof Ionicons.glyphMap =
    targetRole === "founder" ? "rocket-outline" : "code-slash-outline";

  const handleSwitch = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    switchRole(targetRole);
    if (targetRole === "founder") {
      router.replace("/(founder-tabs)/home");
    } else {
      router.replace("/(freelancer-tabs)/dashboard");
    }
  };

  return (
    <Pressable
      onPress={handleSwitch}
      style={({ pressed }) => [
        pillStyles.pill,
        {
          backgroundColor: theme.brand.primary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${targetLabel} mode`}
    >
      <Ionicons name={targetIcon} size={15} color="#FFFFFF" />
      <Text style={pillStyles.label}>{targetLabel}</Text>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

// ─── Custom Tab Bar ────────────────────────────────────────────
export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const { role } = useRole();

  // Filter out hidden routes (expo-router sets href to null for hidden screens)
  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key].options as any;
    if (opts.href === null) return false;
    if (opts.tabBarItemStyle?.display === "none") return false;
    return true;
  });

  // In Founder mode → tabs on left, switch pill on right
  // In Freelancer mode → switch pill on left, tabs on right
  const isFounder = role === "founder";

  const tabItems = visibleRoutes.map((route) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === state.routes.indexOf(route);
    const tintColor = isFocused
      ? "#FF3B30"
      : theme.text.secondary ?? theme.text.muted;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    const label =
      typeof options.tabBarLabel === "string"
        ? options.tabBarLabel
        : typeof options.title === "string"
        ? options.title
        : route.name;

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={onLongPress}
        style={barStyles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        android_ripple={{ color: "transparent" }}
      >
        <View style={barStyles.iconWrap}>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: tintColor,
            size: 22,
          })}
        </View>
        <Text
          numberOfLines={1}
          style={[barStyles.tabLabel, { color: tintColor }]}
        >
          {label}
        </Text>
      </Pressable>
    );
  });

  const content = isFounder ? (
    <>
      <View style={barStyles.tabsSection}>{tabItems}</View>
      <View
        style={[barStyles.divider, { backgroundColor: theme.border }]}
      />
      <View style={barStyles.switchSection}>
        <ModeSwitchPill />
      </View>
    </>
  ) : (
    <>
      <View style={barStyles.switchSection}>
        <ModeSwitchPill />
      </View>
      <View
        style={[barStyles.divider, { backgroundColor: theme.border }]}
      />
      <View style={barStyles.tabsSection}>{tabItems}</View>
    </>
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        barStyles.wrapper,
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        },
      ]}
    >
      {/* Top divider for premium depth */}
      <View style={barStyles.topDivider} />
      {/* Glass surface — BlurView fills the pill shape */}
      <BlurView
        intensity={Platform.OS === "ios" ? 100 : 140}
        tint={isDark ? "dark" : "light"}
        style={[
          barStyles.blurFill,
          { backgroundColor: isDark
              ? "rgba(28, 28, 28, 0.72)"
              : "rgba(255, 255, 255, 0.75)" },
        ]}
      />
      {/* Content layer sits on top of the blur */}
      <View style={barStyles.contentLayer}>
        {content}
      </View>
    </Animated.View>
  );
}

const barStyles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: BAR_BOTTOM,
    left: BAR_MX,
    right: BAR_MX,
    height: BAR_HEIGHT,
    borderRadius: 999,
    overflow: "hidden",
  },
  topDivider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 100,
  },
  blurFill: {
    // Fills the entire pill shape behind the content
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  contentLayer: {
    // Sits on top of blur, holds the actual tabs + switch
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabsSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingTop: 0,
    // Nudge the whole content block up by 1px to compensate for
    // icon font bottom-heaviness + label descender space
    marginTop: -1,
  },
  iconWrap: {
    // Fixed-size box around the icon so its intrinsic padding
    // doesn't affect vertical centering
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 1,
    // Kill any extra line-height that Poppins adds
    lineHeight: 13,
    includeFontPadding: false, // Android: remove extra top/bottom padding
  },
  divider: {
    width: 1,
    height: 30,
    borderRadius: 1,
    marginHorizontal: 2,
    opacity: 0.3,
  },
  switchSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
});
