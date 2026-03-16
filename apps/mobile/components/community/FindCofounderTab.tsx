/**
 * FindCofounderTab – Top-anchored stacked swipe layout.
 * Each card maintains its own local swipe physics and gestures!
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
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
const CARD_W = SCREEN_W - 32;
const VISIBLE_CARDS = 3;
const PEEK_STRIP = 0;
const FRONT_TOP = 0;
const STACK_SCALE_STEP = 0;
const CARD_HEIGHT_RATIO = 0.9;

/* ── swipe physics ───────────────────────────────────── */
const SWIPE_THRESHOLD = SCREEN_W * 0.25;
const VELOCITY_THRESHOLD = 650;
const SNAP_SPRING = { damping: 18, stiffness: 200, mass: 0.7 };
const FLYOUT_DURATION_MS = 180;

/* ════════════════════════════════════════════════════════ */

// Subcomponent that manages its own Gesture state for consecutive swiping stability.
export interface SwipeableCardRef {
  flyOut: (direction: "left" | "right") => void;
}

interface SwipeableCardProps {
  candidate: FounderCandidate;
  cardH: number;
  isFront: boolean;
  indexOffset: number; // 0 for front, 1 for second, etc.
  onSwipeComplete: (direction: "left" | "right", candidate: FounderCandidate) => void;
  onViewProfile: (candidate: FounderCandidate) => void;
  onConnect: (candidate: FounderCandidate) => void;
  onPass: (candidate: FounderCandidate) => void;
  onMessage: (candidate: FounderCandidate) => void;
}

const SwipeableCardItem = forwardRef<SwipeableCardRef, SwipeableCardProps>(({ candidate, cardH, isFront, indexOffset, onSwipeComplete, onViewProfile, onConnect, onPass, onMessage }, ref) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const complete = useCallback((dir: "left" | "right") => {
    onSwipeComplete(dir, candidate);
  }, [onSwipeComplete, candidate]);

  const triggerFlyOut = useCallback((direction: "left" | "right") => {
    if (isAnimating.value) return;
    isAnimating.value = true;
    const targetX = direction === "right" ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;

    translateX.value = withTiming(targetX, { duration: FLYOUT_DURATION_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(complete)(direction);
    });
    translateY.value = withTiming(0, { duration: FLYOUT_DURATION_MS });
  }, [translateX, translateY, complete, isAnimating]);

  useImperativeHandle(ref, () => ({
    flyOut: triggerFlyOut
  }));

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .enabled(isFront) // strict check so only front card handles pan
      .minDistance(5)
      .activeOffsetX([-10, 10])
      .onUpdate((e) => {
        if (isAnimating.value) return;
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.15;
      })
      .onEnd((e) => {
        if (isAnimating.value) return;
        const flyRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD;
        const flyLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD;

        if (flyRight) {
          isAnimating.value = true;
          translateX.value = withTiming(SCREEN_W * 1.5, { duration: FLYOUT_DURATION_MS, easing: Easing.out(Easing.cubic) }, (f) => {
            if (f) runOnJS(complete)("right");
          });
          translateY.value = withTiming(e.translationY * 0.35, { duration: FLYOUT_DURATION_MS, easing: Easing.out(Easing.quad) });
        } else if (flyLeft) {
          isAnimating.value = true;
          translateX.value = withTiming(-SCREEN_W * 1.5, { duration: FLYOUT_DURATION_MS, easing: Easing.out(Easing.cubic) }, (f) => {
            if (f) runOnJS(complete)("left");
          });
          translateY.value = withTiming(e.translationY * 0.35, { duration: FLYOUT_DURATION_MS, easing: Easing.out(Easing.quad) });
        } else {
          translateX.value = withSpring(0, SNAP_SPRING);
          translateY.value = withSpring(0, SNAP_SPRING);
        }
      })
    , [isFront, complete, translateX, translateY, isAnimating]);

  const animStyle = useAnimatedStyle(() => {
    // If front card
    if (isFront) {
      const rotate = interpolate(translateX.value, [-SCREEN_W * 0.6, 0, SCREEN_W * 0.6], [-8, 0, 8], Extrapolation.CLAMP);
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${rotate}deg` }
        ],
        opacity: withTiming(1, { duration: 150 })
      };
    }
    // For back cards, smooth transition of height and depth using spring and index offsets
    const targetScale = 1 - indexOffset * STACK_SCALE_STEP;
    const targetY = FRONT_TOP - indexOffset * PEEK_STRIP;
    return {
      transform: [
        { scale: withSpring(targetScale, SNAP_SPRING) },
        { translateY: withSpring(targetY, SNAP_SPRING) },
        { translateX: 0 } // force reset behind stack
      ],
      opacity: 0 // Hiding cards behind to prevent varying heights from peeking out!
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.cardAbsolute,
          { zIndex: 10 - indexOffset },
          animStyle
        ]}
        pointerEvents={isFront ? "auto" : "none"}
      >
        <FounderCard
          candidate={candidate}
          cardHeight={cardH}
          cardWidth={CARD_W}
          onViewProfile={isFront ? () => onViewProfile(candidate) : undefined}
          onConnect={isFront ? () => onConnect(candidate) : undefined}
          onPass={isFront ? () => onPass(candidate) : undefined}
          onMessage={isFront ? () => onMessage(candidate) : undefined}
        />
        {isFront && <SwipeOverlay translateX={translateX} />}
      </Animated.View>
    </GestureDetector>
  );
});

SwipeableCardItem.displayName = "SwipeableCardItem";

export default function FindCofounderTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserAvatar =
    (session?.user?.user_metadata?.photo_url as string) ||
    (session?.user?.user_metadata?.avatar_url as string) ||
    null;

  const [containerH, setContainerH] = useState(0);
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContainerH(h);
  }, []);
  const cardH = containerH > 0 ? Math.round(containerH * CARD_HEIGHT_RATIO) : 0;

  const { data: candidates, isLoading, isError, error, refetch } = useCandidates();
  const swipeMutation = useSwipe();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

  const activeCandidates = candidates || [];
  const noCandidates = !isLoading && !isError && currentIndex >= activeCandidates.length;

  const frontCardRef = useRef<SwipeableCardRef>(null);

  const handleSwipeComplete = useCallback((direction: "left" | "right", candidate: FounderCandidate) => {
    // Record Swipe API call
    swipeMutation.mutate(
      { swipedUserId: candidate.id, direction },
      {
        onSuccess: (res) => {
          if (direction === "right" && res?.matched) {
            setMatchInfo({ matchId: res.matchId ?? null, matchedUser: candidate });
          }
        }
      }
    );

    // Right swipe dialogue immediately 
    if (direction === "right") {
      setMatchInfo({ matchId: null, matchedUser: candidate });
    }

    setCurrentIndex((prev) => prev + 1);
  }, [swipeMutation]);

  const handleViewProfile = useCallback((candidate: FounderCandidate) => {
    router.push({
      pathname: "/(role-pager)/(founder-tabs)/founder-profile" as any,
      params: { id: candidate.id, compact: "1" },
    });
  }, [router]);

  const handleConnect = useCallback((candidate: FounderCandidate) => {
    frontCardRef.current?.flyOut("right");
  }, []);

  const handlePass = useCallback((candidate: FounderCandidate) => {
    frontCardRef.current?.flyOut("left");
  }, []);

  const handleMessage = useCallback((candidate: FounderCandidate) => {
    setMatchInfo({ matchId: null, matchedUser: candidate });
  }, []);

  const renderCards = () => {
    return activeCandidates
      .slice(currentIndex, currentIndex + VISIBLE_CARDS)
      .map((candidate, idx) => {
        const isFront = idx === 0;
        return (
          <SwipeableCardItem
            key={candidate.id}
            ref={isFront ? frontCardRef : null}
            candidate={candidate}
            cardH={cardH}
            isFront={isFront}
            indexOffset={idx}
            onSwipeComplete={handleSwipeComplete}
            onViewProfile={handleViewProfile}
            onConnect={handleConnect}
            onPass={handlePass}
            onMessage={handleMessage}
          />
        );
      })
      .reverse(); // paint deepest first so front is visually on top
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.stackContainer} onLayout={onContainerLayout}>
        {containerH === 0 ? null : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.brand.primary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>Finding founders...</Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Something went wrong</Text>
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>{(error as any)?.message ?? "Check your connection and try again."}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.brand.primary }]} onPress={() => refetch()} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : noCandidates ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No more founders right now</Text>
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>Check back later for new connections.</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.brand.primary }]}
              onPress={() => { setCurrentIndex(0); refetch(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          renderCards()
        )}
      </View>
      <MatchModal
        visible={!!matchInfo}
        matchedUser={matchInfo?.matchedUser ?? null}
        currentUserAvatar={currentUserAvatar}
        matchId={matchInfo?.matchId ?? null}
        onChat={(threadId, matchedUser) => {
          setMatchInfo(null);
          const title = encodeURIComponent(matchedUser?.display_name || "Founder");
          const avatar = encodeURIComponent(matchedUser?.photo_url || matchedUser?.avatar_url || "");
          router.push(`/(role-pager)/(founder-tabs)/thread/${encodeURIComponent(threadId)}?threadKind=service&title=${title}&avatar=${avatar}`);
        }}
        onKeepSwiping={() => setMatchInfo(null)}
        onUndo={() => {
          setMatchInfo(null);
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stackContainer: { flex: 1, position: "relative", alignItems: "center", justifyContent: "center" },
  cardAbsolute: { position: "absolute" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", textAlign: "center", marginTop: 6 },
  emptyText: { fontSize: 13, fontFamily: "Poppins_400Regular", textAlign: "center", lineHeight: 19 },
  retryBtn: { marginTop: 10, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryBtnText: { color: "#fff", fontSize: 14, fontFamily: "Poppins_600SemiBold" },
});
