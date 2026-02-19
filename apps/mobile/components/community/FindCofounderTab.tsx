import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../context/ThemeContext";
import { Typography, Spacing } from "../../constants/DesignSystem";

export default function FindCofounderTab() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.brand.primary + "15" },
        ]}
      >
        <Ionicons name="people-outline" size={48} color={theme.brand.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text.primary }]}>
        Find a Co-Founder
      </Text>
      <Text style={[styles.subtitle, { color: theme.text.tertiary }]}>
        Match with like-minded founders based on skills, stage, and vision.
        Swipe, connect, and build together.
      </Text>
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.brand.primary + "15" },
        ]}
      >
        <Text style={[styles.badgeText, { color: theme.brand.primary }]}>
          Coming Soon
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.presets.h2,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.presets.body,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  badgeText: {
    ...Typography.presets.bodySmall,
    fontWeight: "700",
  },
});
