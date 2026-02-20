import { Typography } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PreviousWork = { company: string; role: string; duration: string };
type SocialLink = { platform: string; url: string; label: string };
type BusinessIdeaItem = { idea: string };
const STORAGE_BUCKET = "tribe-media";

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme, isDark } = useTheme();
  const token = session?.access_token || "";
  const userId = session?.user?.id || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [businessIdeas, setBusinessIdeas] = useState<BusinessIdeaItem[]>([
    { idea: "" },
  ]);
  const [ideaVideoUrl, setIdeaVideoUrl] = useState("");
  const [previousWorks, setPreviousWorks] = useState<PreviousWork[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [completedGigs, setCompletedGigs] = useState<any[]>([]);
  const [userType, setUserType] = useState<"founder" | "freelancer" | null>(
    null,
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const resolvePhotoUrl = async (storedPhotoValue: string) => {
    if (!storedPhotoValue) return "";
    if (/^https?:\/\//i.test(storedPhotoValue)) return storedPhotoValue;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storedPhotoValue, 60 * 60 * 24 * 30);
    if (!error && data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
    return "";
  };

  const resolveLatestAvatarFromStorage = async () => {
    if (!userId) return "";
    const folder = `profiles/${userId}`;
    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, { limit: 20 });

    if (error || !Array.isArray(files) || files.length === 0) return "";
    const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
    if (!preferred?.name) return "";

    const fullPath = `${folder}/${preferred.name}`;
    setPhotoPath(fullPath);
    return resolvePhotoUrl(fullPath);
  };

  const loadProfile = async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await tribeApi.getMyProfile(token);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      const storedPhoto =
        typeof data.photo_url === "string" ? data.photo_url : "";
      setPhotoPath(
        storedPhoto && !/^https?:\/\//i.test(storedPhoto) ? storedPhoto : "",
      );
      const resolvedFromProfile = await resolvePhotoUrl(storedPhoto);
      if (resolvedFromProfile) {
        setPhotoUrl(resolvedFromProfile);
      } else {
        setPhotoUrl(await resolveLatestAvatarFromStorage());
      }
      setLinkedinUrl(data.linkedin_url || "");
      if (Array.isArray(data.business_ideas)) {
        const sanitizedIdeas = data.business_ideas
          .filter((idea: unknown) => typeof idea === "string")
          .map((idea: string) => ({ idea }));
        setBusinessIdeas(
          sanitizedIdeas.length ? sanitizedIdeas : [{ idea: "" }],
        );
      } else if (
        typeof data.business_idea === "string" &&
        data.business_idea.trim()
      ) {
        try {
          const parsed = JSON.parse(data.business_idea);
          if (Array.isArray(parsed)) {
            const parsedIdeas = parsed
              .filter((idea: unknown) => typeof idea === "string")
              .map((idea: string) => ({ idea }));
            setBusinessIdeas(parsedIdeas.length ? parsedIdeas : [{ idea: "" }]);
          } else {
            setBusinessIdeas([{ idea: data.business_idea }]);
          }
        } catch {
          setBusinessIdeas([{ idea: data.business_idea }]);
        }
      } else {
        setBusinessIdeas([{ idea: "" }]);
      }
      setIdeaVideoUrl(data.idea_video_url || "");
      setPreviousWorks(
        Array.isArray(data.previous_works) ? data.previous_works : [],
      );
      setSocialLinks(Array.isArray(data.social_links) ? data.social_links : []);
      setContact(data.contact || "");
      setLocation(data.location || "");
      setRole(data.role || "");
      setCompletedGigs(
        Array.isArray(data.completed_gigs) ? data.completed_gigs : [],
      );
      setUserType(
        typeof data.user_type === "string"
          ? (data.user_type.toLowerCase() as "founder" | "freelancer")
          : (data.user_type || null)
      );
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback — load basic info from auth user
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setDisplayName(
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "",
          );
        }
      } catch (_) { }
    } finally {
      setLoading(false);
    }
  };

  // ── Photo Picker & Upload ──────────────────────────────
  const pickPhoto = () => {
    Alert.alert("Profile Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: () => launchPicker("camera"),
      },
      {
        text: "Photo Library",
        onPress: () => launchPicker("library"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const launchPicker = async (source: "camera" | "library") => {
    // Request permissions
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera access is required to take a photo.",
        );
        return;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo library access is required.");
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    await uploadPhoto(asset.uri);
  };

  const uploadPhoto = async (localUri: string) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = localUri.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `profiles/${userId}/avatar.${ext}`;
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

      // Use arraybuffer approach for reliable RN upload
      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();

      // RLS policies allow INSERT/DELETE but not UPDATE on storage.objects.
      // So avoid `upsert: true`; delete first (ignore missing-file errors), then upload.
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Bucket is private by policy; use signed URL for app display.
      const { data: signedData, error: signError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      setPhotoPath(filePath);

      if (signError || !signedData?.signedUrl) {
        setPhotoUrl("");
      } else {
        setPhotoUrl(`${signedData.signedUrl}&t=${Date.now()}`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload failed", error?.message || "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  // ── Save ───────────────────────────────────────────────
  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const cleanedIdeas = businessIdeas
        .map((item) => item.idea.trim())
        .filter(Boolean);

      await tribeApi.updateMyProfile(token, {
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || null,
        photo_url: (photoUrl || photoPath || "").trim() || null,
        linkedin_url: normalizeUrl(linkedinUrl),
        business_ideas: cleanedIdeas,
        business_idea: cleanedIdeas.length ? cleanedIdeas[0] : null,
        idea_video_url: normalizeUrl(ideaVideoUrl),
        previous_works: (Array.isArray(previousWorks)
          ? previousWorks
          : []
        ).filter((w) => w && (w.company || w.role)),
        social_links: (Array.isArray(socialLinks) ? socialLinks : []).filter(
          (l) => l && l.url,
        ),
        user_type: userType,
        contact: contact.trim() || null,
        location: location.trim() || null,
        role: role.trim() || null,
        completed_gigs: completedGigs,
      });
      Alert.alert("Success", "Profile updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Dynamic list helpers ───────────────────────────────
  const addWork = () =>
    setPreviousWorks([
      ...previousWorks,
      { company: "", role: "", duration: "" },
    ]);

  const updateWork = (
    index: number,
    field: keyof PreviousWork,
    value: string,
  ) => {
    const updated = [...previousWorks];
    updated[index] = { ...updated[index], [field]: value };
    setPreviousWorks(updated);
  };

  const removeWork = (index: number) =>
    setPreviousWorks(previousWorks.filter((_, i) => i !== index));

  const addLink = () =>
    setSocialLinks([...socialLinks, { platform: "", url: "", label: "" }]);

  const updateLink = (
    index: number,
    field: keyof SocialLink,
    value: string,
  ) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const removeLink = (index: number) =>
    setSocialLinks(socialLinks.filter((_, i) => i !== index));

  const addBusinessIdea = () =>
    setBusinessIdeas([...businessIdeas, { idea: "" }]);

  const updateBusinessIdea = (index: number, value: string) => {
    const updated = [...businessIdeas];
    updated[index] = { idea: value };
    setBusinessIdeas(updated);
  };

  const removeBusinessIdea = (index: number) =>
    setBusinessIdeas(
      businessIdeas.length <= 1
        ? [{ idea: "" }]
        : businessIdeas.filter((_, i) => i !== index),
    );

  // ── Styles ─────────────────────────────────────────────
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.surfaceElevated,
      color: theme.text.primary,
      borderColor: theme.border,
    },
  ];

  const labelStyle = [styles.label, { color: theme.text.secondary }];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Edit Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: theme.brand.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Picker */}
          <TouchableOpacity
            style={styles.photoSection}
            onPress={pickPhoto}
            activeOpacity={0.7}
            disabled={uploading}
          >
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={[
                  styles.photoPreview,
                  { borderColor: theme.brand.primary },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.photoPreview,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Ionicons name="person" size={40} color={theme.text.muted} />
              </View>
            )}
            <View
              style={[
                styles.cameraIconBadge,
                { backgroundColor: theme.brand.primary },
              ]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
            <Text style={[styles.photoHint, { color: theme.text.tertiary }]}>
              {uploading ? "Uploading..." : "Tap to change photo"}
            </Text>
          </TouchableOpacity>

          {/* Basic Info */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
              Basic Info
            </Text>

            <Text style={labelStyle}>I am a...</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor:
                      userType === "founder"
                        ? theme.brand.primary
                        : theme.surfaceElevated,
                    borderColor:
                      userType === "founder"
                        ? theme.brand.primary
                        : theme.border,
                  },
                ]}
                onPress={() => setUserType("founder")}
              >
                <Ionicons
                  name="rocket"
                  size={20}
                  color={userType === "founder" ? "#fff" : theme.text.secondary}
                />
                <Text
                  style={[
                    styles.roleText,
                    {
                      color:
                        userType === "founder" ? "#fff" : theme.text.primary,
                    },
                  ]}
                >
                  Founder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor:
                      userType === "freelancer"
                        ? theme.brand.primary
                        : theme.surfaceElevated,
                    borderColor:
                      userType === "freelancer"
                        ? theme.brand.primary
                        : theme.border,
                  },
                ]}
                onPress={() => setUserType("freelancer")}
              >
                <Ionicons
                  name="code-working"
                  size={20}
                  color={
                    userType === "freelancer" ? "#fff" : theme.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.roleText,
                    {
                      color:
                        userType === "freelancer" ? "#fff" : theme.text.primary,
                    },
                  ]}
                >
                  Freelancer
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={labelStyle}>Full Name</Text>
            <TextInput
              style={inputStyle}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
              placeholderTextColor={theme.text.muted}
              maxLength={50}
            />

            <Text style={labelStyle}>Bio</Text>
            <TextInput
              style={[...inputStyle, styles.multiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              placeholderTextColor={theme.text.muted}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <Text style={labelStyle}>LinkedIn URL</Text>
            <TextInput
              style={inputStyle}
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              placeholder="https://linkedin.com/in/..."
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              keyboardType="url"
            />

            {userType === "freelancer" && (
              <>
                <Text style={labelStyle}>Contact Info</Text>
                <TextInput
                  style={inputStyle}
                  value={contact}
                  onChangeText={setContact}
                  placeholder="Email or WhatsApp"
                  placeholderTextColor={theme.text.muted}
                />

                <Text style={labelStyle}>Freelancer Role</Text>
                <TextInput
                  style={inputStyle}
                  value={role}
                  onChangeText={setRole}
                  placeholder="e.g. Fullstack Developer, UI Designer"
                  placeholderTextColor={theme.text.muted}
                />

                <Text style={labelStyle}>Location</Text>
                <TextInput
                  style={inputStyle}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City, Country"
                  placeholderTextColor={theme.text.muted}
                />
              </>
            )}
          </View>

          {/* Business Idea (Founder Only) */}
          {userType === "founder" && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                  Business Ideas
                </Text>
                <TouchableOpacity
                  onPress={addBusinessIdea}
                  style={styles.addBtn}
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={theme.brand.primary}
                  />
                </TouchableOpacity>
              </View>

              {businessIdeas.map((item, index) => (
                <View
                  key={index}
                  style={[styles.dynamicItem, { borderColor: theme.border }]}
                >
                  <View style={styles.dynamicItemHeader}>
                    <Text
                      style={[
                        styles.dynamicItemIndex,
                        { color: theme.text.muted },
                      ]}
                    >
                      #{index + 1}
                    </Text>
                    <TouchableOpacity onPress={() => removeBusinessIdea(index)}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[...inputStyle, styles.multiline]}
                    value={item.idea}
                    onChangeText={(v) => updateBusinessIdea(index, v)}
                    placeholder="Tell us about the product/ idea/ problem statement you working on"
                    placeholderTextColor={theme.text.muted}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />
                </View>
              ))}

              <Text style={labelStyle}>Pitch Video URL (YouTube)</Text>
              <TextInput
                style={inputStyle}
                value={ideaVideoUrl}
                onChangeText={setIdeaVideoUrl}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={theme.text.muted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {/* Completed Gigs (Freelancer Only) */}
          {userType === "freelancer" && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                  Completed Gigs
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setCompletedGigs([
                      ...completedGigs,
                      { title: "", description: "" },
                    ])
                  }
                  style={styles.addBtn}
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={theme.brand.primary}
                  />
                </TouchableOpacity>
              </View>

              {completedGigs.map((gig, index) => (
                <View
                  key={index}
                  style={[styles.dynamicItem, { borderColor: theme.border }]}
                >
                  <View style={styles.dynamicItemHeader}>
                    <Text
                      style={[
                        styles.dynamicItemIndex,
                        { color: theme.text.muted },
                      ]}
                    >
                      Gig #{index + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setCompletedGigs(
                          completedGigs.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={inputStyle}
                    value={gig.title}
                    onChangeText={(v) => {
                      const updated = [...completedGigs];
                      updated[index] = { ...updated[index], title: v };
                      setCompletedGigs(updated);
                    }}
                    placeholder="Gig title"
                    placeholderTextColor={theme.text.muted}
                  />
                  <TextInput
                    style={[...inputStyle, styles.multiline]}
                    value={gig.description}
                    onChangeText={(v) => {
                      const updated = [...completedGigs];
                      updated[index] = { ...updated[index], description: v };
                      setCompletedGigs(updated);
                    }}
                    placeholder="Project description or skills used"
                    placeholderTextColor={theme.text.muted}
                    multiline
                  />
                </View>
              ))}
            </View>
          )}

          {/* Previous Works */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                Experience
              </Text>
              <TouchableOpacity onPress={addWork} style={styles.addBtn}>
                <Ionicons
                  name="add-circle"
                  size={24}
                  color={theme.brand.primary}
                />
              </TouchableOpacity>
            </View>

            {previousWorks.length === 0 && (
              <Text style={[styles.emptyHint, { color: theme.text.muted }]}>
                Tap + to add work experience
              </Text>
            )}

            {previousWorks.map((work, index) => (
              <View
                key={index}
                style={[styles.dynamicItem, { borderColor: theme.border }]}
              >
                <View style={styles.dynamicItemHeader}>
                  <Text
                    style={[
                      styles.dynamicItemIndex,
                      { color: theme.text.muted },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeWork(index)}>
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={inputStyle}
                  value={work.company}
                  onChangeText={(v) => updateWork(index, "company", v)}
                  placeholder="Company"
                  placeholderTextColor={theme.text.muted}
                />
                <TextInput
                  style={inputStyle}
                  value={work.role}
                  onChangeText={(v) => updateWork(index, "role", v)}
                  placeholder="Role"
                  placeholderTextColor={theme.text.muted}
                />
                <TextInput
                  style={inputStyle}
                  value={work.duration}
                  onChangeText={(v) => updateWork(index, "duration", v)}
                  placeholder="Duration (e.g. 2020-2023)"
                  placeholderTextColor={theme.text.muted}
                />
              </View>
            ))}
          </View>

          {/* Social Links */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                Social Links
              </Text>
              <TouchableOpacity onPress={addLink} style={styles.addBtn}>
                <Ionicons
                  name="add-circle"
                  size={24}
                  color={theme.brand.primary}
                />
              </TouchableOpacity>
            </View>

            {socialLinks.length === 0 && (
              <Text style={[styles.emptyHint, { color: theme.text.muted }]}>
                Tap + to add social links
              </Text>
            )}

            {socialLinks.map((link, index) => (
              <View
                key={index}
                style={[styles.dynamicItem, { borderColor: theme.border }]}
              >
                <View style={styles.dynamicItemHeader}>
                  <Text
                    style={[
                      styles.dynamicItemIndex,
                      { color: theme.text.muted },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeLink(index)}>
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={inputStyle}
                  value={link.platform}
                  onChangeText={(v) => updateLink(index, "platform", v)}
                  placeholder="Platform (e.g. twitter, github)"
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="none"
                />
                <TextInput
                  style={inputStyle}
                  value={link.url}
                  onChangeText={(v) => updateLink(index, "url", v)}
                  placeholder="URL"
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TextInput
                  style={inputStyle}
                  value={link.label}
                  onChangeText={(v) => updateLink(index, "label", v)}
                  placeholder="Label (e.g. My Twitter)"
                  placeholderTextColor={theme.text.muted}
                />
              </View>
            ))}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Typography.fonts.primary,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  photoPreview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 28,
    right: "33%",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  photoHint: {
    fontSize: 13,
    marginTop: 8,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    fontFamily: Typography.fonts.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  addBtn: {
    padding: 4,
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 8,
  },
  dynamicItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  dynamicItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dynamicItemIndex: {
    fontSize: 12,
    fontWeight: "700",
  },
  roleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
