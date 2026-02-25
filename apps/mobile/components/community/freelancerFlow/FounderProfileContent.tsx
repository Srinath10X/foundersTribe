import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

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

function FieldRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  const { palette } = useFlowPalette();

  return (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldIcon, { backgroundColor: palette.accentSoft }]}>
        <Ionicons name={icon} size={13} color={palette.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="regular" color={palette.subText} style={styles.fieldLabel}>
          {label}
        </T>
        <T weight="medium" color={palette.text} style={styles.fieldValue} numberOfLines={2}>
          {value || "Not provided"}
        </T>
      </View>
    </View>
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
  const { palette } = useFlowPalette();
  const { themeMode, setThemeMode } = useTheme();
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
        (await resolveAvatar(db?.photo_url || db?.avatar_url || meta?.avatar_url || meta?.picture || null, userId)) ||
        people.alex;

      const merged: ProfileData = {
        id: userId,
        display_name: normalizeName(db?.display_name || meta?.full_name || meta?.name, session?.user?.email),
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
  const themeOptions: { key: "system" | "light" | "dark"; label: string }[] = [
    { key: "system", label: "System" },
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
  ];

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

  const lastUpdatedLabel = profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : null;

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Founder Profile
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          {isViewingOtherProfile ? "View founder details" : "Keep your public profile updated"}
        </T>
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

          <SurfaceCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Avatar source={profile?.photo_url || people.alex} size={64} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.heroName} numberOfLines={1}>
                  {profile?.display_name || "Founder"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  @{profile?.username || "user"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  {profile?.user_type || "founder"}
                </T>
              </View>
            </View>

            <T weight="regular" color={palette.subText} style={styles.bioText}>
              {profile?.bio || "Add a short bio to make your profile stronger."}
            </T>
            <T weight="regular" color={palette.subText} style={styles.updatedMeta}>
              Last updated: {lastUpdatedLabel || "Not available"}
            </T>

          </SurfaceCard>

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

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Personal Details
            </T>
            <View style={styles.sectionStack}>
              <FieldRow icon="call-outline" label="Phone" value={profile?.contact} />
              <FieldRow icon="location-outline" label="Address" value={profile?.address} />
              <FieldRow icon="navigate-outline" label="Location" value={profile?.location} />
              <FieldRow icon="logo-linkedin" label="LinkedIn" value={profile?.linkedin_url} />
              <FieldRow icon="briefcase-outline" label="Role" value={profile?.role} />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Experience
            </T>
            <View style={styles.sectionStack}>
              {works.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No experience items added yet.
                </T>
              ) : (
                works.slice(0, 4).map((work, index) => (
                  <View key={`${work.company || "work"}-${index}`} style={[styles.workItem, { borderColor: palette.borderLight }]}>
                    <T weight="medium" color={palette.text} style={styles.workRole} numberOfLines={1}>
                      {work.role || "Role"}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workCompany} numberOfLines={1}>
                      {work.company || "Company"}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workDuration} numberOfLines={1}>
                      {work.duration || "Duration"}
                    </T>
                  </View>
                ))
              )}
            </View>
          </SurfaceCard>

          {(profile?.user_type === "founder" || profile?.user_type === "both") && (
            <SurfaceCard style={styles.sectionCard}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Business Ideas
              </T>
              {businessIdeaItems.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No business ideas added.
                </T>
              ) : (
                <View style={styles.sectionStack}>
                  {businessIdeaItems.map((item, index) => (
                    <View key={`idea-${index}`} style={[styles.businessIdeaCard, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
                      <View style={[styles.ideaIndexTag, { borderColor: palette.borderLight, backgroundColor: palette.surfaceElevated }]}>
                        <T weight="medium" color={palette.subText} style={styles.ideaIndexText}>
                          Idea {index + 1}
                        </T>
                      </View>
                      <T weight="regular" color={palette.text} style={styles.businessIdeaText}>
                        {item.idea}
                      </T>
                      {!!item.pitchUrl && (
                        <TouchableOpacity
                          activeOpacity={0.82}
                          style={[styles.pitchTag, { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
                          onPress={() => openUrl(item.pitchUrl as string)}
                        >
                          <Ionicons name="play-circle-outline" size={13} color={palette.accent} />
                          <T weight="medium" color={palette.accent} style={styles.pitchTagText}>
                            Pitch Video
                          </T>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </SurfaceCard>
          )}

          {!hideFounderPerformance ? (
            <SurfaceCard style={styles.sectionCard}>
              <View style={styles.sectionHeadRow}>
                <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                  Active Postings
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
          ) : null}

          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Social Links
              </T>
            </View>
            {links.length === 0 ? (
              <T weight="regular" color={palette.subText} style={styles.emptyText}>
                No social links added.
              </T>
            ) : (
              <View style={styles.linksWrap}>
                {links.slice(0, 6).map((item, index) => (
                  <TouchableOpacity
                    key={`${item.platform || "link"}-${index}`}
                    style={[styles.linkPill, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
                    activeOpacity={0.82}
                    onPress={() => openUrl(String(item.url || ""))}
                  >
                    <Ionicons name="link-outline" size={13} color={palette.subText} />
                    <T weight="regular" color={palette.text} style={styles.linkText} numberOfLines={1}>
                      {socialLabel(item)}
                    </T>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SurfaceCard>

          {!isViewingOtherProfile && !isCompactProfile ? (
            <>
              <SurfaceCard style={styles.sectionCard}>
                <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                  Appearance
                </T>
                <View style={styles.themeSwitchRow}>
                  {themeOptions.map((option) => {
                    const selected = themeMode === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.86}
                        style={[
                          styles.themeOption,
                          {
                            borderColor: selected ? palette.accent : palette.borderLight,
                            backgroundColor: selected ? palette.accentSoft : palette.surface,
                          },
                        ]}
                        onPress={() => setThemeMode(option.key)}
                      >
                        <T weight={selected ? "medium" : "regular"} color={selected ? palette.accent : palette.subText} style={styles.themeOptionText}>
                          {option.label}
                        </T>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SurfaceCard>

              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.logoutBtn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace("/");
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
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  heroCard: {
    padding: 14,
    borderRadius: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroName: {
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  bioText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  updatedMeta: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
  },
  heroActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  interestsBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  interestsBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
  editBtnText: {
    fontSize: 12,
    lineHeight: 16,
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
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  fieldValue: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  workItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  workRole: {
    fontSize: 12,
    lineHeight: 16,
  },
  workCompany: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  workDuration: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  businessIdeaCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  businessIdeaText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  ideaIndexTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    height: 24,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  ideaIndexText: {
    fontSize: 10,
    lineHeight: 13,
  },
  pitchTag: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    height: 28,
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
  linksWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkPill: {
    borderWidth: 1,
    borderRadius: 999,
    height: 30,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
  },
  linkText: {
    fontSize: 11,
    lineHeight: 14,
    maxWidth: 170,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
  themeSwitchRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  themeOption: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  themeOptionText: {
    fontSize: 11,
    lineHeight: 14,
  },
  logoutBtn: {
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  logoutBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
