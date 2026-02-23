import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Typography, Spacing, Layout } from "../constants/DesignSystem";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    isPublic: boolean,
    avatarUrl?: string,
    coverUrl?: string,
  ) => Promise<void>;
}

export default function CreateTribeModal({ visible, onClose, onCreate }: Props) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id || "";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatarPath, setAvatarPath] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"" | "avatar" | "cover">("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onCreate(
        name.trim(),
        description.trim(),
        isPublic,
        avatarPath || undefined,
        coverPath || undefined,
      );
      setName("");
      setDescription("");
      setIsPublic(true);
      setAvatarPath("");
      setCoverPath("");
      setAvatarPreview("");
      setCoverPreview("");
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create tribe");
    } finally {
      setLoading(false);
    }
  };

  const pickImageAndUpload = async (target: "avatar" | "cover") => {
    if (!userId) {
      Alert.alert("Error", "Please login again.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: target === "cover" ? [16, 9] : [1, 1],
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const localUri = result.assets[0].uri;
    setUploading(target);
    try {
      const ext = localUri.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
      const filePath = `tribes/${userId}/drafts/${target}-${Date.now()}.${ext}`;

      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("tribe-media")
        .upload(filePath, arrayBuffer, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: signError } = await supabase.storage
        .from("tribe-media")
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      const signed = !signError && data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : "";

      if (target === "avatar") {
        setAvatarPath(filePath);
        setAvatarPreview(signed);
      } else {
        setCoverPath(filePath);
        setCoverPreview(signed);
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not upload image");
    } finally {
      setUploading("");
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

          <Text style={[styles.label, { color: theme.text.secondary }]}>
            Tribe photo
          </Text>
          <TouchableOpacity
            style={[styles.mediaPicker, { borderColor: theme.border, backgroundColor: theme.background }]}
            onPress={() => pickImageAndUpload("avatar")}
            activeOpacity={0.85}
            disabled={uploading === "avatar"}
          >
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} style={styles.avatarPreview} />
            ) : (
              <Ionicons name="image-outline" size={20} color={theme.text.muted} />
            )}
            <Text style={[styles.mediaText, { color: theme.text.primary }]}>
              {uploading === "avatar" ? "Uploading..." : "Upload tribe photo"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.text.secondary }]}>
            Background photo
          </Text>
          <TouchableOpacity
            style={[styles.mediaPicker, { borderColor: theme.border, backgroundColor: theme.background }]}
            onPress={() => pickImageAndUpload("cover")}
            activeOpacity={0.85}
            disabled={uploading === "cover"}
          >
            {coverPreview ? (
              <Image source={{ uri: coverPreview }} style={styles.coverPreview} />
            ) : (
              <Ionicons name="images-outline" size={20} color={theme.text.muted} />
            )}
            <Text style={[styles.mediaText, { color: theme.text.primary }]}>
              {uploading === "cover" ? "Uploading..." : "Upload background photo"}
            </Text>
          </TouchableOpacity>

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
  mediaPicker: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    padding: Spacing.sm,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mediaText: {
    ...Typography.presets.bodySmall,
    fontFamily: "Poppins_500Medium",
  },
  avatarPreview: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  coverPreview: {
    width: 52,
    height: 34,
    borderRadius: 8,
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
