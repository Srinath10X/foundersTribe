/**
 * FounderCard – Redesigned card matching the dark, edge-to-edge reference.
 * - Photo/gradient area is edge-to-edge (no padding)
 * - Full initials (e.g. "PK") shown on gradient placeholder
 * - Role pill with link icon
 * - Pass & Connect action buttons at the bottom
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import type { FounderCandidate } from "@/types/founders";

const { width: SCREEN_W } = Dimensions.get("window");

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
  cardWidth = SCREEN_W - 24,
  onConnect,
  onPass,
}: FounderCardProps) {
  const { isDark } = useTheme();

  const imageUri = candidate.photo_url || candidate.avatar_url;
  const initials = getInitials(candidate.display_name);
  const name = candidate.display_name || "Founder";
  const locationLine = fmt(candidate.location) || fmt(candidate.country);
  const roleLabel = toTitle(candidate.role) || toTitle(candidate.user_type) || "Founder";
  const bio = fmt(candidate.bio) || fmt(candidate.looking_for);

  const IMAGE_H = Math.round(cardHeight * 0.55);

  return (
    <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
      {/* ── PHOTO / GRADIENT (edge-to-edge) ── */}
      <View style={[styles.photoArea, { height: IMAGE_H }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <LinearGradient
            colors={["#0F3D1E", "#0A2914", "#071D0E"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          >
            <View style={styles.initialsCenter}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          </LinearGradient>
        )}
      </View>

      {/* ── INFO SECTION ── */}
      <View style={styles.info}>
        {/* Role pill */}
        <View style={styles.rolePill}>
          <Ionicons name="link" size={12} color="#AAA" style={{ marginRight: 5 }} />
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>{name}</Text>

        {/* Location */}
        {locationLine && (
          <View style={styles.locRow}>
            <Ionicons name="location-sharp" size={14} color="#888" />
            <Text style={styles.locText}>{locationLine}</Text>
          </View>
        )}

        {/* Bio */}
        {bio && (
          <Text style={styles.bio} numberOfLines={2}>{bio}</Text>
        )}
      </View>

      {/* ── ACTION BUTTONS ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.passBtn}
          onPress={() => onPass?.(candidate)}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color="#FFF" />
          <Text style={styles.passBtnText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.connectBtn}
          onPress={() => onConnect?.(candidate)}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={18} color="#FFF" />
          <Text style={styles.connectBtnText}>Connect</Text>
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
    backgroundColor: "#111111",
    flex: 1,
  },

  /* Photo area: edge-to-edge, no padding */
  photoArea: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#0A2914",
  },
  initialsCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 90,
    fontFamily: "Poppins_700Bold",
    color: "rgba(255,255,255,0.06)",
    letterSpacing: 4,
  },

  /* Info section */
  info: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flex: 1,
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
    color: "#CCC",
  },

  name: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
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
    color: "#999",
  },

  bio: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
    color: "#AAA",
  },

  /* Action buttons */
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 12,
  },

  passBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
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
