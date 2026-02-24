import { Typography } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
type BusinessIdeaItem = { idea: string; pitch_url?: string };
const STORAGE_BUCKET = "tribe-media";
const PITCH_LINK_PLATFORM = "pitch_video";

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { switchRole, role: appRole } = useRole();
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
    { idea: "", pitch_url: "" },
  ]);
  const [previousWorks, setPreviousWorks] = useState<PreviousWork[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [contact, setContact] = useState(""); // phone number
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [completedGigs, setCompletedGigs] = useState<any[]>([]);
  const [userType, setUserType] = useState<"founder" | "freelancer" | "both" | null>(
    null,
  );
  const formCacheKey = `profile:edit-cache:v1:${userId || "anon"}`;

  useEffect(() => {
    loadProfile();
  }, []);

  const parseUserType = (raw: unknown): "founder" | "freelancer" | "both" | null => {
    if (typeof raw !== "string") return null;
    const normalized = raw.trim().toLowerCase();
    if (normalized === "founder" || normalized === "freelancer" || normalized === "both") {
      return normalized;
    }
    return null;
  };
  const firstFilledString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value;
    }
    return "";
  };
  const loadCachedForm = async () => {
    try {
      const raw = await AsyncStorage.getItem(formCacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const saveCachedForm = async (payload: Record<string, any>) => {
    try {
      await AsyncStorage.setItem(formCacheKey, JSON.stringify(payload));
    } catch {
      // noop
    }
  };
  const preferNonEmptyArray = <T,>(primary: unknown, fallback: unknown): T[] => {
    const primaryArr = Array.isArray(primary) ? (primary as T[]) : [];
    if (primaryArr.length > 0) return primaryArr;
    return Array.isArray(fallback) ? (fallback as T[]) : [];
  };

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
      const cached = await loadCachedForm();
      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      const metadataProfile =
        freshUser?.user_metadata?.profile_data ||
        session?.user?.user_metadata?.profile_data ||
        {};
      if (cached) {
        setDisplayName(firstFilledString(cached.displayName));
        setBio(firstFilledString(cached.bio));
        setLinkedinUrl(firstFilledString(cached.linkedinUrl));
        setContact(firstFilledString(cached.contact));
        setAddress(firstFilledString(cached.address));
        setLocation(firstFilledString(cached.location));
        setRole(firstFilledString(cached.role));
        setUserType(parseUserType(cached.userType));
        if (Array.isArray(cached.previousWorks)) setPreviousWorks(cached.previousWorks);
        if (Array.isArray(cached.socialLinks)) setSocialLinks(cached.socialLinks);
        if (Array.isArray(cached.completedGigs)) setCompletedGigs(cached.completedGigs);
        if (Array.isArray(cached.businessIdeas)) setBusinessIdeas(cached.businessIdeas);
      }
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await tribeApi.getMyProfile(token);
      setDisplayName(
        firstFilledString(
          data.display_name,
          cached?.displayName,
          freshUser?.user_metadata?.full_name,
          freshUser?.user_metadata?.name,
          session?.user?.user_metadata?.full_name,
          session?.user?.user_metadata?.name,
        ),
      );
      setBio(firstFilledString(data.bio, cached?.bio));
      const storedPhoto =
        typeof data.photo_url === "string" && data.photo_url.trim()
          ? data.photo_url
          : typeof data.avatar_url === "string"
            ? data.avatar_url
            : "";
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
      const metadataBusinessIdeas = Array.isArray(metadataProfile?.business_ideas)
        ? metadataProfile.business_ideas
          .filter((idea: unknown) => typeof idea === "string")
          .map((idea: string) => ({ idea, pitch_url: "" }))
        : [];
      if (Array.isArray(data.business_ideas)) {
        const sanitizedIdeas = data.business_ideas
          .filter((idea: unknown) => typeof idea === "string")
          .map((idea: string) => ({ idea, pitch_url: "" }));
        setBusinessIdeas(
          sanitizedIdeas.length
            ? sanitizedIdeas
            : metadataBusinessIdeas.length
              ? metadataBusinessIdeas
              : [{ idea: "", pitch_url: "" }],
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
              .map((idea: string) => ({ idea, pitch_url: "" }));
            setBusinessIdeas(parsedIdeas.length ? parsedIdeas : [{ idea: "", pitch_url: "" }]);
          } else {
            setBusinessIdeas([{ idea: data.business_idea, pitch_url: "" }]);
          }
        } catch {
          setBusinessIdeas([{ idea: data.business_idea, pitch_url: "" }]);
        }
      } else if (Array.isArray(cached?.businessIdeas) && cached.businessIdeas.length > 0) {
        setBusinessIdeas(cached.businessIdeas);
      } else if (metadataBusinessIdeas.length > 0) {
        setBusinessIdeas(metadataBusinessIdeas);
      } else {
        setBusinessIdeas([{ idea: "", pitch_url: "" }]);
      }
      setPreviousWorks(
        preferNonEmptyArray<PreviousWork>(
          data.previous_works,
          preferNonEmptyArray<PreviousWork>(
            metadataProfile?.previous_works,
            cached?.previousWorks,
          ),
        ),
      );
      const incomingSocialLinks: SocialLink[] = preferNonEmptyArray<SocialLink>(
        data.social_links,
        preferNonEmptyArray<SocialLink>(
          metadataProfile?.social_links,
          cached?.socialLinks,
        ),
      );
      const isPitchLink = (link: SocialLink) =>
        (link?.platform || "").toLowerCase() === PITCH_LINK_PLATFORM ||
        /^pitch\s*video/i.test(link?.label || "");
      const pitchFromLinks = incomingSocialLinks
        .filter(isPitchLink)
        .map((link) => ({ url: link.url || "" }))
        .filter((item) => !!item.url.trim());
      const allPitch = [
        ...(typeof data.idea_video_url === "string" && data.idea_video_url.trim()
          ? [data.idea_video_url]
          : []),
        ...pitchFromLinks.map((item) => item.url),
      ];
      if (allPitch.length > 0) {
        setBusinessIdeas((prev) => {
          const seeded = prev.length > 0 ? [...prev] : [{ idea: "", pitch_url: "" }];
          for (let i = 0; i < allPitch.length; i += 1) {
            if (seeded[i]) {
              seeded[i] = { ...seeded[i], pitch_url: allPitch[i] };
            } else {
              seeded.push({ idea: "", pitch_url: allPitch[i] });
            }
          }
          return seeded;
        });
      }
      setSocialLinks(incomingSocialLinks.filter((link) => !isPitchLink(link)));
      setContact(firstFilledString(data.contact, metadataProfile.contact, cached?.contact));
      setAddress(firstFilledString(data.address, metadataProfile.address, cached?.address));
      setLocation(firstFilledString(data.location, metadataProfile.location, cached?.location));
      setRole(firstFilledString(data.role, metadataProfile.role, cached?.role));
      setLinkedinUrl(firstFilledString(data.linkedin_url, metadataProfile.linkedin_url, cached?.linkedinUrl));
      setCompletedGigs(
        preferNonEmptyArray<any>(
          data.completed_gigs,
          preferNonEmptyArray<any>(
            metadataProfile?.completed_gigs,
            cached?.completedGigs,
          ),
        ),
      );
      const dbUserType = parseUserType(data.user_type);
      const metadataUserType =
        parseUserType(freshUser?.user_metadata?.user_type) ||
        parseUserType(freshUser?.user_metadata?.role) ||
        parseUserType(session?.user?.user_metadata?.user_type) ||
        parseUserType(session?.user?.user_metadata?.role);
      const cachedUserType = parseUserType(cached?.userType);
      const roleFallback = appRole === "founder" || appRole === "freelancer"
        ? appRole
        : null;
      setUserType(dbUserType || metadataUserType || cachedUserType || roleFallback || null);
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
  const isValidPhone = (value: string) =>
    /^[+]?[\d\s\-()]{7,20}$/.test(value.trim());
  const isYouTubeUrl = (value: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(value.trim());

  const handleSave = async () => {
    if (!token) return;
    if (!displayName.trim()) {
      Alert.alert("Missing info", "Please enter your full name.");
      return;
    }
    if (!userType) {
      Alert.alert("Missing info", "Please choose whether you are founder, freelancer, or both.");
      return;
    }
    if (!bio.trim()) {
      Alert.alert("Missing info", "Please enter your bio.");
      return;
    }
    if (!contact.trim() || !isValidPhone(contact)) {
      Alert.alert("Missing info", "Please enter a valid phone number.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Missing info", "Please enter your address.");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Missing info", "Please enter your location.");
      return;
    }
    if (!normalizeUrl(linkedinUrl)) {
      Alert.alert("Missing info", "Please enter a valid LinkedIn URL.");
      return;
    }
    setSaving(true);
    try {
      const cleanedIdeas = businessIdeas
        .map((item) => (item.idea || "").trim())
        .filter(Boolean);
      const normalizedExperience = (Array.isArray(previousWorks)
        ? previousWorks
        : []
      ).map((w) => ({
        company: (w?.company || "").trim(),
        role: (w?.role || "").trim(),
        duration: (w?.duration || "").trim(),
      })).filter((w) => w.company || w.role || w.duration);
      if (normalizedExperience.length === 0) {
        Alert.alert("Missing info", "Please add at least one experience entry.");
        setSaving(false);
        return;
      }
      const normalizedSocialLinks = (Array.isArray(socialLinks) ? socialLinks : [])
        .map((link) => ({
          platform: (link?.platform || "").trim(),
          label: (link?.label || "").trim(),
          url: normalizeUrl(link?.url || "") || "",
        }))
        .filter((link) => !!link.url);
      if (normalizedSocialLinks.length === 0) {
        Alert.alert("Missing info", "Please add at least one social link.");
        setSaving(false);
        return;
      }
      const normalizedPitchVideoUrls = businessIdeas
        .map((item) => normalizeUrl(item.pitch_url || "") || "")
        .filter(Boolean);
      if (userType === "founder" && cleanedIdeas.length === 0) {
        Alert.alert("Missing info", "Please add at least one business idea.");
        setSaving(false);
        return;
      }
      if (normalizedPitchVideoUrls.length > 0) {
        if (!normalizedPitchVideoUrls.every((u) => isYouTubeUrl(u))) {
          Alert.alert("Invalid URL", "Pitch video URLs must be YouTube links.");
          setSaving(false);
          return;
        }
      }
      if (userType === "freelancer" && !role.trim()) {
        Alert.alert("Missing info", "Please enter your freelance role.");
        setSaving(false);
        return;
      }
      const pitchUrlsForPayload =
        userType === "founder" || userType === "both"
          ? normalizedPitchVideoUrls
          : [];
      if (normalizedSocialLinks.length > 10) {
        Alert.alert(
          "Too many links",
          "Social links can be at most 10.",
        );
        setSaving(false);
        return;
      }

      const payload = {
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || null,
        // Persist storage path, not temporary signed URL.
        photo_url: (photoPath || photoUrl || "").trim() || null,
        linkedin_url: normalizeUrl(linkedinUrl),
        business_ideas: cleanedIdeas,
        business_idea: cleanedIdeas.length ? cleanedIdeas[0] : null,
        idea_video_url:
          userType === "founder" || userType === "both"
            ? pitchUrlsForPayload[0] || null
            : null,
        previous_works: normalizedExperience,
        social_links: normalizedSocialLinks,
        user_type: userType,
        contact: contact.trim() || null,
        address: address.trim() || null,
        location: location.trim() || null,
        role: role.trim() || null,
        completed_gigs: completedGigs,
      };
      let profileSaved = false;
      let profileSaveErrorMsg = "";
      try {
        await tribeApi.updateMyProfile(token, payload);
        profileSaved = true;
      } catch (apiErr: any) {
        profileSaveErrorMsg = apiErr?.message || "Unknown API error";
        console.warn("[EditProfile] API save failed, using fallback persistence:", apiErr?.message);
      }
      await saveCachedForm({
        displayName: displayName.trim(),
        bio: bio.trim(),
        linkedinUrl: normalizeUrl(linkedinUrl),
        businessIdeas,
        previousWorks: normalizedExperience,
        socialLinks: normalizedSocialLinks,
        contact: contact.trim(),
        address: address.trim(),
        location: location.trim(),
        role: role.trim(),
        completedGigs,
        userType,
      });
      try {
        await supabase.auth.updateUser({
          data: {
            user_type: userType,
            // Keep top-level role aligned with user_type (including "both")
            // so role resolvers don't fall back to stale founder/freelancer values.
            role: userType,
            profile_data: {
              contact: contact.trim(),
              address: address.trim(),
              location: location.trim(),
              role: role.trim(),
              linkedin_url: normalizeUrl(linkedinUrl),
              business_ideas: cleanedIdeas,
              idea_video_urls: pitchUrlsForPayload,
              previous_works: normalizedExperience,
              social_links: normalizedSocialLinks,
              completed_gigs: completedGigs,
            },
          },
        });
      } catch {
        // Non-blocking: profile DB save already succeeded.
      }
      // Sync the local role context with the saved user type
      if (userType === "founder" || userType === "freelancer") {
        switchRole(userType);
      }
      Alert.alert(
        profileSaved ? "Success" : "Saved Locally",
        profileSaved
          ? "Profile updated!"
          : `Server save failed (${profileSaveErrorMsg || "unknown error"}), but your data is kept locally and in account metadata.`,
        [
        { text: "OK", onPress: () => router.back() },
        ],
      );
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
    setBusinessIdeas([...businessIdeas, { idea: "", pitch_url: "" }]);

  const updateBusinessIdea = (index: number, value: string) => {
    const updated = [...businessIdeas];
    updated[index] = { ...updated[index], idea: value };
    setBusinessIdeas(updated);
  };
  const updateBusinessPitch = (index: number, value: string) => {
    const updated = [...businessIdeas];
    updated[index] = { ...updated[index], pitch_url: value };
    setBusinessIdeas(updated);
  };

  const removeBusinessIdea = (index: number) =>
    setBusinessIdeas(
      businessIdeas.length <= 1
        ? [{ idea: "", pitch_url: "" }]
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
          <Text style={[styles.screenHint, { color: theme.text.tertiary }]}>
            Keep this profile complete so founders and freelancers can trust your work quickly.
          </Text>

          {/* Photo Picker */}
          <TouchableOpacity
            style={[
              styles.photoSection,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
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
                { backgroundColor: theme.brand.primary, borderColor: theme.surface },
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
            <Text style={[styles.cardSubtitle, { color: theme.text.tertiary }]}>
              Identity, profile summary, and role preferences.
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

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor:
                      userType === "both"
                        ? theme.brand.primary
                        : theme.surfaceElevated,
                    borderColor:
                      userType === "both"
                        ? theme.brand.primary
                        : theme.border,
                  },
                ]}
                onPress={() => setUserType("both")}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color={userType === "both" ? "#fff" : theme.text.secondary}
                />
                <Text
                  style={[
                    styles.roleText,
                    {
                      color:
                        userType === "both" ? "#fff" : theme.text.primary,
                    },
                  ]}
                >
                  Both
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

            <Text style={labelStyle}>Phone Number</Text>
            <TextInput
              style={inputStyle}
              value={contact}
              onChangeText={setContact}
              placeholder="+91 98XXXXXXX"
              placeholderTextColor={theme.text.muted}
              keyboardType="phone-pad"
            />

            <Text style={labelStyle}>Address</Text>
            <TextInput
              style={inputStyle}
              value={address}
              onChangeText={setAddress}
              placeholder="Street / Area"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={labelStyle}>Location</Text>
            <TextInput
              style={inputStyle}
              value={location}
              onChangeText={setLocation}
              placeholder="City, State, Country"
              placeholderTextColor={theme.text.muted}
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

            {(userType === "freelancer" || userType === "both") && (
              <>
                <Text style={labelStyle}>Freelancer Role</Text>
                <TextInput
                  style={inputStyle}
                  value={role}
                  onChangeText={setRole}
                  placeholder="e.g. Fullstack Developer, UI Designer"
                  placeholderTextColor={theme.text.muted}
                />

              </>
            )}
          </View>

          {/* Business Idea (Founder Only) */}
          {(userType === "founder" || userType === "both") && (
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
              <Text style={[styles.cardSubtitle, { color: theme.text.tertiary }]}>
                Add ideas with optional pitch links (YouTube).
              </Text>

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
                  <TextInput
                    style={inputStyle}
                    value={item.pitch_url || ""}
                    onChangeText={(v) => updateBusinessPitch(index, v)}
                    placeholder="Pitch Video URL (YouTube) - optional"
                    placeholderTextColor={theme.text.muted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              ))}
            </View>
          )}

          {/* Previous Works (Freelancer Only) */}
          {(userType === "freelancer" || userType === "both") && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                  Previous Works
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
              <Text style={[styles.cardSubtitle, { color: theme.text.tertiary }]}>
                Showcase previous client work and outcomes.
              </Text>

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
                      Work #{index + 1}
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
                    placeholder="Project / Company"
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
                    placeholder="Role / Work summary / impact"
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
            <Text style={[styles.cardSubtitle, { color: theme.text.tertiary }]}>
              Add your relevant roles and durations.
            </Text>

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
            <Text style={[styles.cardSubtitle, { color: theme.text.tertiary }]}>
              Public links people can use to verify and connect.
            </Text>

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
    paddingTop: Platform.OS === "ios" ? 58 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: Typography.fonts.primary,
  },
  saveBtn: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 10,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  screenHint: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  photoSection: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 30,
    right: "34%",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  photoHint: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 8,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    fontFamily: Typography.fonts.primary,
  },
  cardSubtitle: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 17,
  },
  multiline: {
    minHeight: 92,
    paddingTop: 10,
  },
  addBtn: {
    padding: 2,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 11,
    lineHeight: 14,
    fontStyle: "italic",
    marginBottom: 8,
  },
  dynamicItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 7,
  },
  dynamicItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dynamicItemIndex: {
    fontSize: 10,
    fontWeight: "600",
  },
  roleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
