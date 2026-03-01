/**
 * SwipeOverlay – Full-card colour wash on swipe.
 *
 * Swiping RIGHT → green tinted overlay + "CONNECT" label
 * Swiping LEFT  → red tinted overlay  + "PASS" label
 *
 * The overlay covers the entire card (position: absolute, inset 0)
 * and fades in proportionally to the drag distance.  A bold centred
 * label scales up from 0.5 → 1 for a punchy feel.
 *
 * Sits as a sibling of FounderCard inside the Animated.View wrapper,
 * so it inherits the card's border-radius via overflow: hidden on the
 * parent.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

interface SwipeOverlayProps {
  translateX: SharedValue<number>;
}

const DRAG_RANGE = 140; // px of drag for full opacity

function SwipeOverlayInner({ translateX }: SwipeOverlayProps) {
  /* ── green overlay (swipe right → CONNECT) ── */
  const connectOverlayStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, DRAG_RANGE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: progress * 0.55 };
  });

  const connectLabelStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, DRAG_RANGE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  /* ── red overlay (swipe left → PASS) ── */
  const passOverlayStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, -DRAG_RANGE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: progress * 0.55 };
  });

  const passLabelStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, -DRAG_RANGE],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <>
      {/* ── GREEN wash ── */}
      <Animated.View
        style={[styles.overlay, styles.connectOverlay, connectOverlayStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.labelWrap, connectLabelStyle]}
        pointerEvents="none"
      >
        <View style={styles.connectLabelBox}>
          <Ionicons name="checkmark-circle" size={32} color="#fff" />
          <Text style={styles.labelText}>CONNECT</Text>
        </View>
      </Animated.View>

      {/* ── RED wash ── */}
      <Animated.View
        style={[styles.overlay, styles.passOverlay, passOverlayStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.labelWrap, passLabelStyle]}
        pointerEvents="none"
      >
        <View style={styles.passLabelBox}>
          <Ionicons name="close-circle" size={32} color="#fff" />
          <Text style={styles.labelText}>PASS</Text>
        </View>
      </Animated.View>
    </>
  );
}

export const SwipeOverlay = React.memo(SwipeOverlayInner);

const styles = StyleSheet.create({
  /* Full-card colour wash */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    zIndex: 8,
  },
  connectOverlay: {
    backgroundColor: "#22C55E", // green-500
  },
  passOverlay: {
    backgroundColor: "#EF4444", // red-500
  },

  /* Centred label container */
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9,
  },
  connectLabelBox: {
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.85)",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
  },
  passLabelBox: {
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.85)",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: 3,
  },
});
