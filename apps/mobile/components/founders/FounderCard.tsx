/**
 * FounderCard – Profile card with gradient overlay for the swipe stack.
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
const CARD_H = SCREEN_H * 0.72;

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
    const roleLabel = getRoleLabel(candidate);
    const experienceLabel = toTitle(candidate.experience_level);
    const stageLabel = toTitle(candidate.startup_stage);
    const detailPills = [experienceLabel, stageLabel].filter(Boolean) as string[];
    const locationLine = formatValue(candidate.location) || formatValue(candidate.country);
    const timezoneLine = formatValue(candidate.timezone);
    const workSummary = candidate.previous_works.length > 0
        ? `${candidate.previous_works.length} previous work ${candidate.previous_works.length === 1 ? "entry" : "entries"}`
        : null;
    const ideaPreview = candidate.business_ideas[0] || null;
    const ideaLabel = ideaPreview
        ? `Idea: ${ideaPreview}`
        : null;

    const previousWorks = candidate.previous_works || [];
    const topCompany = previousWorks[0]?.company;
    const credibilitySignal = [
        topCompany ? `Ex-${topCompany}` : null,
        experienceLabel ? `${experienceLabel} Level` : null,
        workSummary ? `(${workSummary})` : null
    ].filter(Boolean).join(" • ");

    return (
        <View style={styles.card}>
            {/* Background */}
            {imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                />
            ) : (
                <LinearGradient
                    colors={isDark
                        ? ["#1C1C24", "#2A2A36", "#1C1C24"]
                        : ["#EEEEF4", "#E0E0EE", "#EEEEF4"]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                >
                    <View style={styles.placeholderInner}>
                        <Text style={[
                            styles.initialsLarge,
                            { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }
                        ]}>
                            {initials}
                        </Text>
                    </View>
                </LinearGradient>
            )}

            {/* Top vignette */}
            <LinearGradient
                colors={["rgba(0,0,0,0.35)", "transparent"]}
                style={styles.gradientTop}
                pointerEvents="none"
            />

            {/* Bottom info panel */}
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.92)", "rgba(0,0,0,0.98)"]}
                locations={[0, 0.4, 0.75, 1]}
                style={styles.gradientBottom}
                pointerEvents="none"
            >
                <View style={styles.info}>
                    {/* 1. Name + Role */}
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {candidate.display_name || "Founder"}
                        </Text>
                        {roleLabel ? (
                            <View style={styles.rolePill}>
                                <Text style={styles.rolePillText} numberOfLines={1}>
                                    {roleLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* 2. One-line Founder Intent */}
                    {(candidate.looking_for || candidate.bio || ideaLabel) ? (
                        <Text style={styles.intentText} numberOfLines={1}>
                            {candidate.looking_for || ideaLabel || candidate.bio}
                        </Text>
                    ) : null}

                    {/* 3. Credibility Signal */}
                    {credibilitySignal ? (
                        <View style={styles.credibilityRow}>
                            <Ionicons name="shield-checkmark" size={14} color="#34C759" />
                            <Text style={styles.credibilityText} numberOfLines={1}>
                                {credibilitySignal}
                            </Text>
                        </View>
                    ) : null}

                    {/* 4. Stage & Location Chips */}
                    <View style={styles.tagsRow}>
                        {stageLabel ? (
                            <View style={styles.stageChip}>
                                <Ionicons name="rocket-outline" size={12} color="#fff" />
                                <Text style={styles.stageChipText}>{stageLabel}</Text>
                            </View>
                        ) : null}
                        {locationLine ? (
                            <View style={styles.metaChip}>
                                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.metaChipText}>
                                    {locationLine}{timezoneLine ? ` (${timezoneLine})` : ''}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* 5. Skills (Max 3) */}
                    {candidate.skills && candidate.skills.length > 0 ? (
                        <View style={styles.skillsRow}>
                            {candidate.skills.slice(0, 3).map((skill) => (
                                <View key={skill} style={styles.skillChip}>
                                    <Text style={styles.skillChipText} numberOfLines={1}>
                                        {skill}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            </LinearGradient>
        </View>
    );
}

export const FounderCard = React.memo(FounderCardInner);

const styles = StyleSheet.create({
    card: {
        width: CARD_W,
        height: CARD_H,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#111",
    },
    placeholderInner: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    initialsLarge: {
        fontSize: 180,
        fontFamily: "Poppins_700Bold",
    },
    gradientTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    gradientBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    info: {
        paddingHorizontal: 20,
        paddingBottom: 22,
        paddingTop: 48,
        gap: 6,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
    },
    name: {
        fontSize: 26,
        fontFamily: "Poppins_700Bold",
        color: "#fff",
        letterSpacing: -0.5,
        flexShrink: 1,
    },
    rolePill: {
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    rolePillText: {
        fontSize: 11,
        fontFamily: "Poppins_500Medium",
        color: "rgba(255,255,255,0.9)",
    },
    intentText: {
        fontSize: 15,
        fontFamily: "Poppins_400Regular",
        color: "rgba(255,255,255,0.9)",
        lineHeight: 22,
        marginTop: 2,
    },
    credibilityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
    },
    credibilityText: {
        fontSize: 13,
        fontFamily: "Poppins_500Medium",
        color: "rgba(255,255,255,0.85)",
    },
    tagsRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    stageChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(52, 199, 89, 0.2)",
        borderColor: "rgba(52, 199, 89, 0.5)",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    stageChipText: {
        fontSize: 11,
        fontFamily: "Poppins_600SemiBold",
        color: "#fff",
    },
    metaChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    metaChipText: {
        fontSize: 11,
        fontFamily: "Poppins_400Regular",
        color: "rgba(255,255,255,0.8)",
    },
    skillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
    },
    skillChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
    },
    skillChipText: {
        fontSize: 12,
        fontFamily: "Poppins_500Medium",
        color: "#fff",
    },
});
