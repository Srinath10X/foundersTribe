import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MODES = ["system", "light", "dark"] as const;
const LABELS: Record<(typeof MODES)[number], string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const SHEET_HEIGHT = 300;
const DISMISS_THRESHOLD = 80;
const ANIM_DURATION = 250;

export default function AppearanceModal({ visible, onClose }: Props) {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  // 0 = fully off-screen / hidden, 1 = fully visible
  const progress = useRef(new Animated.Value(0)).current;
  // Extra drag offset on top of the presented position
  const dragY = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // ── Open ──
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // small delay so Modal mounts before we animate
      requestAnimationFrame(() => {
        Animated.timing(progress, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // close is handled by dismiss(), but in case visible is
      // toggled externally, just hide immediately
      progress.setValue(0);
      dragY.setValue(0);
      setModalVisible(false);
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      setModalVisible(false);
      onClose();
    });
  }, [onClose, progress, dragY]);

  // ── Pan ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 0.5) {
          // Animate drag to full sheet height, then dismiss
          Animated.timing(dragY, {
            toValue: SHEET_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            progress.setValue(0);
            setModalVisible(false);
            onClose();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleSelect = (mode: "system" | "light" | "dark") => {
    setThemeMode(mode);
    dismiss();
  };

  // ── Derived animations ──
  // Sheet slides up from bottom: SHEET_HEIGHT → 0
  const sheetBaseTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });
  // Combine with drag offset
  const sheetTranslateY = Animated.add(sheetBaseTranslate, dragY);

  // Backdrop opacity: 0 → 0.4, also dims when dragging
  const backdropOpacity = Animated.multiply(
    progress,
    dragY.interpolate({
      inputRange: [0, SHEET_HEIGHT],
      outputRange: [1, 0.2],
      extrapolate: "clamp",
    })
  ).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
    extrapolate: "clamp",
  });

  const textColor = theme.text.primary;
  const subtextColor = theme.text.secondary;
  const dividerColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const handleColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.container}>
        {/* Full-screen backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />

        {/* Tap-to-dismiss area */}
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={styles.dismissArea} />
        </TouchableWithoutFeedback>

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textColor }]}>Appearance</Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Radio options */}
          {MODES.map((mode, index) => {
            const isSelected = themeMode === mode;
            const isLast = index === MODES.length - 1;
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.7}
                style={[
                  styles.row,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: dividerColor,
                  },
                ]}
                onPress={() => handleSelect(mode)}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color: isSelected ? textColor : subtextColor,
                      fontWeight: isSelected ? "600" : "400",
                    },
                  ]}
                >
                  {LABELS[mode]}
                </Text>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected
                        ? "#E23744"
                        : isDark
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(0,0,0,0.2)",
                    },
                  ]}
                >
                  {isSelected && <View style={styles.radioFill} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Cancel */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.cancelBtn}
            onPress={dismiss}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  label: {
    fontSize: 15,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E23744",
  },
  cancelBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E23744",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
