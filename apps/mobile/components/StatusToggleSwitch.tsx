import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 18;
const KNOB_SIZE = 14;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - 4;

export default function StatusToggleSwitch({ value, onValueChange, disabled = false }: Props) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: value ? 1 : 0,
      friction: 10,
      tension: 88,
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, KNOB_TRAVEL],
  });

  const trackOn = "rgba(34,197,94,0.24)";
  const trackOff = "rgba(239,68,68,0.18)";

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      onPress={() => {
        if (!disabled) onValueChange(!value);
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.pressWrap, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: value ? trackOn : trackOff,
            borderColor: value ? "rgba(34,197,94,0.42)" : "rgba(239,68,68,0.35)",
          },
        ]}
      >
        <View style={styles.glassLayer} pointerEvents="none" />
        <Animated.View style={[styles.knobWrap, { transform: [{ translateX }] }]}>
          <View style={styles.knob} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressWrap: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    padding: 2,
    justifyContent: "center",
    overflow: "hidden",
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  knobWrap: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 0.75,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.6,
    elevation: 1.5,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
