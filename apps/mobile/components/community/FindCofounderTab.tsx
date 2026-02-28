/**
 * FindCofounderTab – Tinder-style swipe experience for founder matching.
 * Replaces the previous "Coming Soon" placeholder.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
} from "react-native-reanimated";

import { FounderCard } from "@/components/founders/FounderCard";
import { MatchModal } from "@/components/founders/MatchModal";
import { SwipeOverlay } from "@/components/founders/SwipeOverlay";
import { BAR_HEIGHT, BAR_BOTTOM } from "@/components/CustomTabBar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useCandidates, useSwipe } from "@/hooks/useFoundersMatching";
import type { FounderCandidate, MatchInfo } from "@/types/founders";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const VELOCITY_THRESHOLD = 800;
const FLY_DURATION = 380;
// Snap-back: snappy but not jarring
const SNAP_SPRING = { damping: 20, stiffness: 260, mass: 0.85 };

export default function FindCofounderTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  // ─── Data ──────────────────────────────────────────────
  const { data: candidates, isLoading, isError, error, refetch } = useCandidates();
  const swipeMutation = useSwipe();

  // ─── State ─────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

  const currentCandidate: FounderCandidate | undefined =
    candidates?.[currentIndex];
  const nextCandidate: FounderCandidate | undefined =
    candidates?.[currentIndex + 1];

  const currentUserAvatar =
    (session?.user?.user_metadata?.photo_url as string) ||
    (session?.user?.user_metadata?.avatar_url as string) ||
    null;

  // ─── Animated values ──────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const advanceCard = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const handleSwipe = useCallback(
    (direction: "right" | "left") => {
      if (!currentCandidate) return;

      swipeMutation.mutate(
        { swipedUserId: currentCandidate.id, direction },
        {
          onSuccess: (response) => {
            if (response.matched && response.matchId) {
              setMatchInfo({
                matchId: response.matchId,
                matchedUser: currentCandidate,
              });
            }
          },
        }
      );

      advanceCard();
    },
    [currentCandidate, swipeMutation, advanceCard]
  );

  // ─── Pan Gesture ──────────────────────────────────────
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .onUpdate((e) => {
          translateX.value = e.translationX;
          // Slight lift as you drag — feels physical
          translateY.value = e.translationY * 0.35;
        })
        .onEnd((e) => {
          const shouldFlyRight =
            e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD;
          const shouldFlyLeft =
            e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD;

          if (shouldFlyRight) {
            // Arc out top-right
            translateX.value = withTiming(SCREEN_W * 1.6, { duration: FLY_DURATION });
            translateY.value = withTiming(-SCREEN_H * 0.12, { duration: FLY_DURATION });
            runOnJS(handleSwipe)("right");
          } else if (shouldFlyLeft) {
            // Arc out top-left
            translateX.value = withTiming(-SCREEN_W * 1.6, { duration: FLY_DURATION });
            translateY.value = withTiming(-SCREEN_H * 0.12, { duration: FLY_DURATION });
            runOnJS(handleSwipe)("left");
          } else {
            // Snap back with a satisfying spring
            translateX.value = withSpring(0, SNAP_SPRING);
            translateY.value = withSpring(0, SNAP_SPRING);
          }
        }),
    [handleSwipe, translateX, translateY]
  );

  // ─── Animated styles ──────────────────────────────────
  const frontCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W * 0.6, 0, SCREEN_W * 0.6],
      [-18, 0, 18],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const backCardStyle = useAnimatedStyle(() => {
    const drag = Math.abs(translateX.value);
    const scale = interpolate(drag, [0, SWIPE_THRESHOLD], [0.93, 1], Extrapolation.CLAMP);
    const opacity = interpolate(drag, [0, SWIPE_THRESHOLD * 0.5], [0.55, 1], Extrapolation.CLAMP);
    // Back card rises up slightly as front card leaves
    const ty = interpolate(drag, [0, SWIPE_THRESHOLD], [16, 0], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY: ty }], opacity };
  });

  // ─── Button handlers ──────────────────────────────────
  const handlePassButton = useCallback(() => {
    if (!currentCandidate) return;
    translateX.value = withTiming(-SCREEN_W * 1.6, { duration: FLY_DURATION });
    translateY.value = withTiming(-SCREEN_H * 0.12, { duration: FLY_DURATION });
    handleSwipe("left");
  }, [currentCandidate, handleSwipe, translateX, translateY]);

  const handleConnectButton = useCallback(() => {
    if (!currentCandidate) return;
    translateX.value = withTiming(SCREEN_W * 1.6, { duration: FLY_DURATION });
    translateY.value = withTiming(-SCREEN_H * 0.12, { duration: FLY_DURATION });
    handleSwipe("right");
  }, [currentCandidate, handleSwipe, translateX, translateY]);

  // ─── Edge states ──────────────────────────────────────
  const noCandidates =
    !isLoading &&
    !isError &&
    (!candidates || currentIndex >= candidates.length);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Card Stack */}
      <View style={styles.stackContainer}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.brand.primary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Finding founders…
            </Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={theme.text.tertiary}
            />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              Something went wrong
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              {(error as any)?.message ?? "Check your connection and try again."}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryBtn,
                { backgroundColor: theme.brand.primary },
              ]}
              onPress={() => refetch()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : noCandidates ? (
          <View style={styles.center}>
            <Ionicons
              name="people-outline"
              size={48}
              color={theme.text.tertiary}
            />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              No more founders right now
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Check back later for new matches.
            </Text>
            <TouchableOpacity
              style={[
                styles.retryBtn,
                { backgroundColor: theme.brand.primary },
              ]}
              onPress={() => {
                setCurrentIndex(0);
                refetch();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Back card (next candidate) */}
            {nextCandidate && (
              <Animated.View
                style={[styles.cardAbsolute, backCardStyle]}
                pointerEvents="none"
                renderToHardwareTextureAndroid
                shouldRasterizeIOS
              >
                <FounderCard candidate={nextCandidate} />
              </Animated.View>
            )}

            {/* Front card (current candidate) */}
            {currentCandidate && (
              <GestureDetector gesture={panGesture}>
                <Animated.View
                  style={[styles.cardAbsolute, frontCardStyle]}
                  renderToHardwareTextureAndroid
                  shouldRasterizeIOS
                >
                  <FounderCard candidate={currentCandidate} />
                  <SwipeOverlay translateX={translateX} />
                </Animated.View>
              </GestureDetector>
            )}
          </>
        )}
      </View>

      {/* Action Buttons */}
      {currentCandidate && !isLoading && !isError && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.passBtn}
            onPress={handlePassButton}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FF3B30" />
            <Text style={styles.passBtnText}>Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.connectBtn}
            onPress={handleConnectButton}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={styles.connectBtnText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Match Modal */}
      <MatchModal
        visible={!!matchInfo}
        matchedUser={matchInfo?.matchedUser ?? null}
        currentUserAvatar={currentUserAvatar}
        matchId={matchInfo?.matchId ?? null}
        onChat={(id) => {
          setMatchInfo(null);
          router.push(`/freelancer-stack/contract-chat?id=${id}`);
        }}
        onKeepSwiping={() => setMatchInfo(null)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    overflow: "hidden",
  },
  cardAbsolute: {
    position: "absolute",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
    marginTop: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: BAR_HEIGHT + BAR_BOTTOM + 10,
  },
  passBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,59,48,0.35)",
    backgroundColor: "rgba(255,59,48,0.08)",
  },
  passBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#FF3B30",
  },
  connectBtn: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
  },
  connectBtnText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
});
