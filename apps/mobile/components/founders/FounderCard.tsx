/**
 * FounderCard – Clean card matching the OnlyFounders reference.
 * - Photo sits inside the card with padding + rounded corners
 * - No action buttons inside the card (swipe handles connect/pass)
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
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

function countryFlag(str: string | null | undefined): string {
  if (!str) return "🌍";
  const map: Record<string, string> = {
    india: "🇮🇳", "united states": "🇺🇸", us: "🇺🇸", usa: "🇺🇸",
    uk: "🇬🇧", "united kingdom": "🇬🇧", gb: "🇬🇧", england: "🇬🇧",
    canada: "🇨🇦", australia: "🇦🇺", germany: "🇩🇪", france: "🇫🇷",
    singapore: "🇸🇬", uae: "🇦🇪", nigeria: "🇳🇬", kenya: "🇰🇪",
    brazil: "🇧🇷", pakistan: "🇵🇰",
  };
  return map[str.toLowerCase()] ?? "🌍";
}

function intentLabel(candidate: FounderCandidate): string | null {
  const lf = candidate.looking_for?.toLowerCase() ?? "";
  if (lf.includes("co-founder") || lf.includes("cofounder")) return "Looking for a Co-Founder";
  if (lf.includes("team") || lf.includes("build")) return "Looking to Build a Team";
  if (lf.includes("partner")) return "Looking for a Business Partner";
  if (lf.includes("freelancer")) return "Looking for Freelancers";
  if (lf.length > 0) return "Looking to Connect";
  const ut = candidate.user_type;
  if (ut === "founder") return "Open to Co-Founder";
  if (ut === "freelancer") return "Available for Gigs";
  if (ut === "both") return "Founder & Freelancer";
  return null;
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
}: FounderCardProps) {
  const { isDark, theme } = useTheme();
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => { setIsTruncated(false); }, [candidate.id]);


  const imageUri = candidate.photo_url || candidate.avatar_url;
  const initials = (candidate.display_name || "?").charAt(0).toUpperCase();
  const name = candidate.display_name || "Founder";
  const locationLine = fmt(candidate.location) || fmt(candidate.country);
  const flag = countryFlag(candidate.country || candidate.location);
  const roleLabel = toTitle(candidate.role) || toTitle(candidate.user_type) || "Founder";
  const intent = intentLabel(candidate);
  const bio = fmt(candidate.bio) || fmt(candidate.looking_for);

  const IMAGE_H = Math.round(cardHeight * 0.46);
  const surfaceBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const bodyColor = theme.text.primary;
  const mutedColor = theme.text.secondary;
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  return (
    <View style={[styles.card, { width: cardWidth, backgroundColor: surfaceBg, borderColor: borderCol }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── PHOTO (padded, rounded corners) ── */}
        <View style={styles.photoOuter}>
          <View style={[styles.photoInner, { height: IMAGE_H }]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
                fadeDuration={0}
              />
            ) : (
              <LinearGradient
                colors={isDark ? ["#1E2333", "#12151E"] : ["#E8EBF0", "#CDD3DD"]}
                style={StyleSheet.absoluteFillObject}
              >
                <View style={styles.placeholderCenter}>
                  <Text style={[styles.initials, { color: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.10)" }]}>
                    {initials}
                  </Text>
                </View>
              </LinearGradient>
            )}


          </View>
        </View>

        {/* ── INFO ── */}
        <View style={styles.info}>

          {/* Top row: role pill on left */}
          <View style={styles.topRow}>
            <View style={[styles.rolePill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F0F0" }]}>
              <MaterialCommunityIcons name="handshake-outline" size={13} color={isDark ? "#AAA" : "#666"} style={{ marginRight: 4 }} />
              <Text style={[styles.roleText, { color: isDark ? "#BBB" : "#555" }]}>{roleLabel}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={[styles.name, { color: bodyColor }]}>{name}</Text>

          {/* Location */}
          {locationLine && (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={13} color={mutedColor} />
              <Text style={[styles.locText, { color: mutedColor }]}>{locationLine}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }]} />

          {/* Intent tag */}
          {intent && (
            <View style={[styles.intentTag, {
              backgroundColor: isDark ? "rgba(232,25,44,0.1)" : "rgba(232,25,44,0.07)",
              borderColor: isDark ? "rgba(232,25,44,0.25)" : "rgba(232,25,44,0.18)",
            }]}>
              <Text style={[styles.intentText, { color: isDark ? "#FF6B7A" : "#C8102E" }]}>{intent}</Text>
            </View>
          )}

          {/* Bio */}
          {bio && (
            <View style={styles.bioWrap}>
              <Text
                style={[styles.bio, { color: bodyColor }]}
                numberOfLines={3}
                onTextLayout={(e) => {
                  const { lines } = e.nativeEvent;
                  setIsTruncated(lines.length >= 3 && lines[lines.length - 1].text.endsWith('\u2026'));
                }}
              >
                {bio}
              </Text>
              {isTruncated && (
                <TouchableOpacity onPress={() => onViewProfile?.(candidate)} style={styles.seeMoreBtn}>
                  <Text style={[styles.seeMoreText, { color: isDark ? "#FF6B7A" : "#C8102E" }]}>See More</Text>
                  <Ionicons name="chevron-forward" size={12} color={isDark ? "#FF6B7A" : "#C8102E"} />
                </TouchableOpacity>
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

export const FounderCard = React.memo(FounderCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    flex: 1,
  },

  /* Photo sits inside with padding */
  photoOuter: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  photoInner: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    backgroundColor: "#111",
    position: "relative",
  },
  placeholderCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 80, fontFamily: "Poppins_700Bold" },



  /* Info section */
  info: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 },

  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },

  rolePill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  roleText: { fontSize: 12, fontFamily: "Poppins_500Medium" },

  name: {
    fontSize: 24, fontFamily: "Poppins_700Bold",
    letterSpacing: -0.4, marginBottom: 5,
  },

  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  locText: { fontSize: 12, fontFamily: "Poppins_400Regular" },

  divider: { height: 1, marginBottom: 14 },

  intentTag: {
    alignSelf: "flex-start",
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 12,
  },
  intentText: { fontSize: 12, fontFamily: "Poppins_600SemiBold" },

  bioWrap: { gap: 6 },
  bio: { fontSize: 14, lineHeight: 21, fontFamily: "Poppins_400Regular" },

  seeMoreBtn: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-end" },
  seeMoreText: { fontSize: 12, fontFamily: "Poppins_600SemiBold" },
});
