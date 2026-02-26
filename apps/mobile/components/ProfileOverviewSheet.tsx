import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

const DISMISS_THRESHOLD = 80;
const CLOSE_DURATION = 220;

export default function ProfileOverviewSheet({ visible, title, onClose, children }: Props) {
  const { theme, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const sheetHeight = Math.max(420, Math.min(windowHeight * 0.86, windowHeight - insets.top - 20));

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      progress.setValue(0);
      dragY.setValue(0);
      requestAnimationFrame(() => {
        Animated.spring(progress, {
          toValue: 1,
          friction: 9,
          tension: 72,
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
  }, [dragY, onClose, progress]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 0.5) {
          dismiss();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    }),
  ).current;

  const sheetBaseTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight + insets.bottom + 24, 0],
  });
  const sheetTranslateY = Animated.add(sheetBaseTranslate, dragY);
  const sheetScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
    extrapolate: "clamp",
  });
  const sheetOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
    extrapolate: "clamp",
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  const textColor = theme.text.primary;
  const subTextColor = theme.text.secondary;
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const handleColor = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.2)";
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
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />

        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={styles.dismissArea} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheetShell,
            {
              marginBottom: Math.max(insets.bottom * 0.35, 8),
              transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
              opacity: sheetOpacity,
            },
          ]}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.surface,
                borderColor,
                maxHeight: sheetHeight,
                paddingBottom: Math.max(insets.bottom, 8),
              },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: handleColor }]} />
            </View>

            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity
                activeOpacity={0.84}
                style={[styles.closeBtn, { borderColor, backgroundColor: closeBg }]}
                onPress={dismiss}
              >
                <Ionicons name="close" size={16} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.headerDivider, { backgroundColor: borderColor }]} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              {children}
            </ScrollView>
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
  sheetShell: {
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 24,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    overflow: "hidden",
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
    letterSpacing: 0.15,
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  body: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
});
