import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useTheme } from "@/context/ThemeContext";
import type { PeopleUser } from "@/hooks/useInfiniteUsers";

const S = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xxl: 32,
} as const;

export const PEOPLE_CARD_WIDTH = S.xxl * 4 + S.sm;
export const PEOPLE_CARD_HEIGHT = S.xxl * 5;

function PeopleCardBase({ profile }: { profile: PeopleUser }) {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const initials = useMemo(() => {
    const name = profile.display_name?.trim() || profile.username?.trim() || "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile.display_name, profile.username]);

  const handleImgError = useCallback(() => setImgError(true), []);

  const showImage = !!profile.avatar_url && !imgError;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/freelancer-stack/public-profile" as any,
          params: { id: profile.id },
        })
      }
      style={({ pressed, hovered }) => [
        styles.card,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#fff",
          borderColor: hovered ? theme.brand.primary : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.topSection}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: isDark ? "rgba(255,59,48,0.12)" : "rgba(255,59,48,0.08)" },
            ]}
          >
            {showImage ? (
              <Image
                source={{ uri: profile.avatar_url! }}
                style={styles.avatarImg}
                contentFit="cover"
                onError={handleImgError}
              />
            ) : (
              <Text style={[styles.initials, { color: theme.brand.primary }]}>{initials}</Text>
            )}
          </View>
          <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={2} ellipsizeMode="tail">
            {profile.display_name || profile.username || "User"}
          </Text>
          {profile.username ? (
            <Text
              style={[styles.username, { color: theme.text.muted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              @{profile.username}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const PeopleCard = memo(PeopleCardBase);

const styles = StyleSheet.create({
  card: {
    width: PEOPLE_CARD_WIDTH,
    height: PEOPLE_CARD_HEIGHT,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: S.sm,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  content: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: S.xs,
  },
  topSection: {
    width: "100%",
    alignItems: "center",
    gap: S.xs,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 60, height: 60 },
  initials: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  name: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.1,
    textAlign: "center",
    lineHeight: 18,
  },
  username: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
});
