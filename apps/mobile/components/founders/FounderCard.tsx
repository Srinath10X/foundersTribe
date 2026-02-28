/**
 * FounderCard – Premium swipe card with a compact, structured content section.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import type { FounderCandidate } from "@/types/founders";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = SCREEN_W - 32;
const CARD_H = SCREEN_H * 0.64;
const MEDIA_H = Math.round(CARD_H * 0.66);

interface FounderCardProps {
  candidate: FounderCandidate;
}

function formatValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toTitle(value: string | null | undefined): string | null {
  const safe = formatValue(value);
  if (!safe) return null;
  return safe
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getRoleLabel(candidate: FounderCandidate): string | null {
  if (formatValue(candidate.role)) return candidate.role;
  if (candidate.user_type === "both") return "Founder & Freelancer";
  if (candidate.user_type === "founder") return "Founder";
  if (candidate.user_type === "freelancer") return "Freelancer";
  return null;
}

function FounderCardInner({ candidate }: FounderCardProps) {
  const { isDark } = useTheme();

  const imageUri = candidate.photo_url || candidate.avatar_url;
  const initials = (candidate.display_name || "?").charAt(0).toUpperCase();
  const name = candidate.display_name || "Founder";
  const roleLabel = getRoleLabel(candidate);

  const previousWorks = candidate.previous_works || [];
  const workRole = formatValue(previousWorks[0]?.role);
  const topCompany = formatValue(previousWorks[0]?.company);
  const companyLine = [workRole, topCompany].filter(Boolean).join(" @ ");

  const experienceLabel = toTitle(candidate.experience_level);
  const stageLabel = toTitle(candidate.startup_stage);
  const fallbackCompanyLine = [experienceLabel, stageLabel].filter(Boolean).join(" • ");

  const locationLine = formatValue(candidate.location) || formatValue(candidate.country);

  const ideaPreview = candidate.business_ideas[0] || null;
  const descriptionText =
    candidate.looking_for ||
    candidate.bio ||
    (ideaPreview ? `Idea: ${ideaPreview}` : null);

  const contentBg = isDark ? "rgba(10,12,16,0.95)" : "rgba(250,251,253,0.98)";
  const bodyColor = isDark ? "rgba(248,250,252,0.9)" : "rgba(15,23,42,0.82)";
  const metaColor = isDark ? "rgba(248,250,252,0.82)" : "rgba(15,23,42,0.74)";
  const mutedColor = isDark ? "rgba(248,250,252,0.6)" : "rgba(15,23,42,0.5)";

  return (
    <View style={[styles.card, { backgroundColor: isDark ? "#0F1117" : "#FFFFFF" }]}>
      <View style={styles.media}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={isDark
              ? ["#1D2330", "#171D29", "#141B26"]
              : ["#EDF2F7", "#E5EAF2", "#EDF2F7"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          >
            <View style={styles.placeholderInner}>
              <Text
                style={[
                  styles.initialsLarge,
                  { color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" },
                ]}
              >
                {initials}
              </Text>
            </View>
          </LinearGradient>
        )}

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.48)"]}
          locations={[0, 0.62, 1]}
          style={styles.imageBottomGradient}
          pointerEvents="none"
        />

        {roleLabel ? (
          <View style={styles.rolePillTopRight}>
            <Text style={styles.rolePillText} numberOfLines={1}>
              {roleLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.nameOverlay}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.content,
          {
            backgroundColor: contentBg,
            borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.1)",
          },
        ]}
      >
        {descriptionText ? (
          <Text style={[styles.description, { color: bodyColor }]} numberOfLines={2} ellipsizeMode="tail">
            {descriptionText}
          </Text>
        ) : null}

        {(companyLine || fallbackCompanyLine) && <View style={styles.innerDivider} />}

        {companyLine || fallbackCompanyLine ? (
          <View style={styles.metaRow}>
            <Ionicons name="briefcase-outline" size={13} color={metaColor} />
            <Text style={[styles.companyText, { color: metaColor }]} numberOfLines={1} ellipsizeMode="tail">
              {companyLine || fallbackCompanyLine}
            </Text>
          </View>
        ) : null}

        {locationLine ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={mutedColor} />
            <Text style={[styles.locationText, { color: mutedColor }]} numberOfLines={1} ellipsizeMode="tail">
              {locationLine}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const FounderCard = React.memo(FounderCardInner);

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 9,
  },
  media: {
    height: MEDIA_H,
    position: "relative",
  },
  placeholderInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsLarge: {
    fontSize: 128,
    fontFamily: "Poppins_700Bold",
  },
  imageBottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
  },
  rolePillTopRight: {
    position: "absolute",
    top: 12,
    right: 12,
    maxWidth: "65%",
    backgroundColor: "rgba(10,12,16,0.54)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  rolePillText: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#F8FAFC",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  nameOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
  },
  name: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.25,
  },
  content: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  innerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.28)",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  companyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_400Regular",
  },
});
