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

const getDemoAvatarUri = (id: string, name: string) => {
  const seed = encodeURIComponent(`${id}-${name || "tribe"}`);
  return `https://api.dicebear.com/7.x/initials/png?seed=${seed}&backgroundType=gradientLinear`;
};

export default function TribeCard({
  tribe,
  onPress,
  variant = "default",
  onJoin,
}: TribeCardProps) {
  const { theme, isDark } = useTheme();

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
            { backgroundColor: "#EAEAEA" },
          ]}
        >
          <Image
            source={{ uri: tribe.avatar_url || `https://picsum.photos/seed/${tribe.id}/200/200` }}
            style={styles.avatarImg}
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            {tribe.name}
          </Text>
          <Text
            style={[styles.desc, { color: theme.text.tertiary }]}
            numberOfLines={1}
          >
            {tribe.description || `${tribe.member_count ?? 0} members`}
          </Text>
        </View>
      </View>

      {/* Action / Meta */}
      <View style={styles.actionContainer}>
        {tribe.member_count !== undefined && tribe.member_count > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
            <Text style={styles.badgeText}>{tribe.member_count}</Text>
          </View>
        )}

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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24, // Perfect circle
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 24, // Perfect circle
  },
  info: {
    flex: 1,
    justifyContent: "center"
  },
  name: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  actionContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  joinBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 16, // More roundy
  },
  joinText: {
    ...Typography.presets.bodySmall,
    fontWeight: "600",
  },
});
