import { Typography } from "@/constants/DesignSystem";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
type BusinessIdeaItem = { idea: string };
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
          let resolvedPhotoUrl = data?.photo_url || null;
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
              ...data,
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
  const ideaVideoUrl = profile?.idea_video_url || null;
  const videoThumbnail = ideaVideoUrl ? getYoutubeThumbnail(ideaVideoUrl) : null;
  const previousWorks: PreviousWork[] = Array.isArray(profile?.previous_works)
    ? profile.previous_works
    : [];
  const socialLinks: SocialLink[] = (Array.isArray(profile?.social_links) ? profile?.social_links : []).filter(
    (item) => item && typeof item.url === "string",
  );
  const businessIdeas: BusinessIdeaItem[] = (() => {
    if (Array.isArray(profile?.business_ideas)) {
      return profile.business_ideas
        .filter((idea) => typeof idea === "string" && idea.trim().length > 0)
        .map((idea) => ({ idea }));
    }

    const singleIdea = profile?.business_idea?.trim();
    if (!singleIdea) return [];

    try {
      const parsed = JSON.parse(singleIdea);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((idea) => typeof idea === "string" && idea.trim().length > 0)
          .map((idea) => ({ idea }));
      }
    } catch {
      // Keep backward compatibility when this field is plain text.
    }

    return [{ idea: singleIdea }];
  })();

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
    const iconColor = accentColor || theme.brand.primary;

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
              { backgroundColor: iconColor + "15" },
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
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            {profile?.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                style={[
                  styles.avatar,
                  {
                    borderColor: theme.brand.primary,
                    shadowColor: theme.brand.primary,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: theme.brand.primary,
                    shadowColor: theme.brand.primary,
                  },
                ]}
              >
                <Text
                  style={[styles.avatarInitial, { color: theme.brand.primary }]}
                >
                  {userName.charAt(0).toUpperCase() || "P"}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.userName, { color: theme.text.primary }]}>
            {userName}
          </Text>
          <Text style={[styles.userEmail, { color: theme.text.secondary }]}>
            {userEmail}
          </Text>
          <TouchableOpacity
            style={[styles.editProfileBtn, { borderColor: theme.brand.primary }]}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={theme.brand.primary} />
            <Text style={[styles.editProfileBtnText, { color: theme.brand.primary }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: theme.brand.primary }]}>
              {stats.articlesRead}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>
              ARTICLES
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: theme.brand.primary }]}>
              {stats.bookmarks}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>
              BOOKMARKS
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: theme.brand.primary }]}>
              {stats.likes}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>
              LIKES
            </Text>
          </View>
        </View>

        {/* Content Sections */}
        <View style={styles.sectionsContainer}>
          {/* About Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              ABOUT
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              {profile?.bio ? (
                <View style={styles.cardContent}>
                  <Text style={[styles.bodyText, { color: theme.text.secondary }]}>
                    {profile.bio}
                  </Text>
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={[styles.emptyText, { color: theme.text.muted }]}>
                    Add a bio via Edit Profile
                  </Text>
                </View>
              )}
              {profile?.linkedin_url && (
                <TouchableOpacity
                  style={[styles.linkedinRow, { borderTopColor: theme.border }]}
                  onPress={() => openURL(profile.linkedin_url!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
                  <Text
                    style={[styles.linkedinText, { color: theme.brand.primary }]}
                    numberOfLines={1}
                  >
                    LinkedIn Profile
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={14}
                    color={theme.text.muted}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Business Idea Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              BUSINESS IDEAS
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              {businessIdeas.length > 0 ? (
                <View style={styles.cardContent}>
                  {businessIdeas.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.experienceItem,
                        index < businessIdeas.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.experienceDot,
                          { backgroundColor: theme.brand.primary },
                        ]}
                      />
                      <Text style={[styles.bodyText, { color: theme.text.secondary, flex: 1 }]}>
                        {item.idea}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={[styles.emptyText, { color: theme.text.muted }]}>
                    Share your business ideas via Edit Profile
                  </Text>
                </View>
              )}
              {ideaVideoUrl && (
                <TouchableOpacity
                  style={[styles.videoRow, { borderTopColor: theme.border }]}
                  onPress={() => openURL(ideaVideoUrl)}
                  activeOpacity={0.7}
                >
                  {videoThumbnail ? (
                    <Image
                      source={{ uri: videoThumbnail }}
                      style={styles.videoThumb}
                    />
                  ) : (
                    <View
                      style={[
                        styles.videoThumb,
                        { backgroundColor: theme.surfaceElevated, justifyContent: "center", alignItems: "center" },
                      ]}
                    >
                      <Ionicons name="play-circle" size={24} color={theme.text.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.videoLabel, { color: theme.text.primary }]}>
                      Pitch Video
                    </Text>
                    <Text style={[styles.videoUrl, { color: theme.text.muted }]} numberOfLines={1}>
                      {ideaVideoUrl}
                    </Text>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={14}
                    color={theme.text.muted}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Experience Section */}
          {previousWorks.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                EXPERIENCE
              </Text>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                {previousWorks.map((work, index) => (
                  <View
                    key={index}
                    style={[
                      styles.experienceItem,
                      index < previousWorks.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.experienceDot,
                        { backgroundColor: theme.brand.primary },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.experienceRole, { color: theme.text.primary }]}
                      >
                        {work.role}
                      </Text>
                      <Text
                        style={[styles.experienceCompany, { color: theme.text.secondary }]}
                      >
                        {work.company}
                      </Text>
                      <Text
                        style={[styles.experienceDuration, { color: theme.text.muted }]}
                      >
                        {work.duration}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Social Links Section */}
          {socialLinks.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
                SOCIAL LINKS
              </Text>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                {socialLinks.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.socialItem,
                      index < socialLinks.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}
                    onPress={() => openURL(link.url)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.socialIconWrap,
                        { backgroundColor: theme.brand.primary + "15" },
                      ]}
                    >
                      <Ionicons
                        name={
                          (PLATFORM_ICONS[String(link.platform || "").toLowerCase()] ||
                            "link-outline") as any
                        }
                        size={18}
                        color={theme.brand.primary}
                      />
                    </View>
                    <Text
                      style={[styles.socialLabel, { color: theme.text.primary }]}
                      numberOfLines={1}
                    >
                      {link.label || link.platform}
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={theme.text.muted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              PERSONALIZATION
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <MenuItem
                icon="heart"
                title="Edit Interests"
                subtitle="Customize your news feed"
                onPress={handleEditInterests}
              />
              <MenuItem
                icon="notifications"
                title="Notifications"
                subtitle="Manage your alerts"
                onPress={() => triggerHaptic()}
              />
            </View>
          </View>

          {/* Appearance Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              APPEARANCE
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <MenuItem
                icon="moon"
                title="Theme"
                subtitle={themeMode === "light" ? "Light Mode" : "Dark Mode"}
                showChevron={false}
                rightElement={
                  <View
                    style={[
                      styles.themeToggle,
                      { backgroundColor: theme.border },
                    ]}
                  >
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
                }
              />
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text.muted }]}>
              ACCOUNT
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <MenuItem
                icon="log-out"
                title="Logout"
                subtitle="Sign out of your account"
                onPress={handleLogout}
                accentColor="#EF4444"
              />
            </View>
          </View>
        </View>

        {/* App Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerVersion, { color: theme.text.muted }]}>
            dayStart.ai V1.0
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
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarWrapper: {
    marginBottom: 20,
    position: "relative",
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  avatarInitial: {
    fontSize: 50,
    fontFamily: Typography.fonts.primary,
  },
  userName: {
    fontSize: 28,
    fontFamily: Typography.fonts.primary,
    marginBottom: 4,
    textAlign: "center",
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 16,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 40,
  },
  statBox: {
    width: (width - 60) / 3,
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontFamily: Typography.fonts.primary,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionsContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
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
    width: 44,
    height: 44,
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
});
