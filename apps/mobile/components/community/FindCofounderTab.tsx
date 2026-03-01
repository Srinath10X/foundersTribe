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
import React, { useCallback, useMemo, useState } from "react";
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
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

/* ── swipe physics ───────────────────────────────────── */
const SWIPE_THRESHOLD = SCREEN_W * 0.25;
const VELOCITY_THRESHOLD = 650;
const SNAP_SPRING = { damping: 18, stiffness: 200, mass: 0.7 };
const FLYOUT_SPRING = { damping: 28, stiffness: 120, mass: 0.9 }; // smooth arc, not linear

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
  const [creatingChat, setCreatingChat] = useState(false);

  const currentUserAvatar =
    (session?.user?.user_metadata?.photo_url as string) ||
    (session?.user?.user_metadata?.avatar_url as string) ||
    null;

  // Slice the next VISIBLE_CARDS candidates from the current position
  const visibleCandidates = useMemo(() => {
    if (!candidates) return [];
    return candidates.slice(currentIndex, currentIndex + VISIBLE_CARDS);
  }, [candidates, currentIndex]);

  /* ── animated values ─────────────────────────────────── */
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const advanceCard = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const handleSwipe = useCallback(
    (direction: "right" | "left") => {
      const current = candidates?.[currentIndex];
      if (!current || creatingChat) return;

      swipeMutation.mutate(
        { swipedUserId: current.id, direction },
        {
          onSuccess: (result) => {
            if (direction === "right" && result.matched) {
              setMatchInfo({
                matchId: result.matchId ?? null,
                matchedUser: current,
              });
            }
          },
        }
      );
      advanceCard();
    },
    [candidates, currentIndex, swipeMutation, advanceCard, creatingChat]
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
      translateX.value = withSpring(SCREEN_W * 1.5, {
        ...FLYOUT_SPRING,
        velocity: 800,
      });
      translateY.value = withSpring(0, FLYOUT_SPRING);
      handleSwipe("right");
    },
    [translateX, translateY, handleSwipe]
  );

  /* ── pan gesture ─────────────────────────────────────── */
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(5)
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
          translateX.value = e.translationX;
          // gentle vertical drift that follows the drag direction
          translateY.value = e.translationY * 0.15;
        })
        .onEnd((e) => {
          const flyRight =
            e.translationX > SWIPE_THRESHOLD ||
            e.velocityX > VELOCITY_THRESHOLD;
          const flyLeft =
            e.translationX < -SWIPE_THRESHOLD ||
            e.velocityX < -VELOCITY_THRESHOLD;

          if (flyRight) {
            // spring-based fly-out with velocity for natural arc
            translateX.value = withSpring(SCREEN_W * 1.5, {
              ...FLYOUT_SPRING,
              velocity: e.velocityX,
            });
            translateY.value = withSpring(e.translationY * 0.4, {
              ...FLYOUT_SPRING,
              velocity: e.velocityY * 0.3,
            });
            runOnJS(handleSwipe)("right");
          } else if (flyLeft) {
            translateX.value = withSpring(-SCREEN_W * 1.5, {
              ...FLYOUT_SPRING,
              velocity: e.velocityX,
            });
            translateY.value = withSpring(e.translationY * 0.4, {
              ...FLYOUT_SPRING,
              velocity: e.velocityY * 0.3,
            });
            runOnJS(handleSwipe)("left");
          } else {
            translateX.value = withSpring(0, SNAP_SPRING);
            translateY.value = withSpring(0, SNAP_SPRING);
          }
        }),
    [handleSwipe, translateX, translateY]
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
    !isLoading && !isError && (!candidates || currentIndex >= candidates.length);

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
            {[...visibleCandidates].reverse().map((candidate, reverseIdx) => {
              // stackPos: 0 = front, 1 = second, 2 = third
              const stackPos = visibleCandidates.length - 1 - reverseIdx;
              const isFront = stackPos === 0;

              // Front card: top = FRONT_TOP (pushed down to reveal back cards above)
              // Deeper cards: top = FRONT_TOP - stackPos * PEEK_STRIP (tucked above)
              const topOffset = FRONT_TOP - stackPos * PEEK_STRIP;

              const cardView = (
                <Animated.View
                  key={candidate.id}
                  style={[
                    styles.cardAbsolute,
                    {
                      top: topOffset,
                      zIndex: VISIBLE_CARDS - stackPos,
                    },
                    animStyles[stackPos],
                  ]}
                  pointerEvents={isFront ? "auto" : "none"}
                  renderToHardwareTextureAndroid
                  shouldRasterizeIOS
                >
                  <FounderCard
                    candidate={candidate}
                    cardHeight={cardH}
                    cardWidth={CARD_W}
                    onViewProfile={isFront ? handleViewProfile : undefined}
                    onConnect={isFront ? handleConnect : undefined}
                  />
                  {isFront && <SwipeOverlay translateX={translateX} />}
                </Animated.View>
              );

              return isFront ? (
                <GestureDetector key={candidate.id} gesture={panGesture}>
                  {cardView}
                </GestureDetector>
              ) : (
                cardView
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
