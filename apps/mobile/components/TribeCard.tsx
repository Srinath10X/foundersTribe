import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Spacing } from "../constants/DesignSystem";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

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
  const members = tribe.member_count ?? 0;
  const summary = tribe.description?.trim() || `${members} members`;
  const [avatarSrc, setAvatarSrc] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    const resolveAvatar = async () => {
      const raw = (tribe.avatar_url || "").trim();
      if (!raw) {
        if (mounted) setAvatarSrc("");
        return;
      }
      if (/^https?:\/\//i.test(raw)) {
        if (mounted) setAvatarSrc(raw);
        return;
      }
      const { data, error } = await supabase.storage
        .from("tribe-media")
        .createSignedUrl(raw, 60 * 60 * 24 * 30);
      if (mounted) {
        setAvatarSrc(!error && data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : "");
      }
    };
    resolveAvatar();
    return () => {
      mounted = false;
    };
  }, [tribe.avatar_url]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <View style={[styles.avatarWrap, { borderColor: theme.borderLight }]}>
          <Image
            source={{
              uri: avatarSrc || `https://picsum.photos/seed/${encodeURIComponent(tribe.id)}/240/240`,
            }}
            style={styles.avatar}
          />
        </View>

        <View style={styles.meta}>
          <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
            {tribe.name}
          </Text>
          <View style={styles.metaLine}>
            <Text style={[styles.members, { color: theme.text.tertiary }]}>
              {members} members
            </Text>
          </View>
          {!!tribe.description && (
            <Text style={[styles.desc, { color: theme.text.tertiary }]} numberOfLines={1}>
              {summary}
            </Text>
          )}
        </View>
      </View>

      {variant === "explore" && onJoin ? (
        <TouchableOpacity
          style={[
            styles.joinBtn,
            { backgroundColor: theme.brand.primary, shadowColor: theme.brand.primary },
          ]}
          onPress={(e: any) => {
            e.stopPropagation?.();
            onJoin();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.joinText}>Join</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.sm,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: "hidden",
    marginRight: Spacing.sm,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    fontFamily: "Poppins_500Medium",
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  members: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
  },
  desc: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  joinBtn: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 9,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  joinText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.1,
    fontFamily: "Poppins_600SemiBold",
  },
});
