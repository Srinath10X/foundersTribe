import { Typography } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

const { width } = Dimensions.get("window");

type PreviousWork = { company: string; role: string; duration: string };
type SocialLink = { platform: string; url: string; label: string };
type BusinessIdeaItem = { idea: string; pitch_url?: string | null };
const STORAGE_BUCKET = "tribe-media";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  business_idea: string | null;
  business_ideas?: string[] | null;
  idea_video_url: string | null;
  previous_works: PreviousWork[];
  social_links: SocialLink[];
  user_type: "founder" | "freelancer" | "both" | null;
  contact?: string | null;
  address?: string | null;
  location?: string | null;
  role?: string | null;
  rating?: number | null;
  completed_gigs?: any[] | null;
};

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "logo-twitter",
  x: "logo-twitter",
  github: "logo-github",
  linkedin: "logo-linkedin",
  instagram: "logo-instagram",
  youtube: "logo-youtube",
  facebook: "logo-facebook",
  website: "globe-outline",
  dribbble: "logo-dribbble",
};

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    articlesRead: 0,
    bookmarks: 0,
    likes: 0,
  });
  const [uploading, setUploading] = useState(false);

  const token = session?.access_token || "";
  const userId = session?.user?.id || "";

  // Reload profile every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchProfile = async () => {
        try {
          if (!token) return;
          const data = await tribeApi.getMyProfile(token);
          const {
            data: { user: freshUser },
          } = await supabase.auth.getUser();
          const metadataProfile =
            freshUser?.user_metadata?.profile_data ||
            session?.user?.user_metadata?.profile_data ||
            {};
          const mergedProfile = {
            ...data,
            contact: data?.contact ?? metadataProfile?.contact ?? null,
            address: data?.address ?? metadataProfile?.address ?? null,
            location: data?.location ?? metadataProfile?.location ?? null,
            role: data?.role ?? metadataProfile?.role ?? null,
            linkedin_url: data?.linkedin_url ?? metadataProfile?.linkedin_url ?? null,
            previous_works:
              Array.isArray(data?.previous_works) && data.previous_works.length > 0
                ? data.previous_works
                : Array.isArray(metadataProfile?.previous_works)
                  ? metadataProfile.previous_works
                  : [],
            social_links:
              Array.isArray(data?.social_links) && data.social_links.length > 0
                ? data.social_links
                : Array.isArray(metadataProfile?.social_links)
                  ? metadataProfile.social_links
                  : [],
            completed_gigs:
              Array.isArray(data?.completed_gigs) && data.completed_gigs.length > 0
                ? data.completed_gigs
                : Array.isArray(metadataProfile?.completed_gigs)
                  ? metadataProfile.completed_gigs
                  : [],
          };
          let resolvedPhotoUrl = data?.photo_url || data?.avatar_url || null;
          if (
            typeof resolvedPhotoUrl === "string" &&
            resolvedPhotoUrl &&
            !/^https?:\/\//i.test(resolvedPhotoUrl)
          ) {
            const { data: signedData, error } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(resolvedPhotoUrl, 60 * 60 * 24 * 30);
            if (!error && signedData?.signedUrl) {
              resolvedPhotoUrl = `${signedData.signedUrl}&t=${Date.now()}`;
            }
          }

          // Fallback: if profile photo_url is absent/stale, pull latest avatar directly from storage.
          if (!resolvedPhotoUrl && userId) {
            const folder = `profiles/${userId}`;
            const { data: files, error } = await supabase.storage
              .from(STORAGE_BUCKET)
              .list(folder, { limit: 20 });
            if (!error && Array.isArray(files) && files.length > 0) {
              const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
              if (preferred?.name) {
                const fullPath = `${folder}/${preferred.name}`;
                const { data: signedData } = await supabase.storage
                  .from(STORAGE_BUCKET)
                  .createSignedUrl(fullPath, 60 * 60 * 24 * 30);
                if (signedData?.signedUrl) {
                  resolvedPhotoUrl = `${signedData.signedUrl}&t=${Date.now()}`;
                }
              }
            }
          }

          if (!cancelled) {
            setProfile({
              ...mergedProfile,
              photo_url: resolvedPhotoUrl,
            });
          }
        } catch (error) {
          // console.error("Error loading profile:", error);
          // Fallback to auth user data
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && !cancelled) {
            setProfile({
              id: user.id,
              username: user.email?.split("@")[0] || "user",
              display_name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "User",
              avatar_url: null,
              bio: null,
              photo_url: null,
              linkedin_url: null,
              business_idea: null,
              idea_video_url: null,
              previous_works: [],
              social_links: [],
              user_type: null,
              contact: null,
              location: null,
              role: null,
              rating: null,
              completed_gigs: [],
            });
          }
        }
      };

      const fetchStats = async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { data: bookmarks } = await supabase
            .from("user_interactions")
            .select("id")
            .eq("user_id", user.id)
            .eq("bookmarked", true);

          const { data: likes } = await supabase
            .from("user_interactions")
            .select("id")
            .eq("user_id", user.id)
            .eq("liked", true);

          if (!cancelled) {
            setStats({
              articlesRead: (bookmarks?.length || 0) + (likes?.length || 0),
              bookmarks: bookmarks?.length || 0,
              likes: likes?.length || 0,
            });
          }
        } catch (error) {
          console.error("Error loading stats:", error);
        }
      };

      setLoading(true);
      Promise.all([fetchProfile(), fetchStats()]).finally(() => {
        if (!cancelled) setLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }, [token, userId]),
  );

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLogout = async () => {
    triggerHaptic();
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            router.replace("/");
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
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

      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);

      let newPhotoUrl = "";
      if (!signError && signedData?.signedUrl) {
        newPhotoUrl = `${signedData.signedUrl}&t=${Date.now()}`;
      }

      if (token) {
        // Update database with new profile photo path
        await tribeApi.updateMyProfile(token, {
          photo_url: filePath,
        });
      }

      // Update local state to reflect UI change immediately
      setProfile((prev) =>
        prev ? { ...prev, photo_url: newPhotoUrl || filePath } : null
      );

      Alert.alert("Success", "Profile photo updated successfully!");

    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload failed", error?.message || "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleEditInterests = async () => {
    await triggerHaptic();
    router.push("/edit-interests");
  };

  const handleEditProfile = async () => {
    await triggerHaptic();
    router.push("/edit-profile");
  };

  const openURL = (url: string) => {
    const trimmed = (url || "").trim();
    if (!trimmed) return;
    const finalUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    Linking.openURL(finalUrl).catch((err) =>
      console.error("Error opening URL:", err),
    );
  };

  const getYoutubeThumbnail = (url: string): string | null => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
    );
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  const userName = profile?.display_name || "User";
  const userEmail = session?.user?.email || "";
  const previousWorks: PreviousWork[] = Array.isArray(profile?.previous_works)
    ? profile.previous_works
    : [];
  const isPitchVideoLink = (item: SocialLink) =>
    String(item?.platform || "").toLowerCase() === "pitch_video" ||
    /^pitch\s*video/i.test(String(item?.label || ""));
  const allProfileSocialLinks: SocialLink[] = (Array.isArray(profile?.social_links) ? profile?.social_links : []).filter(
    (item) => item && typeof item.url === "string",
  );
  const socialLinks: SocialLink[] = allProfileSocialLinks.filter(
    (item) => item && typeof item.url === "string" && !isPitchVideoLink(item),
  );
  const pitchVideoUrls = Array.from(
    new Set(
      [
        typeof profile?.idea_video_url === "string" ? profile.idea_video_url.trim() : "",
        ...allProfileSocialLinks
          .filter(isPitchVideoLink)
          .map((item) => String(item.url || "").trim()),
      ].filter(Boolean),
    ),
  );
  const businessIdeas: BusinessIdeaItem[] = (() => {
    if (Array.isArray(profile?.business_ideas)) {
      return profile.business_ideas
        .filter((idea) => typeof idea === "string" && idea.trim().length > 0)
        .map((idea, index) => ({ idea, pitch_url: pitchVideoUrls[index] || null }));
    }

    const singleIdea = profile?.business_idea?.trim();
    if (!singleIdea) return [];

    try {
      const parsed = JSON.parse(singleIdea);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((idea) => typeof idea === "string" && idea.trim().length > 0)
          .map((idea, index) => ({ idea, pitch_url: pitchVideoUrls[index] || null }));
      }
    } catch {
      // Keep backward compatibility when this field is plain text.
    }

    return [{ idea: singleIdea, pitch_url: pitchVideoUrls[0] || null }];
  })();
  const completionSignals = [
    !!profile?.display_name?.trim(),
    !!profile?.bio?.trim(),
    !!(profile?.photo_url || profile?.avatar_url),
    !!profile?.linkedin_url?.trim() || socialLinks.length > 0,
    businessIdeas.length > 0 || previousWorks.length > 0,
  ];
  const completionPct = Math.round(
    (completionSignals.filter(Boolean).length / completionSignals.length) * 100,
  );
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - completionPct / 100);

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    rightElement,
    accentColor,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
    accentColor?: string;
  }) => {
    const iconColor = accentColor || theme.text.primary;
    const iconBgColor = accentColor ? accentColor + "15" : theme.surfaceElevated;

    return (
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: theme.border }]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.menuItemLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconBgColor },
            ]}
          >
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: theme.text.primary }]}>
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.menuItemSubtitle,
                  { color: theme.text.tertiary },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightElement ||
          (showChevron && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.text.muted}
            />
          ))}
      </TouchableOpacity>
    );
  };

  if (loading && !profile) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" },
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.mainScreenTitle, { color: theme.text.primary }]}>
          My Profile
        </Text>

        {/* Profile Header */}
        <View style={styles.profileHeaderNew}>
          <View style={styles.avatarContainerNew}>
            <View style={styles.svgWrapperNew}>
              <Svg width={136} height={136} viewBox="0 0 136 136">
                <Circle
                  cx="68"
                  cy="68"
                  r={ringRadius}
                  stroke={theme.border}
                  strokeWidth="6"
                  fill="none"
                />
                <Circle
                  cx="68"
                  cy="68"
                  r={ringRadius}
                  stroke={theme.brand.primary}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 68 68)"
                />
              </Svg>
            </View>

            {profile?.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                style={styles.avatarNew}
              />
            ) : (
              <View style={[styles.avatarNew, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[styles.avatarInitialNew, { color: theme.text.primary }]}>
                  {userName.charAt(0).toUpperCase() || "P"}
                </Text>
              </View>
            )}

          </View>

          <View style={styles.nameRowNew}>
            <Text
              style={[styles.userNameNew, { color: theme.text.primary }]}
              numberOfLines={1}
            >
              {userName}
            </Text>
            <MaterialIcons name="verified" size={16} color={theme.brand.primary} style={{ marginLeft: 5 }} />
          </View>
          <Text style={[styles.userMetaNew, { color: theme.text.muted }]} numberOfLines={1}>
            {profile?.username ? `@${profile.username}` : userEmail}
          </Text>

          <View
            style={[
              styles.completionCardNew,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.completionRowNew}>
              <Text style={[styles.completionTitleNew, { color: theme.text.secondary }]}>
                Profile Completion
              </Text>
              <Text style={[styles.completionValueNew, { color: theme.text.primary }]}>
                {completionPct}%
              </Text>
            </View>
            <View style={[styles.progressTrackNew, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFillNew,
                  { width: `${completionPct}%`, backgroundColor: theme.brand.primary },
                ]}
              />
            </View>
          </View>

          <View style={styles.actionButtonsRowNew}>
            {/* Settings Button */}
            <View style={styles.actionButtonContainerNew}>
              <TouchableOpacity
                style={[styles.actionButtonSmNew, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => triggerHaptic()}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-sharp" size={22} color={theme.text.muted} />
              </TouchableOpacity>
              <Text style={[styles.actionButtonTextNew, { color: theme.text.muted }]}>Settings</Text>
            </View>

            {/* Edit Profile Button */}
            <View style={styles.actionButtonContainerNew}>
              <TouchableOpacity
                style={[styles.actionButtonLgNew, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                onPress={handleEditProfile}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={26} color={theme.text.muted} />
                <View style={[styles.notificationDotNew, { borderColor: theme.surfaceElevated }]} />
              </TouchableOpacity>
              <Text style={[styles.actionButtonTextNew, { color: theme.text.muted }]}>Edit profile</Text>
            </View>

            {/* Add Media Button */}
            <View style={styles.actionButtonContainerNew}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic();
                  pickPhoto();
                }}
                disabled={uploading}
              >
                <LinearGradient
                  colors={['#FF4D6D', '#FF7E67']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionButtonSmNew]}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={22} color="#FFF" />
                      <View style={styles.plusBadgeBgNew}>
                        <Ionicons name="add" size={14} color="#FF7E67" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.actionButtonTextNew, { color: theme.text.muted }]}>
                {uploading ? "Uploading..." : "Add media"}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Sections */}
        <View style={styles.sectionsContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              About
            </Text>
            <View
              style={[
                styles.premiumCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.aboutText, { color: theme.text.secondary }]}>
                {profile?.bio?.trim() || "No bio yet. Add your story in Edit Profile."}
              </Text>
              {!!profile?.linkedin_url && (
                <TouchableOpacity
                  onPress={() => openURL(profile.linkedin_url!)}
                  activeOpacity={0.75}
                  style={[
                    styles.minimalLinkRow,
                    {
                      borderTopColor: theme.border,
                      backgroundColor: theme.surfaceElevated,
                    },
                  ]}
                >
                  <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
                  <Text style={[styles.minimalLinkText, { color: theme.text.primary }]}>
                    LinkedIn
                  </Text>
                  <Ionicons name="open-outline" size={14} color={theme.text.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(profile?.contact || profile?.address || profile?.location || profile?.role) && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                Professional Details
              </Text>
              <View
                style={[
                  styles.premiumCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {!!profile?.contact && (
                  <View style={[styles.infoRowNew, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.text.muted }]}>Phone</Text>
                    <Text style={[styles.infoValue, { color: theme.text.primary }]} numberOfLines={1}>
                      {profile.contact}
                    </Text>
                  </View>
                )}
                {!!profile?.address && (
                  <View style={[styles.infoRowNew, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.text.muted }]}>Address</Text>
                    <Text style={[styles.infoValue, { color: theme.text.primary }]} numberOfLines={1}>
                      {profile.address}
                    </Text>
                  </View>
                )}
                {!!profile?.location && (
                  <View style={[styles.infoRowNew, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.text.muted }]}>Location</Text>
                    <Text style={[styles.infoValue, { color: theme.text.primary }]} numberOfLines={1}>
                      {profile.location}
                    </Text>
                  </View>
                )}
                {!!profile?.role && (
                  <View style={styles.infoRowNew}>
                    <Text style={[styles.infoLabel, { color: theme.text.muted }]}>Role</Text>
                    <Text style={[styles.infoValue, { color: theme.text.primary }]} numberOfLines={1}>
                      {profile.role}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {(profile?.user_type === "founder" || profile?.user_type === "both") && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                Business Ideas
              </Text>
              <View
                style={[
                  styles.premiumCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {businessIdeas.length > 0 ? (
                  <View style={styles.ideaSectionWrapNew}>
                    {businessIdeas.map((item, index) => (
                      <View
                        key={index}
                        style={[
                          styles.ideaCardShellNew,
                          {
                            backgroundColor: theme.surfaceElevated,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <View style={styles.ideaCardTopRowNew}>
                          <View
                            style={[
                              styles.ideaIndexNew,
                              { backgroundColor: theme.background, borderColor: theme.border },
                            ]}
                          >
                            <Text style={[styles.ideaIndexTextNew, { color: theme.text.muted }]}>
                              #{String(index + 1).padStart(2, "0")}
                            </Text>
                          </View>
                          <Text style={[styles.ideaTagNew, { color: theme.text.muted }]}>
                            Business Idea
                          </Text>
                        </View>
                        <Text style={[styles.ideaBodyStrongNew, { color: theme.text.primary }]}>
                          {item.idea}
                        </Text>
                        {!!item.pitch_url && (
                          <TouchableOpacity
                            style={[
                              styles.ideaPitchLinkRowNew,
                              {
                                borderTopColor: theme.border,
                              },
                            ]}
                            onPress={() => openURL(item.pitch_url!)}
                            activeOpacity={0.75}
                          >
                            <View
                              style={[
                                styles.ideaPitchPillNew,
                                {
                                  backgroundColor: theme.surfaceElevated,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <Ionicons name="play-circle" size={14} color={theme.brand.primary} />
                              <Text style={[styles.ideaPitchLinkTextNew, { color: theme.brand.primary }]}>
                                Pitch Video
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.ideaEmptyWrapNew}>
                    <Text style={[styles.ideaEmptyTitleNew, { color: theme.text.primary }]}>
                      No ideas yet
                    </Text>
                    <Text style={[styles.ideaEmptySubNew, { color: theme.text.muted }]}>
                      Add your first business idea from Edit Profile.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {previousWorks.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                Experience
              </Text>
              <View
                style={[
                  styles.premiumCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={{ padding: 12, gap: 10 }}>
                  {previousWorks.map((work, index) => (
                    <View
                      key={index}
                      style={[
                        styles.experienceCardNew,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View style={styles.experienceHeaderRowNew}>
                        <Text style={[styles.experienceRoleNew, { color: theme.text.primary }]} numberOfLines={1}>
                          {work.role || "Role"}
                        </Text>
                        {!!work.duration && (
                          <View
                            style={[
                              styles.experienceDurationPillNew,
                              { backgroundColor: theme.background, borderColor: theme.border },
                            ]}
                          >
                            <Text style={[styles.experienceDurationTextNew, { color: theme.text.muted }]}>
                              {work.duration}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.experienceCompanyNew, { color: theme.text.secondary }]} numberOfLines={1}>
                        {work.company || "Company"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {(profile?.user_type === "freelancer" || profile?.user_type === "both") &&
            Array.isArray(profile.completed_gigs) &&
            profile.completed_gigs.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                  Completed Gigs
                </Text>
                <View
                  style={[
                    styles.premiumCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  {profile.completed_gigs.map((gig, index) => (
                    <View
                      key={index}
                      style={[
                        styles.timelineRowNew,
                        index < (profile.completed_gigs?.length || 0) - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        },
                      ]}
                    >
                      <View style={[styles.timelineDotNew, { backgroundColor: "#10B981" }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.timelineTitleNew, { color: theme.text.primary }]}>
                          {gig.title}
                        </Text>
                        <Text style={[styles.timelineSubNew, { color: theme.text.secondary }]}>
                          {gig.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {socialLinks.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                Connect
              </Text>
              <View
                style={[
                  styles.premiumCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {socialLinks.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.socialMinimalRow,
                      index < socialLinks.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}
                    onPress={() => openURL(link.url)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.socialMinimalIcon,
                        { backgroundColor: theme.surfaceElevated },
                      ]}
                    >
                      <Ionicons
                        name={
                          (PLATFORM_ICONS[String(link.platform || "").toLowerCase()] ||
                            "link-outline") as any
                        }
                        size={16}
                        color={theme.text.primary}
                      />
                    </View>
                    <Text style={[styles.socialMinimalLabel, { color: theme.text.primary }]} numberOfLines={1}>
                      {link.label || link.platform}
                    </Text>
                    <Ionicons name="open-outline" size={14} color={theme.text.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              Preferences
            </Text>
            <View
              style={[
                styles.premiumCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionMinimalRow, { borderBottomColor: theme.border }]}
                onPress={handleEditInterests}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={[styles.actionMinimalTitle, { color: theme.text.primary }]}>
                    Edit Interests
                  </Text>
                  <Text style={[styles.actionMinimalSub, { color: theme.text.muted }]}>
                    Tune what appears in your feed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.text.muted} />
              </TouchableOpacity>

              <View style={styles.actionMinimalRow}>
                <View>
                  <Text style={[styles.actionMinimalTitle, { color: theme.text.primary }]}>
                    Theme
                  </Text>
                  <Text style={[styles.actionMinimalSub, { color: theme.text.muted }]}>
                    {themeMode === "light" ? "Light mode" : "Dark mode"}
                  </Text>
                </View>
                <View style={[styles.themeToggle, { backgroundColor: theme.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.themePill,
                      themeMode === "light" && {
                        backgroundColor: theme.brand.primary,
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setThemeMode("light");
                    }}
                  >
                    <Ionicons
                      name="sunny-outline"
                      size={14}
                      color={
                        themeMode === "light"
                          ? theme.text.inverse
                          : theme.text.tertiary
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.themePill,
                      themeMode === "dark" && {
                        backgroundColor: theme.brand.primary,
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setThemeMode("dark");
                    }}
                  >
                    <Ionicons
                      name="moon"
                      size={14}
                      color={
                        themeMode === "dark"
                          ? theme.text.inverse
                          : theme.text.tertiary
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              Account
            </Text>
            <View
              style={[
                styles.premiumCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionMinimalRow, { borderBottomColor: theme.border }]}
                onPress={handleEditProfile}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={[styles.actionMinimalTitle, { color: theme.text.primary }]}>
                    Edit Profile
                  </Text>
                  <Text style={[styles.actionMinimalSub, { color: theme.text.muted }]}>
                    Update your identity and details
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.text.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionMinimalRow}
                onPress={handleLogout}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={[styles.actionMinimalTitle, { color: "#FF4D4F" }]}>
                    Logout
                  </Text>
                  <Text style={[styles.actionMinimalSub, { color: theme.text.muted }]}>
                    Sign out from this device
                  </Text>
                </View>
                <Ionicons name="log-out-outline" size={16} color="#FF4D4F" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerVersion, { color: theme.text.muted }]}>
            foundersTribe
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 100,
  },
  mainScreenTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  headerCard: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  avatarWrapper: {
    marginRight: 16,
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  avatarInitial: {
    fontSize: 24,
    fontFamily: Typography.fonts.primary,
  },
  headerTextContent: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontFamily: Typography.fonts.primary,
    marginBottom: 4,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 13,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  editProfileBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  sectionsContainer: {
    paddingHorizontal: 18,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
    letterSpacing: 0.2,
    marginBottom: 10,
    marginLeft: 2,
  },
  premiumCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Typography.fonts.primary,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  minimalLinkRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  minimalLinkText: {
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
    flex: 1,
  },
  infoRowNew: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: Typography.fonts.primary,
    width: 72,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
    flex: 1,
  },
  minimalListRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  minimalListIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  minimalListIndexText: {
    fontSize: 11,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  minimalListBody: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.fonts.primary,
  },
  ideaSectionWrapNew: {
    padding: 12,
    gap: 10,
  },
  ideaCardShellNew: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  ideaCardTopRowNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  ideaIndexNew: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ideaIndexTextNew: {
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  ideaTagNew: {
    fontSize: 11,
    fontFamily: Typography.fonts.primary,
  },
  ideaBodyStrongNew: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  pitchRowNew: {
    marginTop: 2,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ideaPitchLinkRowNew: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  ideaPitchPillNew: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ideaPitchLinkTextNew: {
    fontSize: 11,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  ideaEmptyWrapNew: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  ideaEmptyTitleNew: {
    fontSize: 14,
    fontFamily: "BricolageGrotesque_600SemiBold",
    marginBottom: 3,
  },
  ideaEmptySubNew: {
    fontSize: 12,
    fontFamily: Typography.fonts.primary,
  },
  timelineRowNew: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timelineDotNew: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  timelineTitleNew: {
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  timelineSubNew: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: Typography.fonts.primary,
  },
  timelineMetaNew: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: Typography.fonts.primary,
  },
  experienceCardNew: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  experienceHeaderRowNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  experienceRoleNew: {
    flex: 1,
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  experienceDurationPillNew: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  experienceDurationTextNew: {
    fontSize: 10,
    fontFamily: Typography.fonts.primary,
  },
  experienceCompanyNew: {
    fontSize: 12,
    fontFamily: Typography.fonts.primary,
  },
  socialMinimalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  socialMinimalIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  socialMinimalLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  actionMinimalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionMinimalTitle: {
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  actionMinimalSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: Typography.fonts.primary,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  linkedinRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  linkedinText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
  },
  videoThumb: {
    width: 80,
    height: 50,
    borderRadius: 8,
  },
  videoLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  videoUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  experienceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  experienceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  experienceRole: {
    fontSize: 15,
    fontWeight: "600",
  },
  experienceCompany: {
    fontSize: 14,
    marginTop: 2,
  },
  experienceDuration: {
    fontSize: 12,
    marginTop: 4,
  },
  socialItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  socialIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  themeToggle: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  themePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: "BricolageGrotesque_700Bold",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailText: {
    fontSize: 15,
    fontWeight: "500",
  },
  profileHeaderNew: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 20,
  },
  avatarContainerNew: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 136,
    height: 136,
    marginBottom: 14,
  },
  svgWrapperNew: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarNew: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialNew: {
    fontSize: 34,
    fontFamily: Typography.fonts.primary,
  },
  nameRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    maxWidth: "84%",
  },
  userNameNew: {
    fontSize: 20,
    fontFamily: "BricolageGrotesque_600SemiBold",
    fontWeight: '600',
  },
  userMetaNew: {
    fontSize: 12,
    marginBottom: 12,
    fontFamily: Typography.fonts.primary,
  },
  completionCardNew: {
    width: "86%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  completionRowNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  completionTitleNew: {
    fontSize: 12,
    fontFamily: Typography.fonts.primary,
  },
  completionValueNew: {
    fontSize: 13,
    fontFamily: "BricolageGrotesque_600SemiBold",
  },
  progressTrackNew: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFillNew: {
    height: "100%",
    borderRadius: 999,
  },
  actionButtonsRowNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 10,
    width: '100%',
  },
  actionButtonContainerNew: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 80,
  },
  actionButtonSmNew: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonLgNew: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonTextNew: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  notificationDotNew: {
    position: 'absolute',
    top: 2,
    right: 14,
    width: 14,
    height: 14,
    backgroundColor: '#FF4D6D',
    borderRadius: 7,
    borderWidth: 2,
  },
  plusBadgeBgNew: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    backgroundColor: '#FFF',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
