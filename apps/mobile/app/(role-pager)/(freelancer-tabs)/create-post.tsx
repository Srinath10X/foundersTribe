import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FlowScreen,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useCreatePost } from "@/hooks/useFeed";
import { supabase } from "@/lib/supabase";
import type { FeedPostType } from "@/types/gig";

const STORAGE_BUCKET = "tribe-media";
const MAX_IMAGES = 4;

const POST_TYPES: { value: FeedPostType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "work_update", label: "Update", icon: "hammer-outline" },
  { value: "showcase", label: "Showcase", icon: "star-outline" },
  { value: "milestone", label: "Milestone", icon: "flag-outline" },
  { value: "hiring", label: "Hiring", icon: "people-outline" },
  { value: "insight", label: "Insight", icon: "bulb-outline" },
];

export default function CreatePostScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const createPost = useCreatePost();

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<FeedPostType>("work_update");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // ---- Image helpers ----

  const pickImages = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert("Limit reached", `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please grant photo library access in Settings.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - imageUris.length,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const newUris = result.assets.map((a) => a.uri);
    setImageUris((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageUris.length === 0) return [];

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const urls: string[] = [];

    for (const uri of imageUris) {
      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `feed/${userId}/${fileName}`;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, { contentType, upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: signedData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);

      if (signedData?.signedUrl) {
        urls.push(`${signedData.signedUrl}&t=${Date.now()}`);
      }
    }

    return urls;
  };

  const addTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 10) {
      Alert.alert("Limit reached", "You can add up to 10 tags.");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (content.trim().length < 10) {
      Alert.alert("Too short", "Please write at least 10 characters.");
      return;
    }

    try {
      setUploading(true);

      // Upload images first
      const imageUrls = await uploadImages();

      await createPost.mutateAsync({
        content: content.trim(),
        post_type: postType,
        tags: tags.length > 0 ? tags : undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });

      Alert.alert("Published!", "Your post is now live.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("[create-post] publish error", error?.message);
      Alert.alert("Publish failed", error?.message || "Unable to publish right now.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FlowScreen scroll={false}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: palette.borderLight, backgroundColor: palette.bg },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { borderColor: palette.borderLight, backgroundColor: palette.surface },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={17} color={palette.text} />
        </TouchableOpacity>

        <T weight="medium" color={palette.text} style={styles.headerTitle} numberOfLines={1}>
          Create Post
        </T>

        {/* Spacer to balance header */}
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Post Type Selector */}
          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Post Type
            </T>
            <View style={styles.typeRow}>
              {POST_TYPES.map((pt) => {
                const isActive = postType === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    activeOpacity={0.8}
                    onPress={() => setPostType(pt.value)}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isActive ? palette.accent : palette.surface,
                        borderColor: isActive ? palette.accent : palette.borderLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={pt.icon}
                      size={13}
                      color={isActive ? "#fff" : palette.subText}
                    />
                    <T
                      weight="medium"
                      color={isActive ? "#fff" : palette.subText}
                      style={styles.typeLabel}
                    >
                      {pt.label}
                    </T>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SurfaceCard>

          {/* Content */}
          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              What's on your mind?
            </T>
            <TextInput
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
              placeholder="Share an update, showcase your work, or post an insight..."
              placeholderTextColor={palette.subText}
              maxLength={5000}
              style={[
                styles.textarea,
                {
                  borderColor: palette.borderLight,
                  color: palette.text,
                  backgroundColor: palette.surface,
                },
              ]}
            />
            <T weight="regular" color={palette.subText} style={styles.charCount}>
              {content.length}/5000
            </T>
          </SurfaceCard>

          {/* Tags */}
          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Tags
            </T>
            <View style={styles.tagInputRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag..."
                placeholderTextColor={palette.subText}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={addTag}
                style={[
                  styles.tagInput,
                  {
                    borderColor: palette.borderLight,
                    color: palette.text,
                    backgroundColor: palette.surface,
                  },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={addTag}
                style={[styles.tagAddBtn, { backgroundColor: palette.accent }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {tags.length > 0 ? (
              <View style={styles.tagsWrap}>
                {tags.map((tag, i) => (
                  <TouchableOpacity
                    key={`${tag}-${i}`}
                    activeOpacity={0.8}
                    onPress={() => removeTag(i)}
                    style={[styles.tagChip, { backgroundColor: palette.accentSoft }]}
                  >
                    <T weight="medium" color={palette.accent} style={styles.tagChipText}>
                      #{tag}
                    </T>
                    <Ionicons name="close" size={12} color={palette.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </SurfaceCard>

          {/* Images */}
          <SurfaceCard style={styles.formCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Images
            </T>

            <View style={styles.imageGrid}>
              {imageUris.map((uri, i) => (
                <View key={`img-${i}`} style={styles.imageThumbWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.imageThumb}
                    contentFit="cover"
                    transition={200}
                  />
                  <TouchableOpacity
                    style={[styles.imageRemoveBtn, { backgroundColor: palette.accent }]}
                    activeOpacity={0.8}
                    onPress={() => removeImage(i)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {imageUris.length < MAX_IMAGES && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={pickImages}
                  style={[
                    styles.imageAddBtn,
                    { borderColor: palette.borderLight, backgroundColor: palette.surface },
                  ]}
                >
                  <Ionicons name="image-outline" size={24} color={palette.subText} />
                  <T weight="regular" color={palette.subText} style={styles.imageAddLabel}>
                    Add
                  </T>
                </TouchableOpacity>
              )}
            </View>

            <T weight="regular" color={palette.subText} style={styles.imageHint}>
              Up to {MAX_IMAGES} images. Tap to add, tap X to remove.
            </T>
          </SurfaceCard>

          {/* Publish Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={createPost.isPending || uploading}
            style={[
              styles.submitBtn,
              {
                backgroundColor: palette.accent,
                opacity: createPost.isPending || uploading ? 0.45 : 1,
              },
            ]}
            onPress={handlePublish}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
            <T weight="medium" color="#fff" style={styles.submitText}>
              {uploading
                ? "Uploading images..."
                : createPost.isPending
                  ? "Publishing..."
                  : "Publish Post"}
            </T>
          </TouchableOpacity>

          <View style={{ height: tabBarHeight + 16 }} />
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "transparent",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
  },
  formCard: {
    padding: 13,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  textarea: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingTop: 9,
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  charCount: {
    marginTop: 4,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 14,
  },
  tagInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 17,
  },
  tagAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagChipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  imageRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  imageAddBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  imageAddLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  imageHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 14,
  },
  submitBtn: {
    marginTop: 2,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 13,
    lineHeight: 17,
  },
});
