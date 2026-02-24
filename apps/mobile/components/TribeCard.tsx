import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  const summary = tribe.description?.trim() || "No description yet";
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
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.borderLight }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
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
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
              {tribe.name}
            </Text>
          </View>
          <Text style={[styles.desc, { color: theme.text.tertiary }]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
      </View>

      {variant === "explore" && onJoin ? (
        <TouchableOpacity
          style={[styles.joinBtn, { backgroundColor: theme.brand.primary }]}
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
    borderBottomWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 10,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
    fontFamily: "Poppins_500Medium",
  },
  desc: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    fontFamily: "Poppins_400Regular",
    marginTop: 3,
  },
  joinBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinText: {
    color: "#fff",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.1,
    fontFamily: "Poppins_500Medium",
  },
});
