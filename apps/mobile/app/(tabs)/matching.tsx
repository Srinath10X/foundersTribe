import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated as RNAnimated,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";

import SwipeCard from "@/components/SwipeCard";
import FounderMatchOnboarding from "@/components/FounderMatchOnboarding";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
    CandidateProfile,
    SwipeType,
    getNextCandidate,
    recordSwipe,
    FounderRole,
    FounderStage,
} from "@/lib/founderMatchApi";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";

/* ================================================================= */
/*  Matching Tab Screen                                               */
/* ================================================================= */

export default function MatchingScreen() {
    const { theme, isDark } = useTheme();
    const { session } = useAuth();
    const authToken = session?.access_token;

    /* ── State ── */
    const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [swipeCount, setSwipeCount] = useState(0);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matchScore, setMatchScore] = useState(0);
    const [cardKey, setCardKey] = useState(0); // force remount for new candidate

    // Filters
    const [filterRole, setFilterRole] = useState<FounderRole | undefined>();
    const [filterStage, setFilterStage] = useState<FounderStage | undefined>();

    // Match modal animation
    const matchScale = useRef(new RNAnimated.Value(0)).current;
    const matchOpacity = useRef(new RNAnimated.Value(0)).current;

    /* ── Fetch next candidate ── */
    const fetchCandidate = useCallback(async () => {
        if (!authToken) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getNextCandidate(authToken, {
                role: filterRole,
                stage: filterStage,
            });
            setCandidate(result);
            setCardKey((k) => k + 1);
            setNeedsOnboarding(false);
        } catch (err: any) {
            const msg = err.message || "";
            // If profile not found or incomplete, show onboarding
            if (
                msg.includes("profile") ||
                msg.includes("incomplete") ||
                msg.includes("not found") ||
                msg.includes("Profile")
            ) {
                setNeedsOnboarding(true);
                setShowOnboarding(true);
                setCandidate(null);
            } else if (msg.includes("No more candidates") || msg.includes("no more")) {
                setCandidate(null);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [authToken, filterRole, filterStage]);

    useEffect(() => {
        fetchCandidate();
    }, [fetchCandidate]);

    /* ── Handle swipe ── */
    const handleSwipe = useCallback(
        async (type: SwipeType) => {
            if (!authToken || !candidate) return;
            setSwipeCount((c) => c + 1);

            try {
                const result = await recordSwipe(authToken, candidate.userId, type);

                // Match detected!
                if (result?.match) {
                    setMatchScore(result.match.compatibility_score);
                    setShowMatchModal(true);
                    // Animate match modal
                    RNAnimated.parallel([
                        RNAnimated.spring(matchScale, {
                            toValue: 1,
                            tension: 50,
                            friction: 7,
                            useNativeDriver: true,
                        }),
                        RNAnimated.timing(matchOpacity, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            } catch (err: any) {
                console.warn("[Matching] swipe error:", err.message);
                // Cooldown or rate limit
                if (err.message?.includes("cooldown") || err.message?.includes("limit")) {
                    setError("You've reached the daily swipe limit! Take a break 🧘");
                    setCandidate(null);
                    return;
                }
            }

            // Fetch next after a small delay for animation
            setTimeout(() => {
                fetchCandidate();
            }, 400);
        },
        [authToken, candidate, fetchCandidate, matchScale, matchOpacity],
    );

    /* ── Button swipes ── */
    const handleButtonSwipe = (type: SwipeType) => {
        handleSwipe(type);
    };

    /* ── Dismiss match modal ── */
    const dismissMatchModal = () => {
        RNAnimated.parallel([
            RNAnimated.timing(matchScale, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            RNAnimated.timing(matchOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => setShowMatchModal(false));
    };

    /* ── Onboarding complete ── */
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        setNeedsOnboarding(false);
        fetchCandidate();
    };

    /* ── Filter chips ── */
    const FilterChip = ({
        label,
        active,
        onPress,
    }: {
        label: string;
        active: boolean;
        onPress: () => void;
    }) => (
        <TouchableOpacity
            style={[
                styles.filterChip,
                {
                    backgroundColor: active ? theme.brand.primary + "20" : theme.surfaceElevated,
                    borderColor: active ? theme.brand.primary : theme.border,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.filterChipText,
                    { color: active ? theme.brand.primary : theme.text.secondary },
                ]}
            >
                {label}
            </Text>
            {active && (
                <Ionicons
                    name="close-circle"
                    size={14}
                    color={theme.brand.primary}
                    style={{ marginLeft: 4 }}
                />
            )}
        </TouchableOpacity>
    );

    /* ── Empty state ── */
    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.brand.primary + "15" }]}>
                <Ionicons name="heart-dislike-outline" size={48} color={theme.brand.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                No more founders right now
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
                Check back later or adjust your filters to discover new potential co-founders.
            </Text>
            <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: theme.brand.primary }]}
                onPress={() => {
                    setFilterRole(undefined);
                    setFilterStage(undefined);
                    fetchCandidate();
                }}
                activeOpacity={0.8}
            >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={[styles.ctaBtnText, { color: "#fff" }]}>
                    Reset & Refresh
                </Text>
            </TouchableOpacity>
        </View>
    );

    /* ── Error state ── */
    const ErrorState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.error + "15" }]}>
                <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                Something went wrong
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
                {error}
            </Text>
            <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: theme.brand.primary }]}
                onPress={fetchCandidate}
                activeOpacity={0.8}
            >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={[styles.ctaBtnText, { color: "#fff" }]}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );

    /* ═══════════════════════════════════════════════════════════════ */
    /*  Render                                                        */
    /* ═══════════════════════════════════════════════════════════════ */

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="flame" size={28} color={theme.brand.primary} />
                        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
                            Matching
                        </Text>
                    </View>
                    {swipeCount > 0 && (
                        <View style={[styles.swipeCounter, { backgroundColor: theme.surfaceElevated }]}>
                            <Ionicons name="swap-horizontal" size={14} color={theme.text.tertiary} />
                            <Text style={[styles.swipeCountText, { color: theme.text.tertiary }]}>
                                {swipeCount} today
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
                    Find your perfect co-founder
                </Text>

                {/* Filter row */}
                <View style={styles.filterRow}>
                    <FilterChip
                        label={filterRole ? `Role: ${filterRole}` : "Any Role"}
                        active={!!filterRole}
                        onPress={() => {
                            const roles: (FounderRole | undefined)[] = [undefined, "tech", "business", "design", "growth"];
                            const idx = roles.indexOf(filterRole);
                            setFilterRole(roles[(idx + 1) % roles.length]);
                        }}
                    />
                    <FilterChip
                        label={filterStage ? `Stage: ${filterStage}` : "Any Stage"}
                        active={!!filterStage}
                        onPress={() => {
                            const stages: (FounderStage | undefined)[] = [undefined, "idea", "mvp", "revenue"];
                            const idx = stages.indexOf(filterStage);
                            setFilterStage(stages[(idx + 1) % stages.length]);
                        }}
                    />
                </View>
            </View>

            {/* ── Content ── */}
            <View style={styles.cardArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.brand.primary} />
                        <Text style={[styles.loadingText, { color: theme.text.tertiary }]}>
                            Finding founders…
                        </Text>
                    </View>
                ) : error && !candidate ? (
                    <ErrorState />
                ) : !candidate ? (
                    <EmptyState />
                ) : (
                    <SwipeCard
                        key={cardKey}
                        candidate={candidate}
                        onSwipe={handleSwipe}
                        isActive
                    />
                )}
            </View>

            {/* ── Action Buttons ── */}
            {candidate && !loading && (
                <View style={styles.actionRow}>
                    {/* Pass */}
                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            styles.actionBtnLarge,
                            {
                                backgroundColor: theme.error + "15",
                                borderColor: theme.error + "40",
                            },
                        ]}
                        onPress={() => handleButtonSwipe("pass")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={32} color={theme.error} />
                    </TouchableOpacity>

                    {/* Super Like */}
                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            {
                                backgroundColor: "#FFD700" + "15",
                                borderColor: "#FFD700" + "40",
                            },
                        ]}
                        onPress={() => handleButtonSwipe("super")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="star" size={24} color="#FFD700" />
                    </TouchableOpacity>

                    {/* Interested */}
                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            styles.actionBtnLarge,
                            {
                                backgroundColor: theme.success + "15",
                                borderColor: theme.success + "40",
                            },
                        ]}
                        onPress={() => handleButtonSwipe("interested")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="heart" size={32} color={theme.success} />
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Onboarding Modal ── */}
            {authToken && (
                <FounderMatchOnboarding
                    visible={showOnboarding}
                    onClose={() => setShowOnboarding(false)}
                    onComplete={handleOnboardingComplete}
                    token={authToken}
                />
            )}

            {/* ── Match Modal ── */}
            <Modal visible={showMatchModal} transparent animationType="none">
                <View style={styles.matchOverlay}>
                    <RNAnimated.View
                        style={[
                            styles.matchModal,
                            {
                                backgroundColor: theme.surface,
                                transform: [{ scale: matchScale }],
                                opacity: matchOpacity,
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[theme.brand.primary + "30", "transparent"]}
                            style={styles.matchGradient}
                        />
                        <View style={styles.matchContent}>
                            <Text style={styles.matchEmoji}>🎉</Text>
                            <Text style={[styles.matchTitle, { color: theme.text.primary }]}>
                                It's a Match!
                            </Text>
                            <Text style={[styles.matchSubtitle, { color: theme.text.secondary }]}>
                                You and this founder are both interested in collaborating!
                            </Text>
                            <View style={[styles.matchScoreBadge, { backgroundColor: theme.success + "15" }]}>
                                <Ionicons name="sparkles" size={20} color={theme.success} />
                                <Text style={[styles.matchScoreText, { color: theme.success }]}>
                                    {matchScore}% Compatible
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.matchBtn, { backgroundColor: theme.brand.primary }]}
                                onPress={dismissMatchModal}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.matchBtnText, { color: "#fff" }]}>
                                    Keep Swiping
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </RNAnimated.View>
                </View>
            </Modal>
        </GestureHandlerRootView>
    );
}

/* ================================================================= */
/*  Styles                                                            */
/* ================================================================= */

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* Header */
    header: {
        paddingTop: Platform.OS === "ios" ? 60 : 40,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xs,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        ...Typography.presets.h1,
    },
    headerSub: {
        ...Typography.presets.bodySmall,
        marginLeft: 36,
        marginTop: 2,
    },
    swipeCounter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Layout.radius.full,
    },
    swipeCountText: {
        ...Typography.presets.caption,
    },

    /* Filters */
    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: Spacing.sm,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Layout.radius.full,
        borderWidth: 1,
    },
    filterChipText: {
        ...Typography.presets.caption,
        fontWeight: "600",
    },

    /* Card area */
    cardArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
    },

    /* Loading */
    loadingContainer: {
        alignItems: "center",
        gap: 12,
    },
    loadingText: {
        ...Typography.presets.body,
    },

    /* Empty */
    emptyContainer: {
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
    },
    emptyIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        ...Typography.presets.h2,
        textAlign: "center",
        marginBottom: 8,
    },
    emptySubtitle: {
        ...Typography.presets.body,
        textAlign: "center",
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    ctaBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: Layout.radius.md,
    },
    ctaBtnText: {
        ...Typography.presets.body,
        fontWeight: "700",
    },

    /* Action buttons */
    actionRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        paddingBottom: Platform.OS === "ios" ? 110 : 90,
        paddingTop: Spacing.md,
    },
    actionBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        ...Layout.shadows.md,
    },
    actionBtnLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },

    /* Match modal */
    matchOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    matchModal: {
        width: "85%",
        borderRadius: Layout.radius.xxl,
        overflow: "hidden",
    },
    matchGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    matchContent: {
        alignItems: "center",
        padding: Spacing.xxl,
        paddingTop: Spacing.xxxl,
    },
    matchEmoji: {
        fontSize: 56,
        marginBottom: Spacing.md,
    },
    matchTitle: {
        ...Typography.presets.h1,
        marginBottom: 8,
    },
    matchSubtitle: {
        ...Typography.presets.body,
        textAlign: "center",
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    matchScoreBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: Layout.radius.full,
        marginBottom: Spacing.lg,
    },
    matchScoreText: {
        ...Typography.presets.body,
        fontWeight: "700",
    },
    matchBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: Layout.radius.md,
    },
    matchBtnText: {
        ...Typography.presets.body,
        fontWeight: "700",
    },
});
