/**
 * FounderCard – Redesigned card matching the dark, edge-to-edge reference.
 * - Photo/gradient area is edge-to-edge (no padding)
 * - Full initials (e.g. "PK") shown on gradient placeholder
 * - Role pill with link icon
 * - Pass & Connect action buttons at the bottom
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import type { FounderCandidate } from "@/types/founders";
import { useTheme } from "@/context/ThemeContext";

function fmt(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function toTitle(v: string | null | undefined): string | null {
  const s = fmt(v);
  if (!s) return null;
  return s.split(/[_\s-]+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function normalizeAvatarUri(uri: string | null | undefined): string | null {
  const raw = fmt(uri);
  if (!raw) return null;

  // Request larger variants from common avatar CDNs when available.
  if (/images\.unsplash\.com/i.test(raw)) {
    const withW = /([?&])w=\d+/i.test(raw)
      ? raw.replace(/([?&])w=\d+/i, "$1w=1400")
      : `${raw}${raw.includes("?") ? "&" : "?"}w=1400`;
    return /([?&])q=\d+/i.test(withW)
      ? withW.replace(/([?&])q=\d+/i, "$1q=100")
      : `${withW}&q=100`;
  }

  if (/images\.pexels\.com/i.test(raw)) {
    return /([?&])w=\d+/i.test(raw)
      ? raw.replace(/([?&])w=\d+/i, "$1w=1400")
      : `${raw}${raw.includes("?") ? "&" : "?"}w=1400`;
  }

  if (/googleusercontent\.com|ggpht\.com/i.test(raw)) {
    return raw
      .replace(/=s\d+-c/i, "=s1400-c")
      .replace(/=s\d+$/i, "=s1400");
  }

  return raw;
}

/** Extract initials from a display name (e.g. "Priya Kumar" → "PK") */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface FounderCardProps {
  candidate: FounderCandidate;
  cardHeight: number;
  cardWidth?: number;
  onViewProfile?: (candidate: FounderCandidate) => void;
  onConnect?: (candidate: FounderCandidate) => void;
  onMessage?: (candidate: FounderCandidate) => void;
  onPass?: (candidate: FounderCandidate) => void;
}

function FounderCardInner({
  candidate,
  cardHeight,
  cardWidth,
  onViewProfile,
  onConnect,
  onPass,
}: FounderCardProps) {
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const resolvedCardWidth = cardWidth ?? windowWidth - 24;
  const imageUri = normalizeAvatarUri(candidate.photo_url || candidate.avatar_url);
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);
  const initials = getInitials(candidate.display_name);
  const name = candidate.display_name || "Founder";
  const locationLine = fmt(candidate.location) || fmt(candidate.country);
  const roleLabel = toTitle(candidate.role) || toTitle(candidate.user_type) || "Founder";
  const bio = fmt(candidate.bio) || fmt(candidate.looking_for);

  const isCompactHeight = cardHeight < 560;
  const isTinyHeight = cardHeight < 500;
  const isCompactWidth = resolvedCardWidth < 360;

  const imageRatio = isTinyHeight ? 0.5 : isCompactHeight ? 0.53 : 0.56;
  const imageHeight = Math.round(cardHeight * imageRatio);
  const infoPaddingHorizontal = isCompactWidth ? 16 : 20;
  const infoPaddingTop = isTinyHeight ? 12 : 16;
  const infoPaddingBottom = isTinyHeight ? 12 : 20;
  const roleTextSize = isTinyHeight ? 11 : 12;
  const rolePillPaddingHorizontal = isCompactWidth ? 10 : 12;
  const rolePillPaddingVertical = isTinyHeight ? 5 : 6;
  const nameSize = isTinyHeight ? 22 : 24;
  const nameLineHeight = isTinyHeight ? 28 : 32;
  const locationSize = isTinyHeight ? 12 : 13;
  const bioSize = isTinyHeight ? 13 : 14;
  const bioLineHeight = isTinyHeight ? 19 : 21;
  const bioLines = isTinyHeight ? 1 : 2;
  const actionsPaddingHorizontal = isCompactWidth ? 12 : 16;
  const actionsPaddingTop = isTinyHeight ? 10 : 14;
  const actionsPaddingBottom = isTinyHeight ? 12 : 16;
  const actionsGap = isCompactWidth ? 10 : 12;
  const actionButtonVerticalPadding = isTinyHeight ? 12 : 14;
  const actionTextSize = isTinyHeight ? 14 : 15;
  const actionIconSize = isTinyHeight ? 17 : 18;
  const connectButtonFlex = isCompactWidth ? 1.2 : 1.3;

  React.useEffect(() => {
    setImageLoadFailed(false);
  }, [candidate.id, imageUri]);

  return (
    <View
      style={[
        styles.card,
        {
          width: resolvedCardWidth,
          height: cardHeight,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onViewProfile ? () => onViewProfile(candidate) : undefined}
        disabled={!onViewProfile}
        style={styles.profileTapArea}
      >
        {/* ── PHOTO / GRADIENT (edge-to-edge) ── */}
        <View
          style={[
            styles.photoArea,
            { height: imageHeight, backgroundColor: isDark ? "#0A2914" : "#DDE3EA" },
          ]}
        >
          {imageUri && !imageLoadFailed ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              fadeDuration={0}
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <LinearGradient
              colors={
                isDark
                  ? ["#0F3D1E", "#0A2914", "#071D0E"]
                  : ["#E9EDF2", "#DDE3EA", "#CDD6E0"]
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            >
              <View style={styles.initialsCenter}>
                <Text
                  style={[
                    styles.initialsText,
                    { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)" },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* ── INFO SECTION ── */}
        <View
          style={[
            styles.info,
            {
              backgroundColor: theme.surface,
              paddingHorizontal: infoPaddingHorizontal,
              paddingTop: infoPaddingTop,
              paddingBottom: infoPaddingBottom,
            },
          ]}
        >
          {/* Role pill */}
          <View
            style={[
              styles.rolePill,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
                paddingHorizontal: rolePillPaddingHorizontal,
                paddingVertical: rolePillPaddingVertical,
              },
            ]}
          >
            <Ionicons
              name="link"
              size={roleTextSize}
              color={isDark ? "#AAA" : theme.text.tertiary}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.roleText,
                {
                  color: isDark ? "#CCC" : theme.text.secondary,
                  fontSize: roleTextSize,
                },
              ]}
              numberOfLines={1}
            >
              {roleLabel}
            </Text>
          </View>

          {/* Name */}
          <Text
            style={[
              styles.name,
              {
                color: theme.text.primary,
                fontSize: nameSize,
                lineHeight: nameLineHeight,
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>

          {/* Location */}
          {locationLine && (
            <View style={styles.locRow}>
              <Ionicons
                name="location-sharp"
                size={locationSize}
                color={isDark ? "#888" : theme.text.tertiary}
              />
              <Text
                style={[
                  styles.locText,
                  {
                    color: isDark ? "#999" : theme.text.tertiary,
                    fontSize: locationSize,
                    lineHeight: locationSize + 4,
                  },
                ]}
                numberOfLines={1}
              >
                {locationLine}
              </Text>
            </View>
          )}

          {/* Bio */}
          {bio && (
            <Text
              style={[
                styles.bio,
                {
                  color: isDark ? "#AAA" : theme.text.secondary,
                  fontSize: bioSize,
                  lineHeight: bioLineHeight,
                },
              ]}
              numberOfLines={bioLines}
            >
              {bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* ── ACTION BUTTONS ── */}
      <View
        style={[
          styles.actions,
          {
            paddingHorizontal: actionsPaddingHorizontal,
            paddingTop: actionsPaddingTop,
            paddingBottom: actionsPaddingBottom,
            gap: actionsGap,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.passBtn,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "#ECECEF",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E1E1E6",
              paddingVertical: actionButtonVerticalPadding,
            },
          ]}
          onPress={() => onPass?.(candidate)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close"
            size={actionIconSize}
            color={isDark ? "#FFF" : theme.text.secondary}
          />
          <Text
            style={[
              styles.passBtnText,
              {
                color: isDark ? "#FFFFFF" : theme.text.secondary,
                fontSize: actionTextSize,
              },
            ]}
          >
            Pass
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.connectBtn,
            {
              backgroundColor: theme.brand.primary,
              paddingVertical: actionButtonVerticalPadding,
              flex: connectButtonFlex,
            },
          ]}
          onPress={() => onConnect?.(candidate)}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={actionIconSize} color="#FFF" />
          <Text style={[styles.connectBtnText, { fontSize: actionTextSize }]}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const FounderCard = React.memo(FounderCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
  },
  profileTapArea: {
    flex: 1,
  },

  /* Photo area: edge-to-edge, no padding */
  photoArea: {
    width: "100%",
    overflow: "hidden",
  },
  initialsCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 90,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 4,
  },

  /* Info section */
  info: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flex: 1,
    overflow: "hidden",
  },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    flexShrink: 1,
  },

  name: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.4,
    marginBottom: 4,
  },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  locText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    flexShrink: 1,
  },

  bio: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
    marginBottom: 10,
  },

  /* Action buttons */
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 14,
    gap: 12,
    flexShrink: 0,
  },

  passBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    borderRadius: 30,
  },
  passBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },

  connectBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E8391C",
    paddingVertical: 14,
    borderRadius: 30,
  },
  connectBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
});
