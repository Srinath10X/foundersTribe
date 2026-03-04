/**
 * FounderCard – Magazine style scrollable card.
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
import type { FounderCandidate, PreviousWork } from "@/types/founders";

const { width: SCREEN_W } = Dimensions.get("window");

/* ── helpers ─────────────────────────────────────────── */

function fmt(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function toTitle(v: string | null | undefined): string | null {
  const s = fmt(v);
  if (!s) return null;
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/* ── component ───────────────────────────────────────── */

export interface FounderCardProps {
  candidate: FounderCandidate;
  cardHeight: number;
  cardWidth?: number;
  onViewProfile?: (candidate: FounderCandidate) => void;
  onConnect?: (candidate: FounderCandidate) => void;
  onMessage?: (candidate: FounderCandidate) => void;
}

function FounderCardInner({
  candidate,
  cardHeight,
  cardWidth = SCREEN_W - 24,
  onViewProfile,
  onConnect,
  onMessage,
}: FounderCardProps) {
  const { isDark, theme } = useTheme();
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    setBioExpanded(false);
  }, [candidate.id]);

  const IMAGE_H = Math.round(cardHeight * 0.45);

  // ── derived data ──
  const imageUri = candidate.photo_url || candidate.avatar_url;
  const initials = (candidate.display_name || "?").charAt(0).toUpperCase();
  const name = candidate.display_name || "Founder";

  const locationLine = fmt(candidate.location) || fmt(candidate.country);
  const ideaPreview = candidate.business_ideas?.[0] || null;
  const bioText =
    candidate.looking_for ||
    candidate.bio ||
    (ideaPreview ? `Idea: ${ideaPreview}` : null);

  const skills = (candidate.skills || []).slice(0, 10);
  const experience = (candidate.previous_works || []);

  // ── colours ──
  const surfaceBg = theme.surface;
  const bodyColor = theme.text.primary;
  const mutedColor = theme.text.secondary;
  const borderCol = theme.border;
  const chipBg = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";
  const chipTextColor = theme.text.primary;

  const ctaPrimary = "#EF4444"; // Red connect button from screenshot
  const ctaText = "#FFFFFF";

  return (
    <View
      style={[
        styles.card,
        {
          width: cardWidth,
          maxHeight: cardHeight,
          backgroundColor: surfaceBg,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* ═══════════════════ TOP IMAGE ═══════════════════ */}
        <View style={[styles.imageSection, { height: IMAGE_H }]}>
          {imageUri ? (
            <Image
              key={imageUri || candidate.id}
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : (
            <LinearGradient
              colors={
                isDark
                  ? ["#1E2333", "#171D29", "#12151E"]
                  : ["#E8EBF0", "#D9DEE6", "#CDD3DD"]
              }
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
            >
              <View style={styles.placeholderCenter}>
                <Text
                  style={[
                    styles.initialsLarge,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            </LinearGradient>
          )}

          {/* Dark gradient for text visibility */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            locations={[0.5, 1]}
            style={styles.imageGradient}
            pointerEvents="none"
          />

          {/* Name + Location overlay */}
          <View style={styles.imageOverlay}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {name}
              </Text>
            </View>
            {candidate.role && (
              <Text style={styles.heroRole} numberOfLines={1}>
                {toTitle(candidate.role)}
              </Text>
            )}
            {locationLine && (
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLine}
              </Text>
            )}
          </View>
        </View>

        {/* ═══════════════════ CONTENT ═══════════════════ */}
        <View style={styles.content}>
          {/* Bio */}
          {bioText && (
            <View style={styles.bioWrap}>
              <Text
                style={[styles.bioText, { color: bodyColor }]}
                numberOfLines={bioExpanded ? undefined : 4}
              >
                {bioText}
              </Text>
              {!bioExpanded && bioText.length > 150 && (
                <TouchableOpacity onPress={() => setBioExpanded(true)}>
                  <Text style={[styles.seeMore, { color: mutedColor }]}>See More</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Skills / Tags */}
          {skills.length > 0 && (
            <View style={styles.skillsContainer}>
              {skills.map((skill, i) => (
                <View
                  key={`${skill}-${i}`}
                  style={[styles.chip, { backgroundColor: chipBg }]}
                >
                  <Text style={[styles.chipLabel, { color: chipTextColor }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* ═══════════════════ CTA FOOTER ═══════════════════ */}
      <View style={[styles.fixedFooter, { backgroundColor: surfaceBg }]}>
        <TouchableOpacity
          style={[styles.btnConnect, { backgroundColor: ctaPrimary }]}
          activeOpacity={0.8}
          onPress={() => onConnect?.(candidate)}
        >
          <Text style={[styles.btnConnectText, { color: ctaText }]}>+ Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: ctaPrimary }]}
          activeOpacity={0.8}
          onPress={() => onMessage?.(candidate)}
        >
          <Text style={[styles.btnOutlineText, { color: ctaPrimary }]}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnIcon, { borderColor: ctaPrimary }]}
          activeOpacity={0.8}
          onPress={() => onConnect?.(candidate)}
        >
          <Ionicons name="heart-outline" size={22} color={ctaPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const FounderCard = React.memo(FounderCardInner);

/* ── styles ──────────────────────────────────────────── */

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  imageSection: {
    position: "relative",
    width: "100%",
  },
  placeholderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsLarge: {
    fontSize: 80,
    fontFamily: "Poppins_700Bold",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  imageOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroRole: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#E2E8F0",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#CBD5E1",
  },
  content: {
    padding: 20,
  },
  bioWrap: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  seeMore: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    marginTop: 6,
    textAlign: "right",
    textDecorationLine: "underline",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  fixedFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  btnConnect: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnConnectText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
  },
  btnIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
