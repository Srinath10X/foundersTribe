import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

type StatusToggleSwitchProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 18;
const KNOB_SIZE = 12;
const KNOB_OFFSET = 2;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - KNOB_OFFSET * 2;

export default function StatusToggleSwitch({ value, onValueChange, style, disabled }: StatusToggleSwitchProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, KNOB_TRAVEL],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        pressed && !disabled ? styles.trackPressed : null,
        style,
      ]}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    padding: KNOB_OFFSET,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  trackOn: {
    borderColor: "rgba(74,222,128,0.62)",
    backgroundColor: "rgba(74,222,128,0.48)",
  },
  trackOff: {
    borderColor: "rgba(248,113,113,0.58)",
    backgroundColor: "rgba(248,113,113,0.38)",
  },
  trackPressed: {
    opacity: 0.9,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
});
