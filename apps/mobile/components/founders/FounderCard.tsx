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
                colors={["rgba(0,0,0,0.28)", "transparent"]}
                style={styles.gradientTop}
                pointerEvents="none"
            />

            {/* Bottom info panel */}
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.88)", "rgba(0,0,0,0.95)"]}
                locations={[0, 0.3, 0.7, 1]}
                style={styles.gradientBottom}
                pointerEvents="none"
            >
                <View style={styles.info}>
                    {/* Name row */}
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

                    {/* Experience/stage pills */}
                    {detailPills.length > 0 ? (
                        <View style={styles.detailPillsRow}>
                            {detailPills.map((pill) => (
                                <View key={pill} style={styles.detailPill}>
                                    <Text style={styles.detailPillText} numberOfLines={1}>
                                        {pill}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {/* Location */}
                    {locationLine ? (
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {locationLine}
                            </Text>
                        </View>
                    ) : null}

                    {timezoneLine ? (
                        <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.55)" />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {timezoneLine}
                            </Text>
                        </View>
                    ) : null}

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Bio */}
                    {candidate.bio ? (
                        <Text style={styles.bio} numberOfLines={2}>
                            {candidate.bio}
                        </Text>
                    ) : null}

                    {/* Skills */}
                    {candidate.skills && candidate.skills.length > 0 ? (
                        <View style={styles.skillsRow}>
                            {candidate.skills.slice(0, 4).map((skill) => (
                                <View key={skill} style={styles.chip}>
                                    <Text style={styles.chipText} numberOfLines={1}>
                                        {skill}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {/* Looking for */}
                    {candidate.looking_for ? (
                        <View style={styles.lookingForBox}>
                            <Text style={styles.lookingForLabel}>LOOKING FOR</Text>
                            <Text style={styles.lookingForText} numberOfLines={1}>
                                {candidate.looking_for}
                            </Text>
                        </View>
                    ) : null}

                    {ideaLabel ? (
                        <Text style={styles.extraLine} numberOfLines={1}>
                            {ideaLabel}
                        </Text>
                    ) : null}

                    {workSummary ? (
                        <Text style={styles.extraLine} numberOfLines={1}>
                            {workSummary}
                        </Text>
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
    detailPillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    detailPill: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    detailPillText: {
        fontSize: 10,
        fontFamily: "Poppins_500Medium",
        color: "rgba(255,255,255,0.82)",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontFamily: "Poppins_400Regular",
        color: "rgba(255,255,255,0.6)",
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.1)",
        marginVertical: 4,
    },
    bio: {
        fontSize: 13,
        lineHeight: 20,
        fontFamily: "Poppins_400Regular",
        color: "rgba(255,255,255,0.72)",
    },
    skillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    chip: {
        paddingHorizontal: 11,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
    },
    chipText: {
        fontSize: 11,
        fontFamily: "Poppins_500Medium",
        color: "rgba(255,255,255,0.85)",
    },
    lookingForBox: {
        marginTop: 2,
        gap: 1,
    },
    lookingForLabel: {
        fontSize: 9,
        fontFamily: "Poppins_600SemiBold",
        color: "rgba(255,255,255,0.4)",
        letterSpacing: 1,
    },
    lookingForText: {
        fontSize: 13,
        fontFamily: "Poppins_400Regular",
        color: "rgba(255,255,255,0.65)",
        lineHeight: 18,
    },
    extraLine: {
        marginTop: 1,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: "Poppins_400Regular",
        color: "rgba(255,255,255,0.6)",
    },
});
