import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, SurfaceCard, T, people, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { TestimonialCarousel } from "@/components/freelancer/TestimonialCarousel";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserTestimonials } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import type { Testimonial } from "@/types/gig";

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
  completed_gigs?: { title?: string; description?: string }[] | null;
  updated_at?: string | null;
};
type ReviewerProfileLite = {
  name: string;
  avatar_url: string | null;
  role: string | null;
};

function toTitleCase(value: string) {
  if (!value) return value;
  if (value === value.toUpperCase()) {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
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

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const { themeMode, setThemeMode } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { session } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [storedTestimonials, setStoredTestimonials] = useState<Testimonial[]>([]);
  const [reviewerProfilesById, setReviewerProfilesById] = useState<Record<string, ReviewerProfileLite>>({});
  const profileIdForTestimonials = profile?.id || session?.user?.id || "";
  const { data: testimonials = [], refetch: refetchTestimonials } = useUserTestimonials(
    profileIdForTestimonials,
    12,
    Boolean(profileIdForTestimonials),
  );

  const loadStoredTestimonials = useCallback(async () => {
    const revieweeId = profile?.id || session?.user?.id || "";
    if (!revieweeId) {
      setStoredTestimonials([]);
      return;
    }

    try {
      const { data: ratingRows, error: ratingError } = await supabase
        .from("ratings")
        .select("id, contract_id, reviewer_id, score, review_text, created_at")
        .eq("reviewee_id", revieweeId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (ratingError || !Array.isArray(ratingRows) || ratingRows.length === 0) {
        setStoredTestimonials([]);
        return;
      }

      const reviewerIds = Array.from(
        new Set(ratingRows.map((row: any) => row?.reviewer_id).filter(Boolean)),
      ) as string[];
      const contractIds = Array.from(
        new Set(ratingRows.map((row: any) => row?.contract_id).filter(Boolean)),
      ) as string[];

      const [reviewersRes, contractsRes] = await Promise.all([
        reviewerIds.length
          ? supabase
              .from("user_profiles")
              .select("id, full_name, handle, avatar_url, role")
              .in("id", reviewerIds)
          : Promise.resolve({ data: [], error: null } as any),
        contractIds.length
          ? supabase
              .from("contracts")
              .select("id, gig_id")
              .in("id", contractIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const gigIds = Array.from(
        new Set(((contractsRes.data || []) as any[]).map((row) => row?.gig_id).filter(Boolean)),
      ) as string[];
      const gigsRes = gigIds.length
        ? await supabase.from("gigs").select("id, title").in("id", gigIds)
        : ({ data: [], error: null } as any);

      const reviewerById = new Map(((reviewersRes.data || []) as any[]).map((row) => [row.id, row]));
      const contractById = new Map(((contractsRes.data || []) as any[]).map((row) => [row.id, row]));
      const gigById = new Map(((gigsRes.data || []) as any[]).map((row) => [row.id, row]));

      const merged = (ratingRows as any[]).map((row) => {
        const reviewer = reviewerById.get(row.reviewer_id) || null;
        const contract = contractById.get(row.contract_id) || null;
        const gig = contract?.gig_id ? gigById.get(contract.gig_id) : null;
        return {
          id: row.id,
          contract_id: row.contract_id,
          reviewer_id: row.reviewer_id,
          score: row.score,
          review_text: row.review_text,
          created_at: row.created_at,
          reviewer,
          contract: contract
            ? {
                id: contract.id,
                gig: gig ? { id: gig.id, title: gig.title } : null,
              }
            : null,
        } as Testimonial;
      });

      setStoredTestimonials(merged);
    } catch {
      setStoredTestimonials([]);
    }
  }, [profile?.id, session?.user?.id]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const userId = session?.user?.id || "";
      const meta = session?.user?.user_metadata || {};
      const metaProfile = meta?.profile_data || {};

      let db: any = null;
      if (session?.access_token) {
        try {
          db = await tribeApi.getMyProfile(session.access_token);
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
        bio: db?.bio ?? metaProfile?.bio ?? null,
        avatar_url: resolvedAvatar,
        photo_url: resolvedAvatar,
        user_type: (db?.user_type || meta?.user_type || meta?.role || "freelancer") as any,
        contact: db?.contact ?? metaProfile?.contact ?? null,
        address: db?.address ?? metaProfile?.address ?? null,
        location: compactLocation(db?.location ?? metaProfile?.location),
        linkedin_url: db?.linkedin_url ?? metaProfile?.linkedin_url ?? null,
        role: db?.role ?? metaProfile?.role ?? null,
        previous_works:
          (Array.isArray(db?.previous_works) && db.previous_works) ||
          (Array.isArray(metaProfile?.previous_works) ? metaProfile.previous_works : []),
        social_links:
          (Array.isArray(db?.social_links) && db.social_links) ||
          (Array.isArray(metaProfile?.social_links) ? metaProfile.social_links : []),
        completed_gigs:
          (Array.isArray(db?.completed_gigs) && db.completed_gigs) ||
          (Array.isArray(metaProfile?.completed_gigs) ? metaProfile.completed_gigs : []),
        updated_at: db?.updated_at ?? null,
      };

      setProfile(merged);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([loadProfile(), refetchTestimonials(), loadStoredTestimonials()]);
    setRefreshing(false);
  }, [loadProfile, loadStoredTestimonials, refetchTestimonials]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  React.useEffect(() => {
    if (testimonials.length > 0) return;
    loadStoredTestimonials();
  }, [loadStoredTestimonials, testimonials.length]);

  const works = profile?.previous_works || [];
  const previousWorks = (Array.isArray(profile?.completed_gigs) ? profile.completed_gigs : []) || [];
  const links = (profile?.social_links || []).filter((x) => x?.url);
  const testimonialPool = testimonials.length > 0 ? testimonials : storedTestimonials;
  const founderTestimonials = testimonialPool.filter((item) => {
    const role = String(item.reviewer?.role || (item as any)?.reviewer_role || "").toLowerCase();
    return role === "founder" || role === "both";
  });
  const testimonialItems = founderTestimonials.length > 0 ? founderTestimonials : testimonialPool;
  const reviewerIdsToSync = React.useMemo(
    () =>
      Array.from(
        new Set(
          testimonialItems
            .map((item) => String(item.reviewer_id || "").trim())
            .filter((id) => id.length > 0 && !reviewerProfilesById[id]),
        ),
      ),
    [reviewerProfilesById, testimonialItems],
  );

  React.useEffect(() => {
    const token = session?.access_token;
    if (!token || reviewerIdsToSync.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        reviewerIdsToSync.map(async (reviewerId) => {
          try {
            const raw = await tribeApi.getPublicProfile(token, reviewerId);
            const avatar = await resolveAvatar(raw?.photo_url || raw?.avatar_url || null, reviewerId);
            const resolvedName =
              String(raw?.display_name || raw?.full_name || raw?.username || "").trim() || "Member";
            const resolvedRole =
              typeof raw?.role === "string"
                ? raw.role
                : typeof raw?.user_type === "string"
                  ? raw.user_type
                  : null;
            return [
              reviewerId,
              {
                name: resolvedName,
                avatar_url: avatar || null,
                role: resolvedRole,
              } as ReviewerProfileLite,
            ] as const;
          } catch {
            return [reviewerId, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setReviewerProfilesById((prev) => {
        const next = { ...prev };
        entries.forEach(([reviewerId, reviewer]) => {
          if (reviewer) next[reviewerId] = reviewer;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewerIdsToSync, session?.access_token]);

  const testimonialItemsWithTribeProfiles = React.useMemo(
    () =>
      testimonialItems.map((item) => {
        const synced = reviewerProfilesById[item.reviewer_id];
        if (!synced) return item;
        return {
          ...item,
          reviewer: {
            id: item.reviewer_id,
            full_name: synced.name || item.reviewer?.full_name || item.reviewer?.handle || null,
            handle: item.reviewer?.handle || null,
            avatar_url: synced.avatar_url || item.reviewer?.avatar_url || null,
            role: (synced.role as any) || item.reviewer?.role || null,
          },
        } as Testimonial;
      }),
    [reviewerProfilesById, testimonialItems],
  );
  const lastUpdatedLabel = profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : null;
  const themeOptions: { key: "system" | "light" | "dark"; label: string }[] = [
    { key: "system", label: "System" },
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
  ];

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Profile
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Keep your public profile updated
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
          <SurfaceCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Avatar source={profile?.photo_url || people.alex} size={64} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.heroName} numberOfLines={1}>
                  {profile?.display_name || "User"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  @{profile?.username || "user"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  {profile?.user_type || "freelancer"}
                </T>
              </View>
            </View>

            <T weight="regular" color={palette.subText} style={styles.bioText}>
              {profile?.bio || "Add a short bio to make your profile stronger."}
            </T>
            <T weight="regular" color={palette.subText} style={styles.updatedMeta}>
              Last updated: {lastUpdatedLabel || "Not available"}
            </T>

            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.editBtn, { backgroundColor: palette.accent }]}
              onPress={() => router.push("/edit-profile")}
            >
              <Ionicons name="create-outline" size={14} color="#fff" />
              <T weight="medium" color="#fff" style={styles.editBtnText}>
                Edit Profile
              </T>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              style={[styles.manageServicesBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
              onPress={() => router.push("/(role-pager)/(freelancer-tabs)/my-services")}
            >
              <Ionicons name="briefcase-outline" size={14} color={palette.text} />
              <T weight="medium" color={palette.text} style={styles.manageServicesText}>
                Manage Services
              </T>
            </TouchableOpacity>
          </SurfaceCard>

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

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Previous Works
            </T>
            <View style={styles.sectionStack}>
              {previousWorks.length === 0 ? (
                <T weight="regular" color={palette.subText} style={styles.emptyText}>
                  No previous works added yet.
                </T>
              ) : (
                previousWorks.slice(0, 4).map((work, index) => (
                  <View key={`prev-${index}`} style={[styles.workItem, { borderColor: palette.borderLight }]}>
                    <T weight="medium" color={palette.text} style={styles.workRole}>
                      {String(work?.title || "Work")}
                    </T>
                    <T weight="regular" color={palette.subText} style={styles.workCompany}>
                      {String(work?.description || "Description")}
                    </T>
                  </View>
                ))
              )}
            </View>
          </SurfaceCard>

          <TestimonialCarousel
            title="Testimonials"
            items={testimonialItemsWithTribeProfiles}
            emptyText="No founder reviews yet."
          />

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
                    onPress={async () => {
                      const raw = String(item.url || "").trim();
                      if (!raw) return;
                      const safe = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                      const canOpen = await Linking.canOpenURL(safe);
                      if (canOpen) Linking.openURL(safe).catch(() => {});
                    }}
                  >
                    <Ionicons name="link-outline" size={13} color={palette.subText} />
                    <T weight="regular" color={palette.text} style={styles.linkText} numberOfLines={1}>
                      {item.label || item.platform || "Link"}
                    </T>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SurfaceCard>

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
              router.replace("/login");
            }}
          >
            <Ionicons name="log-out-outline" size={15} color={palette.accent} />
            <T weight="medium" color={palette.accent} style={styles.logoutBtnText}>
              Logout
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
  editBtn: {
    marginTop: 12,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  editBtnText: {
    fontSize: 12,
    lineHeight: 16,
  },
  manageServicesBtn: {
    marginTop: 8,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  manageServicesText: {
    fontSize: 11,
    lineHeight: 14,
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
