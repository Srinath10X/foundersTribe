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
      Alert.alert("Missing info", "Please select Founder and/or Freelancer.");
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
          url: (normalizeUrl(link?.url || "") || "").replace(/\s+/g, ""),
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
        display_name: (displayName.trim() || "").slice(0, 100) || undefined,
        bio: (bio.trim() || "").slice(0, 5000) || null,
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
        const rawMsg = apiErr?.message || "Unknown API error";
        // Extract the field name from Zod validation errors for a friendlier message
        const fieldMatch = rawMsg.match(/body\.(\S+?):/);
        if (fieldMatch) {
          const fieldPath = fieldMatch[1]
            .replace(/\./g, " > ")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
          profileSaveErrorMsg = `Invalid value in "${fieldPath}". Please check and try again.`;
        } else {
          profileSaveErrorMsg = rawMsg;
        }
        console.warn("[EditProfile] API save failed, using fallback persistence:", rawMsg);
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
          : `${profileSaveErrorMsg}\n\nYour data has been saved locally. You can try saving again or go back.`,
        profileSaved
          ? [{ text: "OK", onPress: () => router.back() }]
          : [
              { text: "Go Back", onPress: () => router.back() },
              { text: "Stay & Fix", style: "cancel" },
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
  const softBorder = isDark ? "rgba(255,255,255,0.11)" : theme.borderLight;
  const softBg = isDark ? "rgba(255,255,255,0.045)" : theme.surfaceElevated;
  const mutedText = theme.text.tertiary || theme.text.secondary;
  const founderSelected = userType === "founder" || userType === "both";
  const freelancerSelected = userType === "freelancer" || userType === "both";
  const deriveUserType = (
    hasFounder: boolean,
    hasFreelancer: boolean,
  ): "founder" | "freelancer" | "both" | null => {
    if (hasFounder && hasFreelancer) return "both";
    if (hasFounder) return "founder";
    if (hasFreelancer) return "freelancer";
    return null;
  };
  const toggleUserType = (kind: "founder" | "freelancer") => {
    const nextFounder = kind === "founder" ? !founderSelected : founderSelected;
    const nextFreelancer = kind === "freelancer" ? !freelancerSelected : freelancerSelected;
    setUserType(deriveUserType(nextFounder, nextFreelancer));
  };
  const inputStyle = [
    styles.input,
    {
      backgroundColor: softBg,
      color: theme.text.primary,
      borderColor: softBorder,
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

      <View style={[styles.header, { borderBottomColor: softBorder, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: softBorder, backgroundColor: softBg }]}
        >
          <Ionicons name="chevron-back" size={19} color={theme.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Edit Profile</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.headerSaveBtn, { backgroundColor: theme.brand.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.headerSaveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <View style={styles.heroDotOverlay} />
            <View style={styles.heroPatternA} />
            <View style={styles.heroPatternB} />
            <View style={styles.heroPatternC} />

            <View style={styles.heroTop}>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.heroAvatarWrap}
                onPress={pickPhoto}
                disabled={uploading}
              >
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoFallback}>
                    <Ionicons name="person" size={36} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.heroCameraBadge}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroName} numberOfLines={2}>
                  {displayName.trim() || "Your Name"}
                </Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {userType === "founder"
                    ? "Founder Profile"
                    : userType === "freelancer"
                      ? "Freelancer Profile"
                      : userType === "both"
                        ? "Founder + Freelancer Profile"
                        : "Profile Setup"}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={pickPhoto}
                  style={styles.heroInlineAction}
                  disabled={uploading}
                >
                  <Ionicons name="image-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.heroInlineActionText}>
                    {uploading ? "Uploading..." : "Change Photo"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroStatusChip}>
              <View style={styles.heroStatusIcon}>
                <Ionicons name="sparkles-outline" size={12} color="#FBBF24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroStatusLabel}>Profile Editor</Text>
                <Text style={styles.heroStatusValue} numberOfLines={1}>
                  Keep details complete and up to date
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: softBorder }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: "#6366F1" }]} />
              <Text style={[styles.sectionHeaderText, { color: mutedText }]}>Preferences</Text>
            </View>

            <Text style={labelStyle}>I am...</Text>
            <Text style={[styles.roleHint, { color: mutedText }]}>
              Select one or both.
            </Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor: founderSelected ? theme.brand.primary : softBg,
                    borderColor: founderSelected ? theme.brand.primary : softBorder,
                  },
                ]}
                onPress={() => toggleUserType("founder")}
              >
                <Ionicons name="rocket-outline" size={18} color={founderSelected ? "#FFFFFF" : theme.text.secondary} />
                <Text style={[styles.roleText, { color: founderSelected ? "#FFFFFF" : theme.text.primary }]}>
                  Founder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor: freelancerSelected ? theme.brand.primary : softBg,
                    borderColor: freelancerSelected ? theme.brand.primary : softBorder,
                  },
                ]}
                onPress={() => toggleUserType("freelancer")}
              >
                <Ionicons name="code-working-outline" size={18} color={freelancerSelected ? "#FFFFFF" : theme.text.secondary} />
                <Text style={[styles.roleText, { color: freelancerSelected ? "#FFFFFF" : theme.text.primary }]}>
                  Freelancer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: softBorder }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: "#E23744" }]} />
              <Text style={[styles.sectionHeaderText, { color: mutedText }]}>Personal Details</Text>
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

          {(userType === "founder" || userType === "both") && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: softBorder }]}>
              <View style={styles.cardHeader}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: "#F59E0B" }]} />
                  <Text style={[styles.sectionHeaderText, { color: mutedText }]}>Vision & Ventures</Text>
                </View>
                <TouchableOpacity onPress={addBusinessIdea} style={styles.addBtn}>
                  <Ionicons name="add-circle" size={24} color={theme.brand.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardSubtitle, { color: mutedText }]}>
                Add business ideas and optional YouTube pitch links.
              </Text>

              {businessIdeas.map((item, index) => (
                <View key={index} style={[styles.dynamicItem, { borderColor: softBorder, backgroundColor: softBg }]}>
                  <View style={styles.dynamicItemHeader}>
                    <Text style={[styles.dynamicItemIndex, { color: theme.text.secondary }]}>Idea {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeBusinessIdea(index)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[...inputStyle, styles.multiline]}
                    value={item.idea}
                    onChangeText={(v) => updateBusinessIdea(index, v)}
                    placeholder="Describe the idea, problem, or solution..."
                    placeholderTextColor={theme.text.muted}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />
                  <TextInput
                    style={inputStyle}
                    value={item.pitch_url || ""}
                    onChangeText={(v) => updateBusinessPitch(index, v)}
                    placeholder="Pitch Video URL (YouTube)"
                    placeholderTextColor={theme.text.muted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              ))}
            </View>
          )}

          {(userType === "freelancer" || userType === "both") && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: softBorder }]}>
              <View style={styles.cardHeader}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: "#14B8A6" }]} />
                  <Text style={[styles.sectionHeaderText, { color: mutedText }]}>Previous Works</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCompletedGigs([...completedGigs, { title: "", description: "" }])}
                  style={styles.addBtn}
                >
                  <Ionicons name="add-circle" size={24} color={theme.brand.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardSubtitle, { color: mutedText }]}>
                Showcase project highlights and outcomes.
              </Text>

              {completedGigs.length === 0 ? (
                <Text style={[styles.emptyHint, { color: theme.text.muted }]}>Tap + to add previous work</Text>
              ) : null}

              {completedGigs.map((gig, index) => (
                <View key={index} style={[styles.dynamicItem, { borderColor: softBorder, backgroundColor: softBg }]}>
                  <View style={styles.dynamicItemHeader}>
                    <Text style={[styles.dynamicItemIndex, { color: theme.text.secondary }]}>Work {index + 1}</Text>
                    <TouchableOpacity onPress={() => setCompletedGigs(completedGigs.filter((_, i) => i !== index))}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
                    placeholder="Role / summary / impact"
                    placeholderTextColor={theme.text.muted}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
          )}

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: softBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBar, { backgroundColor: "#3B82F6" }]} />
                <Text style={[styles.sectionHeaderText, { color: mutedText }]}>Experience</Text>
              </View>
              <TouchableOpacity onPress={addWork} style={styles.addBtn}>
                <Ionicons name="add-circle" size={24} color={theme.brand.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardSubtitle, { color: mutedText }]}>Add your relevant roles and durations.</Text>

            {previousWorks.length === 0 ? (
              <Text style={[styles.emptyHint, { color: theme.text.muted }]}>Tap + to add work experience</Text>
            ) : null}

            {previousWorks.map((work, index) => (
              <View key={index} style={[styles.dynamicItem, { borderColor: softBorder, backgroundColor: softBg }]}>
                <View style={styles.dynamicItemHeader}>
                  <Text style={[styles.dynamicItemIndex, { color: theme.text.secondary }]}>Experience {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeWork(index)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
                  placeholder="Duration (e.g. Jan 2025 - Present)"
                  placeholderTextColor={theme.text.muted}
                />
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: softBorder }]}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBar, { backgroundColor: "#8B5CF6" }]} />
                <Text style={[styles.sectionHeaderText, { color: mutedText }]}>Social Links</Text>
              </View>
              <TouchableOpacity onPress={addLink} style={styles.addBtn}>
                <Ionicons name="add-circle" size={24} color={theme.brand.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardSubtitle, { color: mutedText }]}>
              Add public links so others can verify and connect.
            </Text>

            {socialLinks.length === 0 ? (
              <Text style={[styles.emptyHint, { color: theme.text.muted }]}>Tap + to add social links</Text>
            ) : null}

            {socialLinks.map((link, index) => (
              <View key={index} style={[styles.dynamicItem, { borderColor: softBorder, backgroundColor: softBg }]}>
                <View style={styles.dynamicItemHeader}>
                  <Text style={[styles.dynamicItemIndex, { color: theme.text.secondary }]}>Link {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeLink(index)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={inputStyle}
                  value={link.platform}
                  onChangeText={(v) => updateLink(index, "platform", v)}
                  placeholder="Platform (e.g. github, x, dribbble)"
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
                  placeholder="Label (e.g. Portfolio)"
                  placeholderTextColor={theme.text.muted}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.bottomSaveBtn, { backgroundColor: theme.brand.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.bottomSaveText}>Save Profile</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
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
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.15,
  },
  headerSaveBtn: {
    minWidth: 74,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  headerSaveText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  heroDotOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroPatternA: {
    position: "absolute",
    right: -36,
    top: -48,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(239,68,68,0.25)",
  },
  heroPatternB: {
    position: "absolute",
    left: -52,
    bottom: -88,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(59,130,246,0.22)",
  },
  heroPatternC: {
    position: "absolute",
    right: 22,
    top: 30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(245,158,11,0.16)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "visible",
  },
  photoPreview: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  photoFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroCameraBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E23744",
    borderWidth: 2,
    borderColor: "#121826",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    lineHeight: 23,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    lineHeight: 15,
    color: "rgba(255,255,255,0.82)",
  },
  heroInlineAction: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.11)",
  },
  heroInlineActionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    lineHeight: 15,
    color: "#FFFFFF",
  },
  heroStatusChip: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  heroStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.2)",
  },
  heroStatusLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 8.8,
    lineHeight: 11.5,
    color: "rgba(255,255,255,0.64)",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroStatusValue: {
    marginTop: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    lineHeight: 16.5,
    color: "#FBBF24",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 999,
  },
  sectionHeaderText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 15,
    marginTop: -2,
  },
  label: {
    marginTop: 2,
    marginBottom: 4,
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    lineHeight: 15.5,
  },
  input: {
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  multiline: {
    minHeight: 94,
    paddingTop: 10,
  },
  roleContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  roleHint: {
    marginTop: -2,
    marginBottom: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  roleOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  roleText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    lineHeight: 16,
  },
  addBtn: {
    padding: 2,
    marginRight: 2,
  },
  emptyHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    lineHeight: 15.5,
    fontStyle: "italic",
  },
  dynamicItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 7,
  },
  dynamicItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  dynamicItemIndex: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    lineHeight: 14,
  },
  bottomSaveBtn: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: Platform.OS === "ios" ? 24 : 14,
  },
  bottomSaveText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFF",
  },
});
