import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Typography, Spacing, Layout } from "../constants/DesignSystem";

interface TribeCardProps {
  tribe: {
    id: string;
    name: string;
    description?: string;
    member_count?: number;
    avatar_url?: string;
    is_public?: boolean;
  };
  onPress: () => void;
  variant?: "default" | "explore";
  onJoin?: () => void;
}

export default function TribeCard({
  tribe,
  onPress,
  variant = "default",
  onJoin,
}: TribeCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        {/* Avatar / Icon */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.brand.primary + "15" },
          ]}
        >
          {tribe.avatar_url ? (
            <Image
              source={{ uri: tribe.avatar_url }}
              style={styles.avatarImg}
            />
          ) : (
            <Ionicons
              name="shield-half-outline"
              size={22}
              color={theme.brand.primary}
            />
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            {tribe.name}
          </Text>
          {tribe.description ? (
            <Text
              style={[styles.desc, { color: theme.text.tertiary }]}
              numberOfLines={1}
            >
              {tribe.description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons
              name="people-outline"
              size={13}
              color={theme.text.tertiary}
            />
            <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
              {tribe.member_count ?? 0} members
            </Text>
            {tribe.is_public === false && (
              <>
                <Ionicons
                  name="lock-closed-outline"
                  size={11}
                  color={theme.text.muted}
                  style={{ marginLeft: 6 }}
                />
                <Text style={[styles.metaText, { color: theme.text.muted }]}>
                  Private
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Action */}
      {variant === "explore" && onJoin ? (
        <TouchableOpacity
          style={[styles.joinBtn, { backgroundColor: theme.brand.primary }]}
          onPress={(e: any) => {
            e.stopPropagation?.();
            onJoin();
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.joinText, { color: theme.text.inverse }]}>
            Join
          </Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Layout.radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
    overflow: "hidden",
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.md,
  },
  info: { flex: 1 },
  name: {
    ...Typography.presets.h3,
    fontSize: Typography.sizes.md,
    marginBottom: 2,
  },
  desc: {
    ...Typography.presets.bodySmall,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { ...Typography.presets.caption },
  joinBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.sm,
  },
  joinText: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
  },
});
