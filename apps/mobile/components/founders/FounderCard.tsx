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
const CARD_H = SCREEN_H * 0.64;

interface FounderCardProps {
    candidate: FounderCandidate;
}

function FounderCardInner({ candidate }: FounderCardProps) {
    const { isDark } = useTheme();

    const imageUri = candidate.photo_url || candidate.avatar_url;
    const initials = (candidate.display_name || "?").charAt(0).toUpperCase();

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
                        {candidate.role ? (
                            <View style={styles.rolePill}>
                                <Text style={styles.rolePillText} numberOfLines={1}>
                                    {candidate.role}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Location */}
                    {candidate.location ? (
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {candidate.location}
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
});
