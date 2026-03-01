/**
 * FounderCard – Vertically-overlapped swipe card for the Communities screen.
 *
 * Layout (vertical split inside a fixed-height card):
 *   Top  40%  →  Profile image with gradient overlay, name + role badge
 *   Bot  60%  →  Dark surface: bio, company, location, skill chips, CTA row
 *
 * Designed for a progressive vertical overlap stack where only the top
 * ~10% of each card behind peeks out — so the image header strip needs
 * to be visually distinctive at a glance.
 *
 * The card height / width are passed in via props so the parent controls sizing.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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

function getRoleBadge(c: FounderCandidate): string | null {
  if (fmt(c.role)) return c.role!.toUpperCase();
  if (c.user_type === "both") return "FOUNDER & FREELANCER";
  if (c.user_type === "founder") return "FOUNDER";
  if (c.user_type === "freelancer") return "FREELANCER";
  return null;
}

/* ── component ───────────────────────────────────────── */

export interface FounderCardProps {
  candidate: FounderCandidate;
  /** Total card height – controlled by the parent stack */
  cardHeight: number;
  /** Total card width – defaults to SCREEN_W - 32 */
  cardWidth?: number;
  /** Called when "View Profile" is tapped */
  onViewProfile?: (candidate: FounderCandidate) => void;
  /** Called when "Connect" is tapped (triggers a right-swipe) */
  onConnect?: (candidate: FounderCandidate) => void;
}

function FounderCardInner({
  candidate,
  cardHeight,
  cardWidth = SCREEN_W - 32,
  onViewProfile,
  onConnect,
}: FounderCardProps) {
  const { isDark } = useTheme();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioTruncated, setBioTruncated] = useState(false);

  const IMAGE_H = Math.round(cardHeight * 0.4);

  // ── derived data ──
  const imageUri = candidate.photo_url || candidate.avatar_url;
  const initials = (candidate.display_name || "?").charAt(0).toUpperCase();
  const name = candidate.display_name || "Founder";
  const roleBadge = getRoleBadge(candidate);

  const prevWork = candidate.previous_works?.[0];
  const workRole = fmt(prevWork?.role);
  const workCompany = fmt(prevWork?.company);
  const companyLine =
    workRole && workCompany
      ? `${workRole} @ ${workCompany}`
      : workRole || workCompany || null;

  const experienceLabel = toTitle(candidate.experience_level);
  const stageLabel = toTitle(candidate.startup_stage);
  const fallbackLine = [experienceLabel, stageLabel]
    .filter(Boolean)
    .join(" · ");

  const locationLine = fmt(candidate.location) || fmt(candidate.country);

  const ideaPreview = candidate.business_ideas?.[0] || null;
  const bioText =
    candidate.looking_for ||
    candidate.bio ||
    (ideaPreview ? `Idea: ${ideaPreview}` : null);

  const skills = (candidate.skills || []).slice(0, 6);

  // ── colours ──
  const surfaceBg = isDark ? "#0E1015" : "#111318";
  const bodyColor = "rgba(248,250,252,0.88)";
  const mutedColor = "rgba(248,250,252,0.50)";
  const dividerColor = "rgba(255,255,255,0.06)";
  const chipBg = "rgba(255,255,255,0.08)";
  const chipTextColor = "rgba(248,250,252,0.70)";
  const accentColor = "#818CF8";
  const accentBtnBg = "rgba(129,140,248,0.14)";

  return (
    <View
      style={[
        styles.card,
        { width: cardWidth, height: cardHeight, backgroundColor: surfaceBg },
      ]}
    >
      {/* ═══════════════════ TOP 40 % – IMAGE ═══════════════════ */}
      <View style={[styles.imageSection, { height: IMAGE_H }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#1E2333", "#171D29", "#12151E"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          >
            <View style={styles.placeholderCenter}>
              <Text style={styles.initialsLarge}>{initials}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Dark gradient at bottom of image */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.25)", "rgba(14,16,21,0.92)"]}
          locations={[0, 0.5, 1]}
          style={styles.imageGradient}
          pointerEvents="none"
        />

        {/* Name + Role badge – bottom-left of image */}
        <View style={styles.imageOverlay}>
          <Text style={styles.heroName} numberOfLines={1}>
            {name}
          </Text>
          {roleBadge ? (
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText} numberOfLines={1}>
                {roleBadge}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ═══════════════════ BOT 60 % – CONTENT ═══════════════════ */}
      <View style={styles.content}>
        {/* Bio – primary focus */}
        <View style={styles.bioWrap}>
          {bioText ? (
            <>
              <Text
                style={[styles.bioText, { color: bodyColor }]}
                numberOfLines={bioExpanded ? undefined : 6}
                ellipsizeMode="tail"
                onTextLayout={(e) => {
                  if (!bioExpanded && e.nativeEvent.lines.length > 6) {
                    setBioTruncated(true);
                  }
                }}
              >
                {bioText}
              </Text>
              {bioTruncated && !bioExpanded ? (
                <TouchableOpacity
                  onPress={() => setBioExpanded(true)}
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <Text style={[styles.readMore, { color: accentColor }]}>
                    Read More
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={[styles.bioText, { color: mutedColor, fontStyle: "italic" }]}>
              No bio yet
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Meta: company + location */}
        <View style={styles.metaSection}>
          {(companyLine || fallbackLine) ? (
            <View style={styles.metaRow}>
              <Ionicons name="briefcase-outline" size={13} color={mutedColor} />
              <Text
                style={[styles.metaText, { color: "rgba(248,250,252,0.72)" }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {companyLine || fallbackLine}
              </Text>
            </View>
          ) : null}
          {locationLine ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={mutedColor} />
              <Text
                style={[styles.metaText, { color: mutedColor }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {locationLine}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Skill chips */}
        {skills.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            style={styles.chipsContainer}
          >
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
          </ScrollView>
        ) : null}

        {/* CTA row */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaSecondary, { borderColor: dividerColor }]}
            activeOpacity={0.7}
            onPress={() => onViewProfile?.(candidate)}
          >
            <Ionicons name="person-outline" size={15} color={mutedColor} />
            <Text style={[styles.ctaBtnText, { color: "rgba(248,250,252,0.72)" }]}>
              View Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaPrimary, { backgroundColor: accentBtnBg }]}
            activeOpacity={0.7}
            onPress={() => onConnect?.(candidate)}
          >
            <Ionicons name="people-outline" size={15} color={accentColor} />
            <Text style={[styles.ctaBtnText, { color: accentColor }]}>Connect</Text>
          </TouchableOpacity>
        </View>
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
    /* Subtle centered shadow – no bottom-heavy offset */
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  /* ── image section ── */
  imageSection: {
    position: "relative",
    overflow: "hidden",
  },
  placeholderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsLarge: {
    fontSize: 96,
    fontFamily: "Poppins_700Bold",
    color: "rgba(255,255,255,0.06)",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  imageOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 14,
  },
  heroName: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  rolePillText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#F8FAFC",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  /* ── content section ── */
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: "space-between",
  },

  /* bio */
  bioWrap: {
    flex: 1,
    minHeight: 40,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 21, // 1.5 ratio
    fontFamily: "Poppins_400Regular",
  },
  readMore: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 4,
  },

  /* divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },

  /* meta */
  metaSection: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Poppins_500Medium",
  },

  /* chips */
  chipsContainer: {
    marginTop: 8,
    flexGrow: 0,
  },
  chipsScroll: {
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_500Medium",
  },

  /* CTA */
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  ctaSecondary: {
    borderWidth: 1,
  },
  ctaPrimary: {},
  ctaBtnText: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Poppins_600SemiBold",
  },
});
