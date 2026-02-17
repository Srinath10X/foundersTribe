import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Typography, Spacing, Layout } from "../constants/DesignSystem";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    isPublic: boolean,
  ) => Promise<void>;
}

export default function CreateTribeModal({ visible, onClose, onCreate }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim(), description.trim(), isPublic);
      setName("");
      setDescription("");
      setIsPublic(true);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create tribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View
              style={[styles.handle, { backgroundColor: theme.border }]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>
              Create Tribe
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={[styles.label, { color: theme.text.secondary }]}>
            Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text.primary,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            placeholder="e.g. Web3 Founders"
            placeholderTextColor={theme.text.muted}
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoFocus
          />

          {/* Description */}
          <Text style={[styles.label, { color: theme.text.secondary }]}>
            Description
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                color: theme.text.primary,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            placeholder="What is this tribe about?"
            placeholderTextColor={theme.text.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={1000}
          />

          {/* Public toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: theme.text.primary }]}>
                Public tribe
              </Text>
              <Text
                style={[styles.toggleSub, { color: theme.text.tertiary }]}
              >
                Anyone can discover and join
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{
                false: theme.border,
                true: theme.brand.primary + "80",
              }}
              thumbColor={isPublic ? theme.brand.primary : theme.text.muted}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>
              {error}
            </Text>
          ) : null}

          {/* Action */}
          <TouchableOpacity
            style={[
              styles.createBtn,
              {
                backgroundColor: theme.brand.primary,
                opacity: name.trim() ? 1 : 0.4,
              },
            ]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.text.inverse} />
            ) : (
              <Text
                style={[styles.createText, { color: theme.text.inverse }]}
              >
                Create Tribe
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing.xl,
  },
  handleBar: { alignItems: "center", marginBottom: Spacing.sm },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.presets.h2 },
  label: {
    ...Typography.presets.caption,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    padding: Spacing.sm,
    ...Typography.presets.body,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  toggleLabel: { ...Typography.presets.body, fontWeight: "600" },
  toggleSub: { ...Typography.presets.caption },
  errorText: {
    ...Typography.presets.bodySmall,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  createBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Layout.radius.md,
    alignItems: "center",
  },
  createText: { ...Typography.presets.body, fontWeight: "600" },
});
