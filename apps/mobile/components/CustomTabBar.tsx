import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Layout constants ──────────────────────────────────────────
const BAR_HEIGHT = 60;
const BAR_BOTTOM = Platform.OS === "ios" ? 24 : 16;
const BAR_MX = 16;

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
  const { theme } = useTheme();
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
      ? theme.brand.primary
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
        {options.tabBarIcon?.({
          focused: isFocused,
          color: tintColor,
          size: 21,
        })}
        <Text
          numberOfLines={1}
          style={[barStyles.tabLabel, { color: tintColor }]}
        >
          {label}
        </Text>
      </Pressable>
    );
  });

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        barStyles.wrapper,
        {
          backgroundColor: theme.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 8,
        },
      ]}
    >
      {isFounder ? (
        <>
          {/* Founder: tabs first, then divider, then switch pill */}
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
          {/* Freelancer: switch pill first, then divider, then tabs */}
          <View style={barStyles.switchSection}>
            <ModeSwitchPill />
          </View>
          <View
            style={[barStyles.divider, { backgroundColor: theme.border }]}
          />
          <View style={barStyles.tabsSection}>{tabItems}</View>
        </>
      )}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    overflow: "hidden",
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
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
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
