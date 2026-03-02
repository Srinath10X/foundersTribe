/**
 * FindCofounderTab – Top-anchored stacked swipe layout.
 *
 * Every card is position: absolute, anchored to the TOP of the container.
 * The front card sits slightly lower so that deeper cards peek out as a
 * thin strip at the TOP (8–12 % visible).  Deeper cards have lower zIndex
 * and sit *behind* the front card, shifted slightly upward + scaled down.
 *
 * Visual order (top → bottom on screen):
 *   thin strip of card 3  (lowest zIndex)
 *   thin strip of card 2
 *   full card 1            (highest zIndex, interactive)
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  LayoutChangeEvent,
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
  Easing,
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
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useCandidates, useSwipe } from "@/hooks/useFoundersMatching";
import type { FounderCandidate, MatchInfo } from "@/types/founders";

const { width: SCREEN_W } = Dimensions.get("window");

/* ── layout constants ────────────────────────────────── */
const CARD_W = SCREEN_W - 24;                      // tight horizontal margin (12 each side)
const VISIBLE_CARDS = 3;                            // number of cards in the stack
const PEEK_STRIP = 28;                              // px of each deeper card visible at top
const FRONT_TOP = PEEK_STRIP * (VISIBLE_CARDS - 1); // front card pushed down so back cards peek
const STACK_SCALE_STEP = 0.018;                     // subtle scale reduction per depth level
const CARD_HEIGHT_RATIO = 0.82;                     // card fills 82 % of measured container
const STACK_POSITIONS = [2, 1, 0] as const;

/* ── swipe physics ───────────────────────────────────── */
const SWIPE_THRESHOLD = SCREEN_W * 0.25;
const VELOCITY_THRESHOLD = 650;
const SNAP_SPRING = { damping: 18, stiffness: 200, mass: 0.7 };
const FLYOUT_DURATION_MS = 180;

/* ════════════════════════════════════════════════════════ */

export default function FindCofounderTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  /* ── container measurement ────────────────────────────── */
  const [containerH, setContainerH] = useState(0);
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContainerH(h);
  }, []);

  // Card height = 82 % of the measured container
  const cardH = containerH > 0 ? Math.round(containerH * CARD_HEIGHT_RATIO) : 0;

  /* ── data ────────────────────────────────────────────── */
  const {
    data: candidates,
    isLoading,
    isError,
    error,
    refetch,
  } = useCandidates();
  const swipeMutation = useSwipe();

  /* ── state ───────────────────────────────────────────── */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [frontTransformEnabled, setFrontTransformEnabled] = useState(true);
  const stableCandidatesRef = useRef<FounderCandidate[] | null>(null);
  const swipeCommitLockRef = useRef(false);

  const currentUserAvatar =
    (session?.user?.user_metadata?.photo_url as string) ||
    (session?.user?.user_metadata?.avatar_url as string) ||
    null;

  const activeCandidates = useMemo(() => {
    if (stableCandidatesRef.current) return stableCandidatesRef.current;
    if (candidates) {
      // Freeze ordering while swiping to prevent mid-session deck reshuffles.
      stableCandidatesRef.current = candidates;
      return candidates;
    }
    return [];
  }, [candidates]);

  // Keep a fixed 3-slot deck model so React doesn't reorder card nodes.
  const slotCandidates = useMemo(() => {
    return Array.from({ length: VISIBLE_CARDS }, (_, slot) => {
      return activeCandidates[currentIndex + slot] ?? null;
    });
  }, [activeCandidates, currentIndex]);

  /* ── animated values ─────────────────────────────────── */
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isSwipeAnimating = useSharedValue(false);

  const advanceCard = useCallback(() => {
    // Prevent the incoming front card from inheriting stale swipe transforms.
    setFrontTransformEnabled(false);
    setCurrentIndex((i) => i + 1);
    requestAnimationFrame(() => {
      // Reset after slot shift has rendered to avoid a one-frame snap-back.
      translateX.value = 0;
      translateY.value = 0;
      isSwipeAnimating.value = false;
      swipeCommitLockRef.current = false;
      setFrontTransformEnabled(true);
    });
  }, [translateX, translateY, isSwipeAnimating]);

  const completeSwipe = useCallback(
    (direction: "right" | "left") => {
      if (swipeCommitLockRef.current) return;
      swipeCommitLockRef.current = true;

      const current = activeCandidates[currentIndex];
      if (!current) {
        translateX.value = 0;
        translateY.value = 0;
        isSwipeAnimating.value = false;
        swipeCommitLockRef.current = false;
        return;
      }

      if (direction === "right") {
        // Show dialog immediately after a successful right swipe.
        setMatchInfo({
          matchId: null,
          matchedUser: current,
        });
      }

      swipeMutation.mutate(
        { swipedUserId: current.id, direction },
        {
          onSuccess: (res) => {
            if (direction !== "right" || !res?.matched) return;
            setMatchInfo({
              matchId: res.matchId ?? null,
              matchedUser: current,
            });
          },
        }
      );
      advanceCard();
    },
    [
      activeCandidates,
      currentIndex,
      swipeMutation,
      advanceCard,
      translateX,
      translateY,
      isSwipeAnimating,
      swipeCommitLockRef,
    ]
  );

  const triggerProgrammaticSwipe = useCallback(
    (direction: "right" | "left") => {
      if (isSwipeAnimating.value) return;
      isSwipeAnimating.value = true;

      const targetX = direction === "right" ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
      translateY.value = withTiming(0, { duration: FLYOUT_DURATION_MS });
      translateX.value = withTiming(
        targetX,
        {
          duration: FLYOUT_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(completeSwipe)(direction);
            return;
          }
          isSwipeAnimating.value = false;
        }
      );
    },
    [translateX, translateY, completeSwipe, isSwipeAnimating]
  );

  /* ── CTA handlers ────────────────────────────────────── */
  const handleViewProfile = useCallback(
    (candidate: FounderCandidate) => {
      router.push(
        `/freelancer-stack/founder-profile?id=${encodeURIComponent(candidate.id)}&compact=1`
      );
    },
    [router]
  );

  const handleConnect = useCallback(
    (_candidate: FounderCandidate) => {
      // Trigger a right-swipe programmatically via spring fly-out
      triggerProgrammaticSwipe("right");
    },
    [triggerProgrammaticSwipe]
  );

  /* ── pan gesture ─────────────────────────────────────── */
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(5)
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
          if (isSwipeAnimating.value) return;
          translateX.value = e.translationX;
          // gentle vertical drift that follows the drag direction
          translateY.value = e.translationY * 0.15;
        })
        .onEnd((e) => {
          if (isSwipeAnimating.value) return;

          const flyRight =
            e.translationX > SWIPE_THRESHOLD ||
            e.velocityX > VELOCITY_THRESHOLD;
          const flyLeft =
            e.translationX < -SWIPE_THRESHOLD ||
            e.velocityX < -VELOCITY_THRESHOLD;

          if (flyRight) {
            isSwipeAnimating.value = true;
            translateX.value = withTiming(
              SCREEN_W * 1.5,
              {
                duration: FLYOUT_DURATION_MS,
                easing: Easing.out(Easing.cubic),
              },
              (finished) => {
                if (finished) {
                  runOnJS(completeSwipe)("right");
                  return;
                }
                isSwipeAnimating.value = false;
              }
            );
            translateY.value = withTiming(e.translationY * 0.35, {
              duration: FLYOUT_DURATION_MS,
              easing: Easing.out(Easing.quad),
            });
          } else if (flyLeft) {
            isSwipeAnimating.value = true;
            translateX.value = withTiming(
              -SCREEN_W * 1.5,
              {
                duration: FLYOUT_DURATION_MS,
                easing: Easing.out(Easing.cubic),
              },
              (finished) => {
                if (finished) {
                  runOnJS(completeSwipe)("left");
                  return;
                }
                isSwipeAnimating.value = false;
              }
            );
            translateY.value = withTiming(e.translationY * 0.35, {
              duration: FLYOUT_DURATION_MS,
              easing: Easing.out(Easing.quad),
            });
          } else {
            translateX.value = withSpring(0, SNAP_SPRING);
            translateY.value = withSpring(0, SNAP_SPRING);
          }
        }),
    [completeSwipe, translateX, translateY, isSwipeAnimating]
  );
  const inertGesture0 = useMemo(() => Gesture.Pan().enabled(false), []);
  const inertGesture1 = useMemo(() => Gesture.Pan().enabled(false), []);
  const inertGesture2 = useMemo(() => Gesture.Pan().enabled(false), []);
  const inertGestures = useMemo(
    () => [inertGesture0, inertGesture1, inertGesture2],
    [inertGesture0, inertGesture1, inertGesture2]
  );

  /* ── animated styles (front card only) ─────────────── */
  const frontAnimStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W * 0.6, 0, SCREEN_W * 0.6],
      [-8, 0, 8],
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

  // Second card: springs downward (toward front position) as front card is swiped away
  const secondAnimStyle = useAnimatedStyle(() => {
    const drag = Math.abs(translateX.value);
    const progress = interpolate(drag, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    // Move down toward the front card's top offset
    const ty = interpolate(progress, [0, 1], [0, PEEK_STRIP * 0.7]);
    const scale = interpolate(
      progress,
      [0, 1],
      [1 - STACK_SCALE_STEP, 1]
    );
    return {
      transform: [{ translateY: ty }, { scale }],
      opacity: interpolate(progress, [0, 1], [0.88, 1]),
    };
  });

  // Third card: springs toward the second card's position
  const thirdAnimStyle = useAnimatedStyle(() => {
    const drag = Math.abs(translateX.value);
    const progress = interpolate(drag, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const ty = interpolate(progress, [0, 1], [0, PEEK_STRIP * 0.4]);
    const scale = interpolate(
      progress,
      [0, 1],
      [1 - STACK_SCALE_STEP * 2, 1 - STACK_SCALE_STEP]
    );
    return {
      transform: [{ translateY: ty }, { scale }],
      opacity: interpolate(progress, [0, 1], [0.65, 0.88]),
    };
  });

  const animStyles = [frontAnimStyle, secondAnimStyle, thirdAnimStyle];

  /* ── edge states ─────────────────────────────────────── */
  const noCandidates =
    !isLoading && !isError && currentIndex >= activeCandidates.length;

  /* ── render ──────────────────────────────────────────── */
  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.stackContainer} onLayout={onContainerLayout}>
        {containerH === 0 ? (
          /* Waiting for layout measurement */
          null
        ) : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.brand.primary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Finding founders...
            </Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              Something went wrong
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              {(error as any)?.message ?? "Check your connection and try again."}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.brand.primary }]}
              onPress={() => refetch()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : noCandidates ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              No more founders right now
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Check back later for new connections.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.brand.primary }]}
              onPress={() => {
                setCurrentIndex(0);
                stableCandidatesRef.current = null;
                refetch();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/*
              Render back-to-front so the front card (stackPos 0)
              paints last and sits visually on top.

              All cards anchored near top: 0.  The front card is offset
              down by FRONT_TOP so that deeper cards peek from above it.
              Deeper cards sit at progressively smaller top values.
            */}
            {STACK_POSITIONS.map((stackPos) => {
              const candidate = slotCandidates[stackPos];
              if (!candidate) return null;

              // stackPos: 0 = front, 1 = second, 2 = third
              const isFront = stackPos === 0;

              // Front card: top = FRONT_TOP (pushed down to reveal back cards above)
              // Deeper cards: top = FRONT_TOP - stackPos * PEEK_STRIP (tucked above)
              const topOffset = FRONT_TOP - stackPos * PEEK_STRIP;
              const canInteract = isFront && frontTransformEnabled;
              const gesture = canInteract
                ? panGesture
                : (inertGestures[stackPos] ?? inertGesture0);
              const cardAnimStyle = isFront
                ? (frontTransformEnabled ? frontAnimStyle : undefined)
                : animStyles[stackPos];

              return (
                <GestureDetector key={`slot-${stackPos}`} gesture={gesture}>
                  <Animated.View
                  style={[
                    styles.cardAbsolute,
                    {
                      top: topOffset,
                      zIndex: VISIBLE_CARDS - stackPos,
                    },
                    cardAnimStyle,
                  ]}
                  pointerEvents={canInteract ? "auto" : "none"}
                >
                  <FounderCard
                    candidate={candidate}
                    cardHeight={cardH}
                    cardWidth={CARD_W}
                    onViewProfile={isFront ? handleViewProfile : undefined}
                    onConnect={isFront ? handleConnect : undefined}
                  />
                  {isFront && frontTransformEnabled && (
                    <SwipeOverlay translateX={translateX} />
                  )}
                </Animated.View>
                </GestureDetector>
              );
            })}
          </>
        )}
      </View>

      {/* Match Modal */}
      <MatchModal
        visible={!!matchInfo}
        matchedUser={matchInfo?.matchedUser ?? null}
        currentUserAvatar={currentUserAvatar}
        matchId={matchInfo?.matchId ?? null}
        onChat={(threadId, matchedUser) => {
          setMatchInfo(null);
          const title = encodeURIComponent(
            matchedUser?.display_name || "Founder"
          );
          const avatar = encodeURIComponent(
            matchedUser?.photo_url || matchedUser?.avatar_url || ""
          );
          router.push(
            `/(role-pager)/(founder-tabs)/thread/${encodeURIComponent(threadId)}?threadKind=service&title=${title}&avatar=${avatar}`
          );
        }}
        onKeepSwiping={() => setMatchInfo(null)}
      />
    </GestureHandlerRootView>
  );
}

/* ── styles ──────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  /* Parent container: position relative, flex 1, anchored to top */
  stackContainer: {
    flex: 1,
    position: "relative",
    paddingTop: 6,
    paddingHorizontal: 0,
  },
  /* Each card is absolutely positioned; top set inline */
  cardAbsolute: {
    position: "absolute",
    left: (SCREEN_W - CARD_W) / 2, // centred horizontally
  },

  /* ── edge / empty states ── */
  center: {
    flex: 1,
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
});
