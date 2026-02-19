import React, { useCallback } from "react";
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { CandidateProfile, SwipeType } from "@/lib/founderMatchApi";
import { useTheme } from "@/context/ThemeContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.15;

/* ================================================================= */
/*  Types                                                             */
/* ================================================================= */

interface SwipeCardProps {
    candidate: CandidateProfile;
    onSwipe: (type: SwipeType) => void;
    isActive: boolean;
}

/* ================================================================= */
/*  Helpers                                                           */
/* ================================================================= */

const roleLabels: Record<string, string> = {
    tech: "🛠 Technical",
    business: "💼 Business",
    design: "🎨 Design",
    growth: "📈 Growth",
};

const stageLabels: Record<string, string> = {
    idea: "💡 Idea Stage",
    mvp: "🚀 MVP Stage",
    revenue: "💰 Revenue Stage",
};

const commitmentLabels: Record<string, string> = {
    full_time: "Full-Time",
    part_time: "Part-Time",
    exploring: "Exploring",
};

function CompatibilityRing({
    score,
    size = 56,
    strokeWidth = 4,
    color,
    textColor,
}: {
    score: number;
    size?: number;
    strokeWidth?: number;
    color: string;
    textColor: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {/* Background ring */}
            <View
                style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: color + "25",
                }}
            />
            {/* Foreground ring (simplified — using border for cross-platform) */}
            <View
                style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: color,
                    borderTopColor: score < 75 ? color + "25" : color,
                    borderRightColor: score < 50 ? color + "25" : color,
                    borderBottomColor: score < 25 ? color + "25" : color,
                    transform: [{ rotate: "-90deg" }],
                }}
            />
            <Text style={{ color: textColor, fontSize: 16, fontWeight: "800" }}>
                {score}
            </Text>
        </View>
    );
}

/* ================================================================= */
/*  SwipeCard                                                         */
/* ================================================================= */

export default function SwipeCard({ candidate, onSwipe, isActive }: SwipeCardProps) {
    const { theme } = useTheme();

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const cardRotation = useSharedValue(0);
    const cardScale = useSharedValue(1);

    const handleSwipe = useCallback(
        (type: SwipeType) => {
            onSwipe(type);
        },
        [onSwipe],
    );

    const panGesture = Gesture.Pan()
        .enabled(isActive)
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
            cardRotation.value = interpolate(
                event.translationX,
                [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
                [-15, 0, 15],
            );
        })
        .onEnd((event) => {
            // Swipe right = interested
            if (event.translationX > SWIPE_THRESHOLD) {
                translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
                cardRotation.value = withTiming(30, { duration: 300 });
                runOnJS(handleSwipe)("interested");
                return;
            }
            // Swipe left = pass
            if (event.translationX < -SWIPE_THRESHOLD) {
                translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
                cardRotation.value = withTiming(-30, { duration: 300 });
                runOnJS(handleSwipe)("pass");
                return;
            }
            // Swipe up = super
            if (event.translationY < -SWIPE_UP_THRESHOLD) {
                translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
                cardScale.value = withTiming(0.5, { duration: 300 });
                runOnJS(handleSwipe)("super");
                return;
            }
            // Spring back
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            cardRotation.value = withSpring(0, { damping: 20, stiffness: 200 });
        });

    const cardAnimStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${cardRotation.value}deg` },
            { scale: cardScale.value },
        ],
    }));

    // Overlay opacity based on swipe direction
    const rightOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            "clamp",
        ),
    }));
    const leftOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, -SWIPE_THRESHOLD],
            [0, 1],
            "clamp",
        ),
    }));
    const superOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateY.value,
            [0, -SWIPE_UP_THRESHOLD],
            [0, 1],
            "clamp",
        ),
    }));

    const compatScore = candidate.compatibility ?? 0;
    const compatColor =
        compatScore >= 70
            ? theme.success
            : compatScore >= 40
                ? theme.warning
                : theme.error;

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    styles.cardContainer,
                    {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                    },
                    cardAnimStyle,
                ]}
            >
                {/* ─── Swipe Overlays ─── */}
                <Animated.View style={[styles.overlay, styles.overlayRight, rightOverlayStyle]}>
                    <LinearGradient
                        colors={["transparent", "rgba(110,191,139,0.4)"]}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 0, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.overlayBadge}>
                        <Ionicons name="checkmark-circle" size={48} color="#6EBF8B" />
                        <Text style={[styles.overlayLabel, { color: "#6EBF8B" }]}>
                            INTERESTED
                        </Text>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.overlay, styles.overlayLeft, leftOverlayStyle]}>
                    <LinearGradient
                        colors={["transparent", "rgba(212,122,116,0.4)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.overlayBadge}>
                        <Ionicons name="close-circle" size={48} color="#D47A74" />
                        <Text style={[styles.overlayLabel, { color: "#D47A74" }]}>
                            PASS
                        </Text>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.overlay, styles.overlayTop, superOverlayStyle]}>
                    <LinearGradient
                        colors={["rgba(255,215,0,0.4)", "transparent"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.overlayBadge, { top: 40 }]}>
                        <Ionicons name="star" size={48} color="#FFD700" />
                        <Text style={[styles.overlayLabel, { color: "#FFD700" }]}>
                            SUPER LIKE
                        </Text>
                    </View>
                </Animated.View>

                {/* ─── Card Content ─── */}
                <View style={styles.cardInner}>
                    {/* Header — role + compatibility */}
                    <View style={styles.headerRow}>
                        <View style={[styles.roleBadge, { backgroundColor: theme.brand.primary + "15" }]}>
                            <Text style={[styles.roleText, { color: theme.brand.primary }]}>
                                {roleLabels[candidate.role] || candidate.role}
                            </Text>
                        </View>
                        <CompatibilityRing
                            score={compatScore}
                            color={compatColor}
                            textColor={theme.text.primary}
                        />
                    </View>

                    {/* Stage & Commitment */}
                    <View style={styles.metaRow}>
                        <View style={[styles.metaChip, { backgroundColor: theme.surfaceElevated }]}>
                            <Text style={[styles.metaChipText, { color: theme.text.secondary }]}>
                                {stageLabels[candidate.stage] || candidate.stage}
                            </Text>
                        </View>
                        <View style={[styles.metaChip, { backgroundColor: theme.surfaceElevated }]}>
                            <Ionicons
                                name="time-outline"
                                size={12}
                                color={theme.text.tertiary}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.metaChipText, { color: theme.text.secondary }]}>
                                {commitmentLabels[candidate.commitment] || candidate.commitment}
                            </Text>
                        </View>
                    </View>

                    {/* Pitch */}
                    <View style={[styles.pitchBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={16}
                            color={theme.text.tertiary}
                            style={{ marginRight: 8, marginTop: 2 }}
                        />
                        <Text
                            style={[styles.pitchText, { color: theme.text.primary }]}
                            numberOfLines={4}
                        >
                            {candidate.pitch}
                        </Text>
                    </View>

                    {/* Industry Tags */}
                    {candidate.industryTags && candidate.industryTags.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
                                INDUSTRIES
                            </Text>
                            <View style={styles.tagRow}>
                                {candidate.industryTags.slice(0, 5).map((tag, i) => (
                                    <View
                                        key={i}
                                        style={[styles.tag, { backgroundColor: theme.info + "15", borderColor: theme.info + "30" }]}
                                    >
                                        <Text style={[styles.tagText, { color: theme.info }]}>
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Skills */}
                    {candidate.topSkills && candidate.topSkills.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
                                TOP SKILLS
                            </Text>
                            <View style={styles.tagRow}>
                                {candidate.topSkills.slice(0, 5).map((skill, i) => (
                                    <View
                                        key={i}
                                        style={[styles.tag, { backgroundColor: theme.success + "15", borderColor: theme.success + "30" }]}
                                    >
                                        <Text style={[styles.tagText, { color: theme.success }]}>
                                            {skill}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Compatibility Breakdown */}
                    {candidate.compatibilityBreakdown && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
                                COMPATIBILITY
                            </Text>
                            <View style={styles.breakdownGrid}>
                                {[
                                    { label: "Role Fit", value: candidate.compatibilityBreakdown.roleComplement, max: 30 },
                                    { label: "Industry", value: candidate.compatibilityBreakdown.industryOverlap, max: 20 },
                                    { label: "Commitment", value: candidate.compatibilityBreakdown.commitmentAlignment, max: 20 },
                                    { label: "Stage", value: candidate.compatibilityBreakdown.stageAlignment, max: 15 },
                                    { label: "Skills", value: candidate.compatibilityBreakdown.skillComplement, max: 15 },
                                ].map((item, i) => (
                                    <View key={i} style={styles.breakdownItem}>
                                        <View style={styles.breakdownBarBg}>
                                            <View
                                                style={[
                                                    styles.breakdownBarFill,
                                                    {
                                                        width: `${Math.min(100, (item.value / item.max) * 100)}%`,
                                                        backgroundColor: compatColor,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text
                                            style={[styles.breakdownLabel, { color: theme.text.tertiary }]}
                                        >
                                            {item.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Verified badge + Activity */}
                    <View style={styles.footerRow}>
                        {candidate.verified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="shield-checkmark" size={14} color={theme.success} />
                                <Text style={[styles.verifiedText, { color: theme.success }]}>
                                    Verified
                                </Text>
                            </View>
                        )}
                        {candidate.projectsBuilt > 0 && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="construct-outline" size={14} color={theme.text.tertiary} />
                                <Text style={[styles.verifiedText, { color: theme.text.tertiary }]}>
                                    {candidate.projectsBuilt} project{candidate.projectsBuilt > 1 ? "s" : ""} built
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Animated.View>
        </GestureDetector>
    );
}

/* ================================================================= */
/*  Styles                                                            */
/* ================================================================= */

const styles = StyleSheet.create({
    cardContainer: {
        position: "absolute",
        width: SCREEN_WIDTH - 32,
        alignSelf: "center",
        borderRadius: Layout.radius.xl,
        borderWidth: 1,
        overflow: "hidden",
        ...Layout.shadows.lg,
    },

    cardInner: {
        padding: Spacing.lg,
        paddingTop: Spacing.md,
    },

    /* Overlays */
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        borderRadius: Layout.radius.xl,
        overflow: "hidden",
        pointerEvents: "none",
    },
    overlayRight: {},
    overlayLeft: {},
    overlayTop: {},
    overlayBadge: {
        position: "absolute",
        top: 24,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    overlayLabel: {
        fontSize: 20,
        fontWeight: "900",
        letterSpacing: 2,
        marginTop: 4,
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    /* Header */
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.sm,
    },
    roleBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xxs + 2,
        borderRadius: Layout.radius.full,
    },
    roleText: {
        ...Typography.presets.bodySmall,
        fontWeight: "700",
    },

    /* Meta chips */
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: Spacing.sm,
    },
    metaChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: Spacing.xxs + 1,
        borderRadius: Layout.radius.sm,
    },
    metaChipText: {
        ...Typography.presets.caption,
        fontWeight: "600",
    },

    /* Pitch */
    pitchBox: {
        flexDirection: "row",
        padding: Spacing.sm,
        borderRadius: Layout.radius.md,
        borderWidth: 1,
        marginBottom: Spacing.sm,
    },
    pitchText: {
        ...Typography.presets.body,
        flex: 1,
        lineHeight: 22,
    },

    /* Sections */
    section: {
        marginBottom: Spacing.sm,
    },
    sectionLabel: {
        ...Typography.presets.label,
        marginBottom: 6,
    },
    tagRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Layout.radius.full,
        borderWidth: 1,
    },
    tagText: {
        ...Typography.presets.caption,
        fontWeight: "600",
        textTransform: "none",
    },

    /* Breakdown */
    breakdownGrid: {
        gap: 6,
    },
    breakdownItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    breakdownBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(128,128,128,0.15)",
        overflow: "hidden",
    },
    breakdownBarFill: {
        height: "100%",
        borderRadius: 3,
    },
    breakdownLabel: {
        width: 80,
        ...Typography.presets.caption,
        textAlign: "right",
    },

    /* Footer */
    footerRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: Spacing.xxs,
    },
    verifiedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    verifiedText: {
        ...Typography.presets.caption,
        fontWeight: "600",
    },
});
