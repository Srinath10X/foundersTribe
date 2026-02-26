import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MODES = ["light", "dark"] as const;
const OPTIONS: Record<(typeof MODES)[number], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  light: { label: "Light", icon: "sunny-outline" },
  dark: { label: "Dark", icon: "moon-outline" },
};
const PROFILE_FONTS = {
  regular: "Poppins_400Regular",
  medium: "Poppins_400Regular",
  semiBold: "Poppins_500Medium",
  bold: "Poppins_600SemiBold",
} as const;

const DISMISS_THRESHOLD = 80;
const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;

export default function AppearanceModal({ visible, onClose }: Props) {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 0 = fully off-screen / hidden, 1 = fully visible
  const progress = useRef(new Animated.Value(0)).current;
  // Extra drag offset on top of the presented position
  const dragY = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // ── Open ──
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      progress.setValue(0);
      dragY.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(progress, {
          toValue: 1,
          duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    if (modalVisible) {
      Animated.timing(progress, {
        toValue: 0,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        dragY.setValue(0);
        setModalVisible(false);
      });
    }
  }, [visible, modalVisible, progress, dragY]);

  const dismiss = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
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
            toValue: sheetHeight,
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

  const resolvedMode: "light" | "dark" =
    themeMode === "light" || themeMode === "dark" ? themeMode : isDark ? "dark" : "light";
  const sheetHeight = Math.max(280, Math.min(windowHeight * 0.52, windowHeight - insets.top - 24));

  const handleSelect = (mode: "light" | "dark") => {
    setThemeMode(mode);
    dismiss();
  };

  // ── Derived animations ──
  // Sheet slides up from bottom: SHEET_HEIGHT → 0
  const sheetBaseTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight + insets.bottom + 22, 0],
  });
  // Combine with drag offset
  const sheetTranslateY = Animated.add(sheetBaseTranslate, dragY);

  // Backdrop opacity: 0 → 0.4, also dims when dragging
  const backdropOpacity = Animated.multiply(
    progress,
    dragY.interpolate({
      inputRange: [0, sheetHeight],
      outputRange: [1, 0.2],
      extrapolate: "clamp",
    })
  ).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.46],
    extrapolate: "clamp",
  });

  const textColor = theme.text.primary;
  const subtextColor = theme.text.secondary;
  const handleColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const mutedSurface = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const closeBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";

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
              maxHeight: sheetHeight,
              marginBottom: Math.max(insets.bottom * 0.35, 8),
              paddingBottom: Math.max(insets.bottom + 6, 18),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: textColor }]}>Appearance</Text>
            <TouchableOpacity
              activeOpacity={0.84}
              style={[styles.closeBtn, { borderColor, backgroundColor: closeBg }]}
              onPress={dismiss}
            >
              <Ionicons name="close" size={16} color={subtextColor} />
            </TouchableOpacity>
          </View>

          <View style={[styles.optionsWrap, { borderColor }]}>
            {MODES.map((mode, index) => {
              const isSelected = resolvedMode === mode;
              const option = OPTIONS[mode];
              return (
                <TouchableOpacity
                  key={mode}
                  activeOpacity={0.85}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: "transparent",
                    },
                  ]}
                  onPress={() => handleSelect(mode)}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionIconWrap, { borderColor }]}>
                      <Ionicons name={option.icon} size={16} color={subtextColor} />
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected ? styles.optionLabelActive : styles.optionLabelInactive,
                        {
                          color: isSelected ? textColor : subtextColor,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={isSelected ? "#E23744" : subtextColor}
                  />
                  {index < MODES.length - 1 ? (
                    <View pointerEvents="none" style={styles.optionRowDivider} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingHorizontal: 20,
    marginHorizontal: 8,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 3,
  },
  headerRow: {
    marginTop: 2,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: PROFILE_FONTS.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsWrap: {
    // borderWidth: 1,
    // borderRadius: 14,
    // paddingHorizontal: 6,
    // paddingVertical: 4,
    // gap: 0,
  },
  optionRow: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 15.5,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  optionLabelActive: {
    fontFamily: PROFILE_FONTS.semiBold,
  },
  optionLabelInactive: {
    fontFamily: PROFILE_FONTS.medium,
  },
  optionRowDivider: {
    position: "absolute",
  },
});
