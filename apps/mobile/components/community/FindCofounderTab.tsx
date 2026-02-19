import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useTheme } from "../../context/ThemeContext";
import { Typography, Spacing } from "../../constants/DesignSystem";

export default function FindCofounderTab() {
  const { theme } = useTheme();
  const demoProfiles = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&q=80",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80",
  ];

  return (
    <View style={styles.container}>
      <View style={styles.avatarStack}>
        {demoProfiles.map((uri, index) => (
          <Image
            key={uri}
            source={{ uri }}
            style={[
              styles.avatar,
              {
                left: index * 24,
                borderColor: theme.background,
              },
            ]}
            contentFit="cover"
          />
        ))}
      </View>
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
  avatarStack: {
    width: 128,
    height: 44,
    marginBottom: Spacing.md,
    position: "relative",
  },
  avatar: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
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
