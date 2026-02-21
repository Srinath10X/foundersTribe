import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useTheme } from "../../context/ThemeContext";
import { Typography, Spacing } from "../../constants/DesignSystem";

export default function FindFreelancerTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const demoProfiles = [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&q=80",
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&q=80",
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=200&q=80",
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
          { backgroundColor: theme.info + "15" },
        ]}
      >
        <Ionicons name="briefcase-outline" size={48} color={theme.info} />
      </View>
      <Text style={[styles.title, { color: theme.text.primary }]}>
        Find a Freelancer
      </Text>
      <Text style={[styles.subtitle, { color: theme.text.tertiary }]}>
        Discover talented freelancers ready to help bring your startup vision to
        life. Post projects and find the perfect match.
      </Text>
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.info + "15" },
        ]}
      >
        <Text style={[styles.badgeText, { color: theme.info }]}>
          Freelancer Workspace
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.cta, { backgroundColor: theme.brand.primary }]}
        activeOpacity={0.85}
        onPress={() => router.push("/freelancer-stack" as never)}
      >
        <Text style={[styles.ctaText, { color: theme.text.inverse }]}>Open Founder Flow</Text>
      </TouchableOpacity>
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
  cta: {
    marginTop: Spacing.md,
    borderRadius: 12,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  ctaText: {
    ...Typography.presets.body,
    fontWeight: "700",
  },
});
