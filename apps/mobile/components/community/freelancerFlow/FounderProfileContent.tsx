import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";

import AppearanceModal from "@/components/AppearanceModal";
import ProfileOverviewSheet from "@/components/ProfileOverviewSheet";
import StatusToggleSwitch from "@/components/StatusToggleSwitch";
import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { gigService } from "@/lib/gigService";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type PreviousWork = { company?: string; role?: string; duration?: string; description?: string };
type SocialLink = { platform?: string; url?: string; label?: string };

type ProfileData = {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  user_type?: "founder" | "freelancer" | "both" | null;
  contact?: string | null;
  address?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  role?: string | null;
  previous_works?: PreviousWork[] | null;
  social_links?: SocialLink[] | null;
  business_ideas?: string[] | null;
  idea_video_url?: string | null;
  idea_video_urls?: string[] | null;
  updated_at?: string | null;
};

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }

  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred = files.find((file) => /^avatar\./i.test(file.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

function compactLocation(raw: unknown): string | null {
  if (typeof raw === "string") {
    const value = raw.trim();
    return value.length > 0 ? value : null;
  }
  if (raw && typeof raw === "object") {
    const city = typeof (raw as any).city === "string" ? (raw as any).city.trim() : "";
    const state = typeof (raw as any).state === "string" ? (raw as any).state.trim() : "";
    const country = typeof (raw as any).country === "string" ? (raw as any).country.trim() : "";
    const line = [city, state, country].filter(Boolean).join(", ");
    return line.length > 0 ? line : null;
  }
  return null;
}

function socialLabel(item: SocialLink): string {
  const fallback = item.label || item.platform || "Link";
  const raw = String(item.url || "").trim();
  if (!raw) return fallback;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(normalized).hostname.replace(/^www\./i, "");
    return item.label || host || fallback;
  } catch {
    return fallback;
  }
}

function socialMeta(item: SocialLink): string {
  const platform = String(item.platform || "").trim();
  if (platform) return platform;
  const raw = String(item.url || "").trim();
  if (!raw) return "Profile";
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(normalized).hostname.replace(/^www\./i, "");
    return host || "Profile";
  } catch {
    return "Profile";
  }
}

function SectionTitle({ color, title }: { color: string; title: string }) {
  const { palette } = useFlowPalette();

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionBar, { backgroundColor: color }]} />
      <T weight="bold" color={palette.subText} style={styles.sectionHeaderText}>
        {title}
      </T>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress?: () => void;
  valueColor?: string;
}) {
  const { palette } = useFlowPalette();
  const isPressable = typeof onPress === "function";

  return (
    <TouchableOpacity activeOpacity={0.85} disabled={!isPressable} style={styles.detailRow} onPress={onPress}>
      <View style={styles.detailRowLeft}>
        <View style={[styles.detailIcon, { backgroundColor: palette.card }]}>
          <Ionicons name={icon} size={16} color="#9CA3AF" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="medium" color={valueColor || palette.text} style={styles.detailValue} numberOfLines={2}>
            {value || "Not provided"}
          </T>
          <T weight="regular" color={palette.subText} style={styles.detailLabel}>
            {label}
          </T>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MoreRow({
  icon,
  title,
  subtitle,
  onPress,
  isLogout,
  trailingIcon,
  showChevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string | null;
  onPress?: () => void;
  isLogout?: boolean;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  showChevron?: boolean;
}) {
  const { palette } = useFlowPalette();
  const isPressable = typeof onPress === "function";
  const resolvedSubtitle = subtitle || (isLogout ? "Sign out from this account" : null);
  const shouldShowChevron = !isLogout && (showChevron ?? isPressable);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!isPressable}
      style={styles.moreRow}
      onPress={onPress}
    >
      <View style={styles.moreRowLeft}>
        <View style={[styles.moreIcon, { backgroundColor: palette.card }]}>
          <Ionicons name={icon} size={16} color={isLogout ? "#E23744" : "#9CA3AF"} />
        </View>
        <View>
          <T weight={isLogout ? "semiBold" : "medium"} color={isLogout ? "#E23744" : palette.text} style={styles.moreTitle}>
            {title}
          </T>
          {resolvedSubtitle && (
            <T weight="regular" color={isLogout ? "#C2414A" : palette.subText} style={styles.moreSubtitle}>
              {resolvedSubtitle}
            </T>
          )}
        </View>
      </View>
      {shouldShowChevron && (
        <View style={styles.moreRight}>
          {trailingIcon ? <Ionicons name={trailingIcon} size={15} color="#9CA3AF" /> : null}
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      )}
      {!isLogout ? <View pointerEvents="none" style={styles.moreRowDivider} /> : null}
    </TouchableOpacity>
  );
}

function asSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

type FounderProfileContentProps = {
  showBackButton?: boolean;
  title?: string;
};
type OverviewSection = "personal" | "experience" | "ideas" | "social";

export default function FounderProfileScreen({
  showBackButton = false,
  title = "Profile",
}: FounderProfileContentProps) {
  const { palette, isDark } = useFlowPalette();
  const { themeMode } = useTheme();
  const nav = useFlowNav();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";
  const params = useLocalSearchParams<{ id?: string | string[]; compact?: string | string[] }>();
  const requestedProfileId = asSingleParam(params.id);
  const compactParam = asSingleParam(params.compact).toLowerCase();
  const isCompactProfile = compactParam === "1" || compactParam === "true";
  const profileUserId = requestedProfileId || currentUserId;
  const hasRequestedProfile = Boolean(requestedProfileId);
  const isViewingOtherProfile = Boolean(profileUserId && currentUserId && profileUserId !== currentUserId);
  const isReadOnlyProfileView = hasRequestedProfile || isViewingOtherProfile || isCompactProfile || showBackButton;

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [activeOverviewSection, setActiveOverviewSection] = useState<OverviewSection | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const userId = profileUserId;
      if (!userId) {
        setProfile(null);
        return;
      }
      const meta = session?.user?.user_metadata || {};
      const metaProfile = meta?.profile_data || {};
      const fallbackProfileData = isViewingOtherProfile ? {} : metaProfile;

      let db: any = null;
      if (session?.access_token) {
        try {
          if (isViewingOtherProfile) {
            db = await tribeApi.getPublicProfile(session.access_token, userId);
          } else {
            db = await tribeApi.getMyProfile(session.access_token);
          }
        } catch {
          db = null;
        }
      }

      const resolvedAvatar =
        (await resolveAvatar(db?.photo_url || db?.avatar_url || null, userId)) ||
        null;

      const merged: ProfileData = {
        id: userId,
        display_name: db?.display_name || db?.username || "User",
        username: db?.username || null,
        bio: db?.bio ?? fallbackProfileData?.bio ?? null,
        avatar_url: resolvedAvatar,
        photo_url: resolvedAvatar,
        user_type: (db?.user_type || meta?.user_type || meta?.role || "founder") as any,
        contact: db?.contact ?? fallbackProfileData?.contact ?? null,
        address: db?.address ?? fallbackProfileData?.address ?? null,
        location: compactLocation(db?.location ?? fallbackProfileData?.location),
        linkedin_url: db?.linkedin_url ?? fallbackProfileData?.linkedin_url ?? null,
        role: db?.role ?? fallbackProfileData?.role ?? null,
        previous_works:
          (Array.isArray(db?.previous_works) && db.previous_works) ||
          (Array.isArray(fallbackProfileData?.previous_works) ? fallbackProfileData.previous_works : []),
        social_links:
          (Array.isArray(db?.social_links) && db.social_links) ||
          (Array.isArray(fallbackProfileData?.social_links) ? fallbackProfileData.social_links : []),
        business_ideas:
          (Array.isArray(db?.business_ideas) && db.business_ideas) ||
          (Array.isArray(fallbackProfileData?.business_ideas) ? fallbackProfileData.business_ideas : []),
        idea_video_url: db?.idea_video_url ?? fallbackProfileData?.idea_video_url ?? null,
        idea_video_urls:
          (Array.isArray(db?.idea_video_urls) && db.idea_video_urls) ||
          (Array.isArray(fallbackProfileData?.idea_video_urls) ? fallbackProfileData.idea_video_urls : []),
        updated_at: db?.updated_at ?? null,
      };

      setProfile(merged);
    } catch (error: any) {
      setLoadError(String(error?.message || "Failed to load profile"));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isViewingOtherProfile, profileUserId, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([loadProfile()]);
    setRefreshing(false);
  }, [loadProfile]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const works = profile?.previous_works || [];
  const links = (profile?.social_links || []).filter((item) => item?.url);
  const pitchUrls = Array.from(
    new Set(
      [
        ...(Array.isArray(profile?.idea_video_urls) ? profile.idea_video_urls : []),
        profile?.idea_video_url || "",
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );

  const businessIdeaItems = (Array.isArray(profile?.business_ideas) ? profile.business_ideas : [])
    .map((idea, index) => ({
      idea: String(idea || "").trim(),
      pitchUrl: pitchUrls[index] || null,
    }))
    .filter((item) => item.idea.length > 0);

  const openUrl = (url: string) => {
    const value = String(url || "").trim();
    if (!value) return;
    const safe = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    Linking.canOpenURL(safe).then((canOpen) => {
      if (canOpen) Linking.openURL(safe).catch(() => {});
    });
  };

  const appearanceLabel = themeMode === "system" ? "System" : isDark ? "Dark" : "Light";
  const isFounderProfile = String(profile?.user_type || "").toLowerCase() === "founder";
  const availabilityLabel = isFounderProfile ? "Open to Hire" : "Open to Work";
  const roleBadgeLabel = String(profile?.user_type || profile?.role || "Founder")
    .toLowerCase()
    .includes("freelancer")
    ? "Freelancer"
    : "Founder";
  const heroName = profile?.display_name || profile?.username || "User";
  const heroHeadline = String(profile?.bio || "").trim() || "Building the future with purpose.";
  const personalRoleValue = String(profile?.role || roleBadgeLabel || "Founder").trim() || "Founder";
  const personalLocationValue = String(profile?.location || profile?.address || "Location unavailable").trim();
  const personalPhoneValue = String(profile?.contact || "Not provided").trim() || "Not provided";
  const linkedInValue = profile?.linkedin_url
    ? socialMeta({ url: profile.linkedin_url, platform: "LinkedIn", label: "LinkedIn" })
    : "No LinkedIn";
  const connectTargetUrl = String(profile?.linkedin_url || links[0]?.url || "").trim();
  const canConnect = Boolean(connectTargetUrl);
  const connectItems = (() => {
    // LinkedIn is already shown in Personal Details, so exclude it from Connect & Profiles
    const linkedInUrl = String(profile?.linkedin_url || "").trim().toLowerCase();
    return links
      .filter((item) => {
        const url = String(item?.url || "").trim().toLowerCase();
        return url && (!linkedInUrl || url !== linkedInUrl);
      })
      .slice(0, 3);
  })();

  const onMessagePress = useCallback(async () => {
    const inFreelancerTabs = pathname.includes("/(role-pager)/(freelancer-tabs)/");
    const threadBasePath = inFreelancerTabs
      ? "/(role-pager)/(freelancer-tabs)"
      : "/(role-pager)/(founder-tabs)";
    const fallbackRoute = inFreelancerTabs
      ? "/(role-pager)/(freelancer-tabs)/messages"
      : "/(role-pager)/(founder-tabs)/connections";
    const targetUserId = String(profile?.id || requestedProfileId || "").trim();
    const viewerUserId = String(currentUserId || "").trim();

    if (!targetUserId || !viewerUserId || targetUserId === viewerUserId) {
      router.push(fallbackRoute as any);
      return;
    }

    const profileName = String(profile?.display_name || profile?.username || "Founder").trim() || "Founder";
    const avatar = String(profile?.photo_url || profile?.avatar_url || "").trim();
    const initialMessage = `Hi ${profileName}, I'd like to connect.`;

    try {
      const { items = [] } = await gigService.getServiceRequests({ limit: 100 });
      const existing = items.find((request) => {
        const founderId = String(request?.founder_id || "");
        const freelancerId = String(request?.freelancer_id || "");
        return (
          (founderId === viewerUserId && freelancerId === targetUserId) ||
          (founderId === targetUserId && freelancerId === viewerUserId)
        );
      });

      let requestId = existing?.id;
      if (!requestId) {
        const request = await gigService.createServiceRequest({
          freelancer_id: targetUserId,
          message: initialMessage,
        });
        requestId = request?.id;
      }

      if (!requestId) {
        router.push(fallbackRoute as any);
        return;
      }

      router.push(
        `${threadBasePath}/thread/${encodeURIComponent(requestId)}?threadKind=service&title=${encodeURIComponent(
          profileName,
        )}&avatar=${encodeURIComponent(avatar)}` as any,
      );
    } catch {
      router.push(fallbackRoute as any);
    }
  }, [
    currentUserId,
    pathname,
    profile?.avatar_url,
    profile?.display_name,
    profile?.id,
    profile?.photo_url,
    profile?.username,
    requestedProfileId,
    router,
  ]);

  const onConnectPress = useCallback(() => {
    if (connectTargetUrl) openUrl(connectTargetUrl);
  }, [connectTargetUrl]);

  const selectAppearance = () => {
    setShowAppearanceModal(true);
  };
  const activeOverviewTitle =
    activeOverviewSection === "personal"
      ? "Personal Details"
      : activeOverviewSection === "experience"
        ? "Experience"
        : activeOverviewSection === "ideas"
          ? "Business Ideas"
          : "Connect & Profiles";

  const renderPersonalContent = (mode: "sheet" | "inline" = "sheet") => {
    if (!profile) return null;

    if (mode === "sheet") {
      return (
        <View>
          <DetailRow icon="call-outline" label="Phone" value={profile.contact} />
          <DetailRow icon="home-outline" label="Address" value={profile.address} />
          <DetailRow icon="location-outline" label="Location" value={profile.location} />
          <DetailRow
            icon="link-outline"
            label="LinkedIn"
            value={profile.linkedin_url}
            valueColor={profile.linkedin_url ? "#3B82F6" : undefined}
            onPress={profile.linkedin_url ? () => openUrl(profile.linkedin_url as string) : undefined}
          />
          <DetailRow icon="briefcase-outline" label="Role" value={profile.role} />
        </View>
      );
    }

    const roleValue = String(profile.role || "Not set");
    const locationValue = [profile.location, profile.address]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(" • ") || "Not set";
    const phoneValue = String(profile.contact || "Not set");
    const linkedInValue = profile.linkedin_url ? socialMeta({ url: profile.linkedin_url }) : "Not set";
    const canOpenLinkedIn = Boolean(profile.linkedin_url);

    return (
      <View
        style={[
          styles.readOnlyPersonalSummary,
          { borderColor: palette.borderLight, backgroundColor: palette.surface },
        ]}
      >
        <View style={styles.readOnlyPersonalRow}>
          <View
            style={[
              styles.readOnlyPersonalItem,
              { borderColor: palette.borderLight, backgroundColor: palette.card },
            ]}
          >
            <Ionicons name="briefcase-outline" size={13} color="#B45309" />
            <T weight="medium" color={palette.text} style={styles.readOnlyPersonalItemText} numberOfLines={1}>
              Role: {roleValue}
            </T>
          </View>
          <View
            style={[
              styles.readOnlyPersonalItem,
              { borderColor: palette.borderLight, backgroundColor: palette.card },
            ]}
          >
            <Ionicons name="location-outline" size={13} color="#0F766E" />
            <T weight="medium" color={palette.text} style={styles.readOnlyPersonalItemText} numberOfLines={1}>
              Location: {locationValue}
            </T>
          </View>
        </View>

        <View style={styles.readOnlyPersonalRow}>
          <View
            style={[
              styles.readOnlyPersonalItem,
              { borderColor: palette.borderLight, backgroundColor: palette.card },
            ]}
          >
            <Ionicons name="call-outline" size={13} color="#1D4ED8" />
            <T weight="medium" color={palette.text} style={styles.readOnlyPersonalItemText} numberOfLines={1}>
              Phone: {phoneValue}
            </T>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={!canOpenLinkedIn}
            style={[
              styles.readOnlyPersonalItem,
              canOpenLinkedIn
                ? { borderColor: "rgba(37, 99, 235, 0.28)", backgroundColor: "rgba(37, 99, 235, 0.08)" }
                : { borderColor: palette.borderLight, backgroundColor: palette.card },
            ]}
            onPress={canOpenLinkedIn ? () => openUrl(profile.linkedin_url as string) : undefined}
          >
            <Ionicons name="link-outline" size={13} color={canOpenLinkedIn ? "#2563EB" : "#64748B"} />
            <T weight="medium" color={palette.text} style={styles.readOnlyPersonalItemText} numberOfLines={1}>
              LinkedIn: {linkedInValue}
            </T>
            {canOpenLinkedIn ? <Ionicons name="chevron-forward" size={13} color="#94A3B8" /> : null}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderIdeasContent = (mode: "sheet" | "inline" = "sheet") => {
    const isInlineMode = mode === "inline";
    const visibleIdeas = isInlineMode ? businessIdeaItems.slice(0, 2) : businessIdeaItems;

    if (!isInlineMode) {
      return (
        <View style={styles.sectionStack}>
          {visibleIdeas.length === 0 ? (
            <T weight="regular" color={palette.subText} style={styles.emptyText}>
              No business ideas added.
            </T>
          ) : (
            visibleIdeas.map((item, index) => (
              <View
                key={`idea-${mode}-${index}`}
                style={[
                  styles.businessIdeaCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.borderLight,
                  },
                ]}
              >
                <View style={styles.ideaHead}>
                  <View style={styles.ideaHeadLeft}>
                    <View style={[styles.ideaIndexTag, { borderColor: "rgba(226,55,68,0.28)" }]}>
                      <T weight="bold" color="#E23744" style={styles.ideaIndexText}>
                        Idea {index + 1}
                      </T>
                    </View>
                  </View>
                  <View style={styles.ideaIconWrap}>
                    <Ionicons name="bulb-outline" size={15} color="#6B7280" />
                  </View>
                </View>
                <T weight="regular" color={palette.subText} style={styles.businessIdeaText}>
                  {item.idea}
                </T>
                {!!item.pitchUrl && (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={[styles.pitchCta, { borderColor: "#E23744" }]}
                    onPress={() => openUrl(item.pitchUrl as string)}
                  >
                    <Ionicons name="link-outline" size={16} color="#E23744" />
                    <T weight="medium" color="#E23744" style={styles.pitchTagText}>
                      Pitch Video
                    </T>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      );
    }

    return (
      <View style={styles.readOnlyIdeaList}>
        {visibleIdeas.length === 0 ? (
          <T weight="regular" color={palette.subText} style={styles.readOnlyEmptyText}>
            No business ideas added.
          </T>
        ) : (
          visibleIdeas.map((item, index) => (
            <View
              key={`idea-${mode}-${index}`}
              style={[
                styles.readOnlyIdeaCard,
                { borderColor: palette.borderLight, backgroundColor: palette.surface },
              ]}
            >
              <View style={styles.readOnlyIdeaHead}>
                <T weight="bold" color="#D97706" style={styles.readOnlyIdeaIndex}>
                  Idea {index + 1}
                </T>
                {!!item.pitchUrl ? <Ionicons name="link-outline" size={14} color="#D97706" /> : null}
              </View>
              <T weight="regular" color={palette.text} style={styles.readOnlyIdeaText} numberOfLines={4}>
                {item.idea}
              </T>
              {!!item.pitchUrl && (
                <TouchableOpacity
                  activeOpacity={0.82}
                  style={styles.readOnlyIdeaLink}
                  onPress={() => openUrl(item.pitchUrl as string)}
                >
                  <T weight="semiBold" color="#D97706" style={styles.readOnlyIdeaLinkText}>
                    Open pitch
                  </T>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        {businessIdeaItems.length > visibleIdeas.length ? (
          <T weight="medium" color={palette.subText} style={styles.readOnlyHintText}>
            +{businessIdeaItems.length - visibleIdeas.length} more ideas
          </T>
        ) : null}
      </View>
    );
  };

  const renderExperienceContent = (mode: "sheet" | "inline" = "sheet") => {
    const isInlineMode = mode === "inline";
    const visibleWorks = isInlineMode ? works.slice(0, 3) : works;

    return (
      <View style={isInlineMode ? styles.readOnlyExperienceList : undefined}>
        {visibleWorks.length === 0 ? (
          <T
            weight="regular"
            color={palette.subText}
            style={isInlineMode ? styles.readOnlyEmptyText : styles.emptyText}
          >
            No experience items added yet.
          </T>
        ) : (
          visibleWorks.map((work, index) => {
            const duration = work.duration || "Duration";
            const description = String(work.description || "").trim();
            const isCurrent = /present|current/i.test(duration);
            return (
              <View
                key={`${work.company || "work"}-${mode}-${index}`}
                style={[
                  styles.workCard,
                  isInlineMode
                    ? [
                        styles.inlineWorkCard,
                        { borderColor: palette.borderLight, backgroundColor: palette.surface },
                      ]
                    : null,
                ]}
              >
                <View
                  style={[
                    styles.workIconWrap,
                    isInlineMode ? styles.inlineWorkIconWrap : null,
                    {
                      backgroundColor: isInlineMode
                        ? "rgba(14, 165, 233, 0.12)"
                        : "rgba(59, 130, 246, 0.1)",
                    },
                  ]}
                >
                  <Ionicons name="code-slash-outline" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T
                    weight="semiBold"
                    color={palette.text}
                    style={[styles.workRole, isInlineMode ? styles.inlineWorkRole : null]}
                    numberOfLines={1}
                  >
                    {work.role || "Role"}
                  </T>
                  <T
                    weight="regular"
                    color={palette.subText}
                    style={[styles.workCompany, isInlineMode ? styles.inlineWorkCompany : null]}
                    numberOfLines={1}
                  >
                    {work.company || "Company"}
                  </T>
                  {!!description && (
                    <T
                      weight="regular"
                      color={palette.subText}
                      style={[styles.workDescription, isInlineMode ? styles.inlineWorkDescription : null]}
                      numberOfLines={isInlineMode ? 2 : 3}
                    >
                      {description}
                    </T>
                  )}
                  <View style={[styles.workMetaRow, isInlineMode ? styles.inlineWorkMetaRow : null]}>
                    {isCurrent ? (
                      <View style={styles.currentTag}>
                        <T weight="medium" color="#2F9254" style={styles.currentTagText}>
                          Current
                        </T>
                      </View>
                    ) : null}
                    <T weight="regular" color="#9CA3AF" style={styles.workDuration} numberOfLines={1}>
                      {duration}
                    </T>
                  </View>
                </View>
              </View>
            );
          })
        )}
        {works.length > visibleWorks.length ? (
          <T weight="medium" color={palette.subText} style={styles.readOnlyHintText}>
            +{works.length - visibleWorks.length} more experience entries
          </T>
        ) : null}
      </View>
    );
  };

  const renderSocialContent = (mode: "sheet" | "inline" = "sheet") => {
    const isInlineMode = mode === "inline";
    const visibleLinks = isInlineMode ? links.slice(0, 4) : links;

    if (!isInlineMode) {
      return (
        <View>
          {visibleLinks.length === 0 ? (
            <MoreRow icon="globe-outline" title="No social links added" subtitle="Add links to your profile" />
          ) : (
            visibleLinks.map((item, index) => (
              <MoreRow
                key={`${item.platform || "link"}-${mode}-${index}`}
                icon="globe-outline"
                title={socialLabel(item)}
                subtitle={item.url || undefined}
                onPress={() => openUrl(String(item.url || ""))}
              />
            ))
          )}
        </View>
      );
    }

    return (
      <View style={styles.readOnlySocialList}>
        {visibleLinks.length === 0 ? (
          <T weight="regular" color={palette.subText} style={styles.readOnlyEmptyText}>
            No social links added.
          </T>
        ) : (
          visibleLinks.map((item, index) => (
            <TouchableOpacity
              key={`${item.platform || "link"}-${mode}-${index}`}
              activeOpacity={0.82}
              style={[
                styles.readOnlySocialRow,
                { borderColor: palette.borderLight, backgroundColor: palette.surface },
              ]}
              onPress={() => openUrl(String(item.url || ""))}
            >
              <View style={styles.readOnlySocialIconWrap}>
                <Ionicons name="globe-outline" size={15} color="#2563EB" />
              </View>
              <View style={styles.readOnlySocialText}>
                <T weight="semiBold" color={palette.text} style={styles.readOnlySocialTitle} numberOfLines={1}>
                  {socialLabel(item)}
                </T>
                <T weight="regular" color={palette.subText} style={styles.readOnlySocialUrl} numberOfLines={1}>
                  {socialMeta(item)}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        )}
        {links.length > visibleLinks.length ? (
          <T weight="medium" color={palette.subText} style={styles.readOnlyHintText}>
            +{links.length - visibleLinks.length} more links
          </T>
        ) : null}
      </View>
    );
  };

  const renderOverviewContent = () => {
    if (!profile) return null;

    if (activeOverviewSection === "personal") return renderPersonalContent("sheet");

    if (activeOverviewSection === "experience") return renderExperienceContent("sheet");

    if (activeOverviewSection === "ideas") return renderIdeasContent("sheet");

    return renderSocialContent("sheet");
  };

  if (isReadOnlyProfileView) {
    return (
      <View style={[styles.previewScreen, { backgroundColor: palette.bg }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.previewHeader, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}>
          <TouchableOpacity activeOpacity={0.82} style={styles.previewHeaderButton} onPress={nav.back}>
            <Ionicons name="arrow-back" size={18} color={palette.text} />
          </TouchableOpacity>
          <T weight="bold" color={palette.text} style={styles.previewHeaderTitle} numberOfLines={1}>
            {title.toUpperCase()}
          </T>
          <View style={styles.previewHeaderButton}>
            <Ionicons name="ellipsis-vertical" size={16} color={palette.subText} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
        >
          <View style={styles.previewContent}>
            {loading && !profile ? (
              <View style={styles.previewCardWrap}>
                <LoadingState rows={4} />
              </View>
            ) : null}

            {!loading && !profile ? (
              <View style={styles.previewCardWrap}>
                <ErrorState
                  title="Failed to load profile"
                  message={loadError || "Profile not available"}
                  onRetry={loadProfile}
                />
              </View>
            ) : null}

            {!loading && profile ? (
              <>
                <View style={styles.previewHeroCard}>
                  <View style={styles.previewAvatarRing}>
                    <Avatar source={profile.photo_url || profile.avatar_url} size={104} />
                    <View style={[styles.previewStatusDot, { borderColor: palette.bg }]} />
                  </View>

                  <T weight="semiBold" color={palette.text} style={styles.previewName} numberOfLines={2}>
                    {heroName}
                  </T>
                  <T weight="regular" color={palette.subText} style={styles.previewHeadline} numberOfLines={2}>
                    {heroHeadline}
                  </T>

                  <View style={styles.previewBadgeRow}>
                    <View style={[styles.previewFounderBadge, { borderColor: "rgba(251, 113, 133, 0.38)", backgroundColor: "rgba(251, 113, 133, 0.12)" }]}>
                      <T weight="bold" color="#FB7185" style={styles.previewBadgeText}>
                        {roleBadgeLabel}
                      </T>
                    </View>
                    <View style={[styles.previewAvailabilityBadge, { borderColor: "rgba(52, 211, 153, 0.34)", backgroundColor: "rgba(52, 211, 153, 0.12)" }]}>
                      <T weight="bold" color="#34D399" style={styles.previewBadgeText}>
                        {availabilityLabel}
                      </T>
                    </View>
                  </View>

                  <View style={styles.previewActionRow}>
                    <TouchableOpacity 
                      activeOpacity={0.86} 
                      style={[styles.previewPrimaryAction, { backgroundColor: palette.accent, borderWidth: 1, borderColor: palette.accent }]} 
                      onPress={onMessagePress}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                      <T weight="semiBold" color="#FFFFFF" style={styles.previewActionText}>
                        Message
                      </T>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={[styles.previewSecondaryAction, !canConnect ? styles.previewSecondaryActionDisabled : { borderColor: palette.accent, backgroundColor: palette.surface }]}
                      disabled={!canConnect}
                      onPress={onConnectPress}
                    >
                      <Ionicons name="person-add-outline" size={16} color={canConnect ? palette.accent : palette.subText} />
                      <T weight="semiBold" color={canConnect ? palette.accent : palette.subText} style={styles.previewActionText}>
                        Connect
                      </T>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.previewSectionWrap}>
                  <View style={styles.previewSectionHeader}>
                    <View style={[styles.previewSectionAccent, { backgroundColor: "#F97316" }]} />
                    <T weight="bold" color={palette.subText} style={styles.previewSectionTitle}>
                      PERSONAL DETAILS
                    </T>
                  </View>

                  <View style={[styles.previewCardWrap, { backgroundColor: palette.card, borderColor: palette.borderLight }]}>
                    <View style={styles.previewDetailRow}>
                      <View style={[styles.previewDetailChip, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                        <Ionicons name="briefcase-outline" size={14} color="#F59E0B" />
                        <T weight="medium" color={palette.text} style={styles.previewDetailText} numberOfLines={1}>
                          {personalRoleValue}
                        </T>
                      </View>

                      <View style={[styles.previewDetailChip, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                        <Ionicons name="location-outline" size={14} color="#34D399" />
                        <T weight="medium" color={palette.text} style={styles.previewDetailText} numberOfLines={1}>
                          {personalLocationValue}
                        </T>
                      </View>
                    </View>

                    <View style={styles.previewDetailRow}>
                      <View style={[styles.previewDetailChip, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                        <Ionicons name="call-outline" size={14} color="#60A5FA" />
                        <T weight="medium" color={palette.text} style={styles.previewDetailText} numberOfLines={1}>
                          {personalPhoneValue}
                        </T>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.84}
                        disabled={!profile.linkedin_url}
                        style={[styles.previewDetailChip, { backgroundColor: palette.surface, borderColor: palette.borderLight }, !profile.linkedin_url ? { opacity: 0.5 } : null]}
                        onPress={profile.linkedin_url ? () => openUrl(profile.linkedin_url as string) : undefined}
                      >
                        <Ionicons
                          name="link-outline"
                          size={14}
                          color={palette.subText}
                        />
                        <T
                          weight="medium"
                          color={palette.subText}
                          style={styles.previewDetailText}
                          numberOfLines={1}
                        >
                          {linkedInValue}
                        </T>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.previewSectionWrap}>
                  <View style={styles.previewSectionHeader}>
                    <View style={[styles.previewSectionAccent, { backgroundColor: "#F59E0B" }]} />
                    <T weight="bold" color={palette.subText} style={styles.previewSectionTitle}>
                      PROFESSIONAL OVERVIEW
                    </T>
                  </View>

                  <View style={[styles.previewCardWrap, { backgroundColor: palette.card, borderColor: palette.borderLight }]}>
                    <View style={styles.previewPanelHeader}>
                      <View style={[styles.previewPanelIcon, { backgroundColor: "rgba(245,158,11,0.16)" }]}>
                        <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
                      </View>
                      <T weight="semiBold" color={palette.text} style={styles.previewPanelTitle}>
                        Business Ideas
                      </T>
                    </View>

                    {businessIdeaItems.length === 0 ? (
                      <T weight="regular" color={palette.subText} style={styles.previewPanelEmpty}>
                        No business ideas added.
                      </T>
                    ) : (
                      businessIdeaItems.slice(0, 2).map((item, index) => (
                        <T
                          key={`preview-idea-${index}`}
                          weight="regular"
                          color={palette.subText}
                          style={styles.previewPanelLine}
                          numberOfLines={3}
                        >
                          • {item.idea}
                        </T>
                      ))
                    )}
                  </View>
                </View>

                <View style={styles.previewSectionWrap}>
                  <View style={styles.previewSectionHeader}>
                    <View style={[styles.previewSectionAccent, { backgroundColor: "#38BDF8" }]} />
                    <T weight="bold" color={palette.subText} style={styles.previewSectionTitle}>
                      CAREER HIGHLIGHTS
                    </T>
                  </View>

                  <View style={[styles.previewCardWrap, { backgroundColor: palette.card, borderColor: palette.borderLight }]}>
                    <View style={styles.previewPanelHeader}>
                      <View style={[styles.previewPanelIcon, { backgroundColor: "rgba(56,189,248,0.16)" }]}>
                        <Ionicons name="briefcase-outline" size={14} color="#38BDF8" />
                      </View>
                      <T weight="semiBold" color={palette.text} style={styles.previewPanelTitle}>
                        Experience
                      </T>
                    </View>

                    {works.length === 0 ? (
                      <T weight="regular" color={palette.subText} style={styles.previewPanelEmpty}>
                        No experience items added yet.
                      </T>
                    ) : (
                      <View>
                        <T weight="semiBold" color={palette.text} style={styles.previewPanelLine} numberOfLines={1}>
                          {works[0].role || "Role"}
                          {works[0].company ? ` • ${works[0].company}` : ""}
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.previewPanelMeta} numberOfLines={1}>
                          {works[0].duration || "Duration unavailable"}
                        </T>
                        {String(works[0].description || "").trim() ? (
                          <T weight="regular" color={palette.subText} style={styles.previewPanelLine} numberOfLines={2}>
                            {String(works[0].description || "").trim()}
                          </T>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <View style={[styles.previewCardWrap, { backgroundColor: palette.card, borderColor: palette.borderLight }]}>
                    <View style={styles.previewPanelHeader}>
                      <View style={[styles.previewPanelIcon, { backgroundColor: "rgba(59,130,246,0.16)" }]}>
                        <Ionicons name="globe-outline" size={14} color="#60A5FA" />
                      </View>
                      <T weight="semiBold" color={palette.text} style={styles.previewPanelTitle}>
                        Connect &amp; Profiles
                      </T>
                    </View>

                    {connectItems.length === 0 ? (
                      <T weight="regular" color={palette.subText} style={styles.previewPanelEmpty}>
                        No social links added.
                      </T>
                    ) : (
                      connectItems.map((item, index) => (
                        <TouchableOpacity
                          key={`preview-social-${index}`}
                          activeOpacity={0.84}
                          style={[styles.previewSocialRow, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
                          onPress={() => openUrl(String(item.url || ""))}
                        >
                          <View style={[styles.previewSocialIconWrap, { backgroundColor: "rgba(59,130,246,0.18)" }]}>
                            <Ionicons name="link-outline" size={13} color="#60A5FA" />
                          </View>
                          <View style={styles.previewSocialText}>
                            <T weight="semiBold" color={palette.text} style={styles.previewSocialTitle} numberOfLines={1}>
                              {socialLabel(item)}
                            </T>
                            <T weight="regular" color={palette.subText} style={styles.previewSocialMeta} numberOfLines={1}>
                              {socialMeta(item)}
                            </T>
                          </View>
                          <Ionicons name="chevron-forward" size={15} color={palette.subText} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.previewBottomSpacer} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View
        style={[
          showBackButton ? styles.headerWithBack : styles.header,
          { borderBottomColor: palette.borderLight, backgroundColor: palette.surface },
        ]}
      >
        {showBackButton ? (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
            onPress={nav.back}
          >
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
        ) : null}
        <T weight="bold" color={palette.text} style={styles.pageTitle}>
          {title}
        </T>
        {showBackButton ? <View style={styles.headerSpacer} /> : null}
      </View>

      <View style={styles.heroFixedWrap}>
        <View style={styles.heroCard}>
          <View style={styles.heroDotOverlay} />
          <View style={styles.heroPatternA} />
          <View style={styles.heroPatternB} />
          <View style={styles.heroPatternC} />
          <View style={styles.heroPatternD} />

          <View style={styles.heroTop}>
            <View style={styles.avatarSection}>
              <View style={styles.heroAvatarRing}>
                <Avatar source={profile?.photo_url} size={60} />
                <View style={styles.statusDot} />
              </View>
            </View>
            <View style={styles.heroIdentityText}>
              <T weight="semiBold" color="#FFFFFF" style={styles.heroName} numberOfLines={2}>
                {profile?.display_name || profile?.username || "User"}
              </T>
              <T weight="regular" color="rgba(255,255,255,0.8)" style={styles.heroMeta} numberOfLines={1}>
                @{profile?.username || "user"}
              </T>
              {!isReadOnlyProfileView ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={styles.heroInlineAction}
                  onPress={() => router.push("/edit-profile")}
                >
                  <T weight="semiBold" color="#FFFFFF" style={styles.heroInlineActionText}>
                    Edit Profile &gt;
                  </T>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.statusRow}>
            {isReadOnlyProfileView ? (
              <View style={styles.statusPill}>
                <View style={styles.statusPillDot} />
                <T weight="semiBold" color="#FFFFFF" style={styles.statusPillText}>
                  {availabilityLabel}
                </T>
              </View>
            ) : (
              <View style={styles.statusToggleWrap}>
                <T
                  weight="semiBold"
                  color={availabilityEnabled ? "#FFFFFF" : "rgba(255,255,255,0)"}
                  style={styles.statusToggleLabel}
                >
                  {availabilityLabel}
                </T>
                <StatusToggleSwitch value={availabilityEnabled} onValueChange={setAvailabilityEnabled} />
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          {loading && !profile ? (
            <>
              <SurfaceCard style={styles.sectionCard}><LoadingState rows={2} /></SurfaceCard>
              <SurfaceCard style={styles.sectionCard}><LoadingState rows={3} /></SurfaceCard>
              <SurfaceCard style={styles.sectionCard}><LoadingState rows={3} /></SurfaceCard>
            </>
          ) : null}

          {!loading && !profile ? (
            <SurfaceCard style={styles.sectionCard}>
              <ErrorState title="Failed to load profile" message={loadError || "Profile not available"} onRetry={loadProfile} />
            </SurfaceCard>
          ) : null}

          {!isReadOnlyProfileView ? (
            <View style={styles.blockWrap}>
              <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
                <SectionTitle color="#6366F1" title="Preferences" />
                <MoreRow icon="sparkles-outline" title="Edit Interests" onPress={() => router.push("/edit-interests")} />
                <MoreRow
                  icon="color-palette-outline"
                  title="Appearance"
                  subtitle={appearanceLabel}
                  onPress={selectAppearance}
                  trailingIcon={isDark ? "moon-outline" : "sunny-outline"}
                />
              </SurfaceCard>
            </View>
          ) : null}

          {isReadOnlyProfileView ? (
            <View style={styles.blockWrap}>
              <SurfaceCard style={[styles.sectionCard, styles.readOnlySectionCard]}>
                <SectionTitle color="#F59E0B" title="Personal Details" />
                {renderPersonalContent("inline")}
              </SurfaceCard>
            </View>
          ) : null}

          <View style={styles.blockWrap}>
            <SurfaceCard style={[styles.sectionCard, isReadOnlyProfileView ? styles.readOnlySectionCard : styles.listCard]}>
              <SectionTitle color="#F59E0B" title="Professional Overview" />
              {isReadOnlyProfileView ? (
                <View style={styles.readOnlyCareerStack}>
                  <View
                    style={[
                      styles.readOnlyCareerPanel,
                      { backgroundColor: palette.card, borderColor: palette.borderLight },
                    ]}
                  >
                    <View style={styles.readOnlyCareerPanelHead}>
                      <View
                        style={[styles.readOnlyCareerPanelIconAlt, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}
                      >
                        <Ionicons name="bulb-outline" size={14} color="#D97706" />
                      </View>
                      <T weight="semiBold" color={palette.text} style={styles.readOnlyCareerPanelTitle}>
                        Business Ideas
                      </T>
                    </View>
                    {renderIdeasContent("inline")}
                  </View>
                </View>
              ) : (
                <>
                  <MoreRow icon="person-outline" title="Personal Details" onPress={() => setActiveOverviewSection("personal")} />
                  <MoreRow icon="bulb-outline" title="Business Ideas" onPress={() => setActiveOverviewSection("ideas")} />
                </>
              )}
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SurfaceCard style={[styles.sectionCard, isReadOnlyProfileView ? styles.readOnlySectionCard : styles.listCard]}>
              <SectionTitle color="#0EA5E9" title="Career Highlights" />
              {isReadOnlyProfileView ? (
                <View style={styles.readOnlyCareerStack}>
                  <View
                    style={[
                      styles.readOnlyCareerPanel,
                      { backgroundColor: palette.card, borderColor: palette.borderLight },
                    ]}
                  >
                    <View style={styles.readOnlyCareerPanelHead}>
                      <View style={styles.readOnlyCareerPanelIcon}>
                        <Ionicons name="briefcase-outline" size={14} color="#0284C7" />
                      </View>
                      <T weight="semiBold" color={palette.text} style={styles.readOnlyCareerPanelTitle}>
                        Experience
                      </T>
                    </View>
                    {renderExperienceContent("inline")}
                  </View>

                  <View
                    style={[
                      styles.readOnlyCareerPanel,
                      { backgroundColor: palette.card, borderColor: palette.borderLight },
                    ]}
                  >
                    <View style={styles.readOnlyCareerPanelHead}>
                      <View style={styles.readOnlyCareerPanelIconAlt}>
                        <Ionicons name="globe-outline" size={14} color="#2563EB" />
                      </View>
                      <T weight="semiBold" color={palette.text} style={styles.readOnlyCareerPanelTitle}>
                        Connect &amp; Profiles
                      </T>
                    </View>
                    {renderSocialContent("inline")}
                  </View>
                </View>
              ) : (
                <>
                  <MoreRow icon="briefcase-outline" title="Experience" onPress={() => setActiveOverviewSection("experience")} />
                  <MoreRow icon="globe-outline" title="Connect & Profiles" onPress={() => setActiveOverviewSection("social")} />
                </>
              )}
            </SurfaceCard>
          </View>

          {!isReadOnlyProfileView ? (
            <View style={styles.blockWrap}>
              <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
                <SectionTitle color="#0EA5E9" title="Collections" />
                <MoreRow
                  icon="bookmark-outline"
                  title="Your Bookmarks"
                  onPress={() => router.push("/(role-pager)/(founder-tabs)/bookmarks")}
                />
              </SurfaceCard>
            </View>
          ) : null}

          {!isReadOnlyProfileView ? (
            <View style={styles.blockWrap}>
              <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
                <View style={styles.logoutRowEnhance}>
                  <MoreRow
                    icon="log-out-outline"
                    title="Log out"
                    onPress={async () => {
                      await supabase.auth.signOut();
                      router.replace("/login");
                    }}
                    isLogout
                  />
                </View>
              </SurfaceCard>
            </View>
          ) : null}

          <AppearanceModal
            visible={showAppearanceModal}
            onClose={() => setShowAppearanceModal(false)}
          />
          <ProfileOverviewSheet
            visible={Boolean(activeOverviewSection)}
            title={activeOverviewTitle}
            onClose={() => setActiveOverviewSection(null)}
            showAddDetailsAction={false}
          >
            {renderOverviewContent()}
          </ProfileOverviewSheet>

          <View style={{ height: showBackButton ? 24 : 120 }} />
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerWithBack: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  pageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: 0.2,
    textAlign: "center",
    alignSelf: "center",
  },
  heroFixedWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
    gap: 12,
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
    right: -30,
    top: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(239, 68, 68, 0.28)",
  },
  heroPatternB: {
    position: "absolute",
    left: -60,
    bottom: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(59, 130, 246, 0.24)",
  },
  heroPatternC: {
    position: "absolute",
    right: 18,
    top: 28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245, 158, 11, 0.16)",
  },
  heroPatternD: {
    position: "absolute",
    left: 24,
    bottom: 18,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarSection: {
    width: 64,
    height: 64,
  },
  heroAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#121826",
  },
  heroIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 14,
  },
  heroRole: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 13,
  },
  heroInlineAction: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  heroInlineActionText: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
  statusRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  statusPillText: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  statusToggleWrap: {
    minWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    flexDirection: "column",
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  statusToggleLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  blockWrap: {
    gap: 4,
  },
  sectionHeader: {
    paddingHorizontal: 0,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 999,
  },
  sectionHeaderText: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionCard: {
    padding: 10,
    borderRadius: 14,
  },
  listCard: {
    paddingTop: 5,
    paddingBottom: 5,
    gap: 0,
  },
  readOnlySectionCard: {
    paddingTop: 6,
    paddingBottom: 10,
    gap: 0,
  },
  sectionStack: {
    marginTop: 0,
    gap: 6,
  },
  readOnlyCareerStack: {
    marginTop: 4,
    gap: 10,
  },
  readOnlyCareerPanel: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  readOnlyCareerPanelHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readOnlyCareerPanelIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14, 165, 233, 0.14)",
  },
  readOnlyCareerPanelIconAlt: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  readOnlyCareerPanelTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  readOnlyExperienceList: {
    gap: 8,
  },
  readOnlyEmptyText: {
    fontSize: 11,
    lineHeight: 14,
  },
  readOnlyPersonalSummary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  readOnlyPersonalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readOnlyPersonalItem: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 32,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  readOnlyPersonalItemText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10.8,
    lineHeight: 14,
  },
  readOnlyHintText: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 14,
  },
  detailRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  detailValue: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  detailLabel: {
    marginTop: 0,
    fontSize: 11,
    lineHeight: 14,
  },
  workCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  inlineWorkCard: {
    borderBottomWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  workIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  inlineWorkIconWrap: {
    width: 38,
    height: 38,
  },
  workRole: {
    fontSize: 12,
    lineHeight: 16,
  },
  inlineWorkRole: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  workCompany: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  inlineWorkCompany: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  workDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  inlineWorkDescription: {
    marginTop: 3,
    lineHeight: 14,
  },
  workMetaRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineWorkMetaRow: {
    marginTop: 6,
  },
  currentTag: {
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 120, 0.15)",
    paddingHorizontal: 8,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  currentTagText: {
    fontSize: 10,
    lineHeight: 13,
  },
  workDuration: {
    fontSize: 10,
    lineHeight: 13,
  },
  businessIdeaCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  readOnlyIdeaList: {
    gap: 8,
  },
  readOnlyIdeaCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  readOnlyIdeaHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readOnlyIdeaIndex: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  readOnlyIdeaText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  readOnlyIdeaLink: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.32)",
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    paddingHorizontal: 10,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  readOnlyIdeaLinkText: {
    fontSize: 10.5,
    lineHeight: 13,
  },
  ideaHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ideaHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ideaIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107,114,128,0.12)",
  },
  businessIdeaText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  ideaIndexTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    height: 22,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(226,55,68,0.08)",
  },
  ideaIndexText: {
    fontSize: 9.5,
    lineHeight: 12,
    textTransform: "uppercase",
  },
  pitchCta: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 999,
    height: 32,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pitchTagText: {
    fontSize: 11,
    lineHeight: 14,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
  readOnlySocialList: {
    gap: 8,
  },
  readOnlySocialRow: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  readOnlySocialIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  readOnlySocialText: {
    flex: 1,
    minWidth: 0,
  },
  readOnlySocialTitle: {
    fontSize: 12,
    lineHeight: 15,
  },
  readOnlySocialUrl: {
    marginTop: 1,
    fontSize: 10.5,
    lineHeight: 14,
  },
  moreRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    gap: 6,
    paddingVertical: 3,
    paddingBottom: 3,
  },
  moreRowDivider: {
    position: "absolute",
    left: 40,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: "rgba(15,23,42,0.18)",
  },
  moreRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moreRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  moreIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  moreTitle: {
    fontSize: 12,
    lineHeight: 15,
  },
  moreSubtitle: {
    marginTop: 0,
    fontSize: 11,
    lineHeight: 14,
  },
  logoutRowEnhance: {
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(226, 55, 68, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(226, 55, 68, 0.2)",
  },
  previewScreen: {
    flex: 1,
  },
  previewHeader: {
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  previewHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  previewHeaderTitle: {
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  previewHeroCard: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  previewAvatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.1)",
  },
  previewStatusDot: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 2,
  },
  previewName: {
    marginTop: 16,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  previewHeadline: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  previewBadgeRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  previewFounderBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvailabilityBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  previewActionRow: {
    marginTop: 20,
    width: "100%",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },
  previewPrimaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  previewSecondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  previewSecondaryActionDisabled: {
    borderColor: "rgba(100, 116, 139, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    opacity: 0.4,
  },
  previewActionText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  previewSectionWrap: {
    gap: 8,
  },
  previewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  previewSectionAccent: {
    width: 4,
    height: 16,
    borderRadius: 8,
  },
  previewSectionTitle: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  previewCardWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  previewDetailRow: {
    flexDirection: "row",
    gap: 10,
  },
  previewDetailChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  previewDetailText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 16,
  },
  previewPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewPanelIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewPanelTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  previewPanelEmpty: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  previewPanelLine: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  previewPanelMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  previewSocialRow: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewSocialIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  previewSocialText: {
    flex: 1,
    minWidth: 0,
  },
  previewSocialTitle: {
    fontSize: 11.5,
    lineHeight: 14,
  },
  previewSocialMeta: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  previewBottomSpacer: {
    height: 22,
  },
});
