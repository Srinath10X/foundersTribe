import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import AppearanceModal from "@/components/AppearanceModal";
import StatusToggleSwitch from "@/components/StatusToggleSwitch";
import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useContracts, useMyGigs } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type PreviousWork = { company?: string; role?: string; duration?: string };
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

function toTitleCase(value: string) {
  if (!value) return value;
  if (value === value.toUpperCase()) {
    return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return value;
}

function normalizeName(raw?: string | null, email?: string | null) {
  let value = (raw || "").trim();
  if (!value) return (email || "").split("@")[0] || "User";

  if (/^[A-Za-z0-9]+-/.test(value)) {
    value = value.replace(/^[A-Za-z0-9]+-/, "").trim();
  }

  value = value
    .replace(/\b(B\.?\s*Tech|M\.?\s*Tech|BTech|MTech).*/i, "")
    .replace(/\([^)]*\)\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return toTitleCase(value || (email || "").split("@")[0] || "User");
}

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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string | null;
  onPress?: () => void;
  isLogout?: boolean;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const { palette } = useFlowPalette();
  const isPressable = typeof onPress === "function";
  const resolvedSubtitle = subtitle || (isLogout ? "Sign out from this account" : null);

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
      {!isLogout && (
        <View style={styles.moreRight}>
          {trailingIcon ? <Ionicons name={trailingIcon} size={15} color="#9CA3AF" /> : null}
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatGigStatus(status?: string | null) {
  if (!status) return "Open";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBudget(min?: number, max?: number) {
  const lo = Number(min || 0);
  const hi = Number(max || 0);
  if (lo <= 0 && hi <= 0) return "Budget not set";
  if (lo > 0 && hi > 0) return `INR ${lo.toLocaleString()} - INR ${hi.toLocaleString()}`;
  return `INR ${Math.max(lo, hi).toLocaleString()}`;
}

function asSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function FounderProfileScreen() {
  const { palette, isDark } = useFlowPalette();
  const { themeMode } = useTheme();
  const nav = useFlowNav();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";
  const params = useLocalSearchParams<{ id?: string | string[]; compact?: string | string[] }>();
  const requestedProfileId = asSingleParam(params.id);
  const compactParam = asSingleParam(params.compact).toLowerCase();
  const isCompactProfile = compactParam === "1" || compactParam === "true";
  const profileUserId = requestedProfileId || currentUserId;
  const isViewingOtherProfile = Boolean(profileUserId && currentUserId && profileUserId !== currentUserId);
  const hideFounderPerformance = isCompactProfile || isViewingOtherProfile;

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);

  const {
    data: gigsData,
    isLoading: gigsLoading,
    refetch: refetchGigs,
  } = useMyGigs({ limit: 30 }, !hideFounderPerformance && Boolean(currentUserId));
  const { data: contractsData, refetch: refetchContracts } = useContracts(
    { limit: 200 },
    !hideFounderPerformance && Boolean(currentUserId),
  );

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
    const jobs: Promise<any>[] = [loadProfile()];
    if (!hideFounderPerformance) {
      jobs.push(refetchGigs(), refetchContracts());
    }
    await Promise.allSettled(jobs);
    setRefreshing(false);
  }, [hideFounderPerformance, loadProfile, refetchContracts, refetchGigs]);

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

  const allGigs = gigsData?.items ?? [];
  const activeGigs = allGigs.filter((gig) => gig.status === "open" || gig.status === "in_progress");
  const contracts = (contractsData?.items ?? []).filter(
    (contract) => !currentUserId || contract.founder_id === currentUserId,
  );

  const metrics = [
    { label: "Gigs Posted", value: String(allGigs.length), icon: "briefcase-outline" as const },
    { label: "Active", value: String(activeGigs.length), icon: "sparkles-outline" as const },
    { label: "Contracts", value: String(contracts.length), icon: "document-text-outline" as const },
    {
      label: "Completed",
      value: String(contracts.filter((contract) => contract.status === "completed").length),
      icon: "checkmark-done-outline" as const,
    },
  ];

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
  const selectAppearance = () => {
    setShowAppearanceModal(true);
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.surface }]}>
        <T weight="bold" color={palette.text} style={styles.pageTitle}>
          Profile
        </T>
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
            </View>
            {!isViewingOtherProfile && !isCompactProfile ? (
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.heroEditBtn}
                onPress={() => router.push("/edit-profile")}
              >
                <T weight="medium" color="#FFFFFF" style={styles.heroEditText}>
                  Edit Profile &gt;
                </T>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusToggleWrap}>
              <T
                weight="semiBold"
                color={availabilityEnabled ? "#FFFFFF" : "rgba(255,255,255,0)"}
                style={styles.statusToggleLabel}
              >
                {isFounderProfile ? "Open to Hire" : "Open to Work"}
              </T>
              <StatusToggleSwitch value={availabilityEnabled} onValueChange={setAvailabilityEnabled} />
            </View>
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

          {!isViewingOtherProfile && !isCompactProfile ? (
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.quickActionBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
                onPress={() => router.push("/edit-profile")}
              >
                <Ionicons name="create-outline" size={17} color="#E23744" />
                <T weight="medium" color={palette.text} style={styles.quickActionText}>
                  Edit Profile
                </T>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.quickActionBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
                onPress={() => router.push("/edit-interests")}
              >
                <Ionicons name="sparkles-outline" size={17} color="#8B5CF6" />
                <T weight="medium" color={palette.text} style={styles.quickActionText}>
                  Edit Interests
                </T>
              </TouchableOpacity>
            </View>
          ) : null}

          {!hideFounderPerformance ? (
            <View style={styles.metricsGrid}>
              {metrics.map((metric) => (
                <SurfaceCard key={metric.label} style={styles.metricCard}>
                  <View style={styles.metricTop}>
                    <View style={[styles.metricIconWrap, { backgroundColor: palette.accentSoft }]}>
                      <Ionicons name={metric.icon} size={13} color={palette.accent} />
                    </View>
                    <T weight="medium" color={palette.text} style={styles.metricValue}>{metric.value}</T>
                  </View>
                  <T weight="regular" color={palette.subText} style={styles.metricLabel}>{metric.label}</T>
                </SurfaceCard>
              ))}
            </View>
          ) : null}

          <View style={styles.blockWrap}>
            <SectionTitle color="#E23744" title="Personal Details" />
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              <DetailRow icon="call-outline" label="Phone" value={profile?.contact} />
              <DetailRow icon="home-outline" label="Address" value={profile?.address} />
              <DetailRow icon="location-outline" label="Location" value={profile?.location} />
              <DetailRow
                icon="link-outline"
                label="LinkedIn"
                value={profile?.linkedin_url}
                valueColor={profile?.linkedin_url ? "#3B82F6" : undefined}
                onPress={profile?.linkedin_url ? () => openUrl(profile.linkedin_url as string) : undefined}
              />
              <DetailRow icon="briefcase-outline" label="Role" value={profile?.role} />
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SectionTitle color="#3B82F6" title="Experience" />
            <SurfaceCard style={styles.sectionCard}>
              {works.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No experience items added yet.
                </T>
              ) : (
                works.slice(0, 4).map((work, index) => {
                  const duration = work.duration || "Duration";
                  const isCurrent = /present|current/i.test(duration);
                  return (
                    <View key={`${work.company || "work"}-${index}`} style={styles.workCard}>
                      <View style={[styles.workIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                        <Ionicons name="code-slash-outline" size={18} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T weight="semiBold" color={palette.text} style={styles.workRole} numberOfLines={1}>
                          {work.role || "Role"}
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.workCompany} numberOfLines={1}>
                          {work.company || "Company"}
                        </T>
                        <View style={styles.workMetaRow}>
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
            </SurfaceCard>
          </View>

          {(profile?.user_type === "founder" || profile?.user_type === "both") && (
            <View style={styles.blockWrap}>
              <SectionTitle color="#F59E0B" title="Business Ideas" />
              <SurfaceCard style={styles.sectionCard}>
                {businessIdeaItems.length === 0 ? (
                  <T weight="regular" color={palette.subText} style={styles.emptyText}>
                    No business ideas added.
                  </T>
                ) : (
                  businessIdeaItems.map((item, index) => (
                    <View
                      key={`idea-${index}`}
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
                      <T weight="regular" color={palette.subText} style={styles.businessIdeaText} numberOfLines={4}>
                        {item.idea}
                      </T>
                      <View style={styles.ideaActionsRow}>
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
                    </View>
                  ))
                )}
              </SurfaceCard>
            </View>
          )}

          {!hideFounderPerformance ? (
            <View style={styles.blockWrap}>
              <SectionTitle color="#0EA5E9" title="Active Postings" />
              <SurfaceCard style={styles.sectionCard}>
                <View style={styles.sectionHeadRow}>
                  <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                    Live gigs
                  </T>
                  <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}>
                    <T weight="medium" color={palette.accent} style={styles.smallLink}>See all</T>
                  </TouchableOpacity>
                </View>

                {gigsLoading ? (
                  <View style={{ marginTop: 10 }}>
                    <LoadingState rows={2} />
                  </View>
                ) : activeGigs.length === 0 ? (
                  <T weight="regular" color={palette.subText} style={styles.emptyText}>
                    No active gigs yet.
                  </T>
                ) : (
                  <View style={styles.sectionStack}>
                    {activeGigs.slice(0, 5).map((gig) => (
                      <TouchableOpacity
                        key={gig.id}
                        activeOpacity={0.86}
                        onPress={() => nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
                      >
                        <View style={[styles.postingCard, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
                          <View style={styles.postingTopRow}>
                            <T weight="medium" color={palette.text} style={styles.postingTitle} numberOfLines={1}>
                              {gig.title}
                            </T>
                            <View style={[styles.postingStatus, { backgroundColor: palette.borderLight }]}>
                              <T weight="regular" color={palette.subText} style={styles.postingStatusText}>
                                {formatGigStatus(gig.status)}
                              </T>
                            </View>
                          </View>

                          <T weight="regular" color={palette.subText} style={styles.postingMeta} numberOfLines={1}>
                            {formatBudget(gig.budget_min, gig.budget_max)} • {gig.budget_type === "hourly" ? "Hourly" : "Fixed"}
                          </T>

                          <View style={styles.postingInfoRow}>
                            <Ionicons name="people-outline" size={13} color={palette.subText} />
                            <T weight="regular" color={palette.subText} style={styles.postingInfoText}>
                              {gig.proposals_count || 0} proposals
                            </T>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </SurfaceCard>
            </View>
          ) : null}

          <View style={styles.blockWrap}>
            <SectionTitle color="#10B981" title="Social Links" />
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              {links.length === 0 ? (
                <MoreRow icon="globe-outline" title="No social links added" subtitle="Add links to your profile" />
              ) : (
                links.slice(0, 6).map((item, index) => (
                  <MoreRow
                    key={`${item.platform || "link"}-${index}`}
                    icon="globe-outline"
                    title={socialLabel(item)}
                    subtitle={item.url || undefined}
                    onPress={() => openUrl(String(item.url || ""))}
                  />
                ))
              )}
            </SurfaceCard>
          </View>

          {!isViewingOtherProfile && !isCompactProfile ? (
            <View style={styles.blockWrap}>
              <SectionTitle color="#8B5CF6" title="More" />
              <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
                <MoreRow
                  icon="color-palette-outline"
                  title="Appearance"
                  subtitle={appearanceLabel}
                  onPress={selectAppearance}
                  trailingIcon={isDark ? "moon-outline" : "sunny-outline"}
                />
                <AppearanceModal
                  visible={showAppearanceModal}
                  onClose={() => setShowAppearanceModal(false)}
                />
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

              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.logoutBtn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace("/login");
                }}
              >
                <Ionicons name="log-out-outline" size={15} color={palette.accent} />
                <T weight="medium" color={palette.accent} style={styles.logoutBtnText}>
                  Logout
                </T>
              </TouchableOpacity>
            </>
          ) : null}

          <View style={{ height: 120 }} />
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
    paddingTop: 8,
    paddingBottom: 24,
    gap: 20,
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
    alignItems: "flex-start",
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
    paddingRight: 4,
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
  heroEditBtn: {
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  heroEditText: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
  statusRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
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
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  quickActionText: {
    fontSize: 13,
    lineHeight: 16,
  },
  blockWrap: {
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  metricCard: {
    width: "49%",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
  },
  listCard: {
    paddingVertical: 4,
    gap: 0,
  },
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  smallLink: {
    fontSize: 11,
    lineHeight: 14,
  },
  sectionStack: {
    marginTop: 10,
    gap: 10,
  },
  detailRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 17,
  },
  detailLabel: {
    marginTop: 2,
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
  workIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  workRole: {
    fontSize: 14,
    lineHeight: 18,
  },
  workCompany: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
  },
  workMetaRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    marginBottom: 10,
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
  ideaActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pitchCta: {
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
  postingCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  postingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postingTitle: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  postingStatus: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  postingStatusText: {
    fontSize: 10,
    lineHeight: 13,
  },
  postingMeta: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
  },
  postingInfoRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postingInfoText: {
    fontSize: 10,
    lineHeight: 13,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
  moreRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
  },
  moreRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moreRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  moreTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  moreSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  logoutRowEnhance: {
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(226, 55, 68, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(226, 55, 68, 0.2)",
  },
});
