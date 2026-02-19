import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Typography, Spacing, Layout } from "../constants/DesignSystem";

interface Props {
  visible: boolean;
  onClose: () => void;
  onJoin?: () => void;
}

export default function MembershipGateModal({
  visible,
  onClose,
  onJoin,
}: Props) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Icon */}
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.brand.primary + "15" },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={32}
              color={theme.brand.primary}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text.primary }]}>
            Members Only
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.text.tertiary }]}>
            You need to join this tribe to view and send messages in its
            channels.
          </Text>

          {/* Buttons */}
          <View style={styles.actions}>
            {onJoin && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: theme.brand.primary },
                ]}
                onPress={onJoin}
                activeOpacity={0.8}
              >
                <Ionicons name="enter-outline" size={18} color={theme.text.inverse} />
                <Text style={[styles.primaryBtnText, { color: theme.text.inverse }]}>
                  Join Tribe
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { borderColor: theme.border },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.text.secondary }]}>
                {onJoin ? "Cancel" : "Go Back"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    width: "85%",
    borderRadius: Layout.radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.presets.h2,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.presets.body,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  actions: {
    width: "100%",
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Layout.radius.md,
  },
  primaryBtnText: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm + 2,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
  },
  secondaryBtnText: {
    ...Typography.presets.body,
    fontWeight: "600",
  },
});
