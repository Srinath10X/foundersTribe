import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useRole, UserRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";

const TOGGLE_WIDTH = 180;
const TOGGLE_HEIGHT = 38;
const PILL_PADDING = 3;
const PILL_WIDTH = (TOGGLE_WIDTH - PILL_PADDING * 2) / 2;

export default function RoleSwitcher() {
  const { role, switchRole } = useRole();
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const progress = useSharedValue(role === "founder" ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(role === "founder" ? 0 : 1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [role]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          progress.value * (TOGGLE_WIDTH - PILL_PADDING * 2 - PILL_WIDTH),
      },
    ],
  }));

  const founderTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      ["#FFFFFF", isDark ? theme.text.secondary : theme.text.muted]
    ),
  }));

  const freelancerTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [isDark ? theme.text.secondary : theme.text.muted, "#FFFFFF"]
    ),
  }));

  const handleSwitch = (newRole: UserRole) => {
    if (newRole === role) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    switchRole(newRole);

    // Navigate to the corresponding tab group
    if (newRole === "founder") {
      router.replace("/(founder-tabs)/home");
    } else {
      router.replace("/(freelancer-tabs)/dashboard");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: theme.brand.primary },
          pillStyle,
        ]}
      />

      <Pressable
        style={styles.option}
        onPress={() => handleSwitch("founder")}
      >
        <Ionicons
          name="rocket-outline"
          size={14}
          color={role === "founder" ? "#FFFFFF" : theme.text.muted}
        />
        <Animated.Text style={[styles.label, founderTextStyle]}>
          Founder
        </Animated.Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() => handleSwitch("freelancer")}
      >
        <Ionicons
          name="code-slash-outline"
          size={14}
          color={role === "freelancer" ? "#FFFFFF" : theme.text.muted}
        />
        <Animated.Text style={[styles.label, freelancerTextStyle]}>
          Freelancer
        </Animated.Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    padding: PILL_PADDING,
    position: "relative",
  },
  pill: {
    position: "absolute",
    left: PILL_PADDING,
    width: PILL_WIDTH,
    height: TOGGLE_HEIGHT - PILL_PADDING * 2,
    borderRadius: 999,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    zIndex: 1,
    height: "100%",
  },
  label: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },
});
