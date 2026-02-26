import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import AppearanceModal from "@/components/AppearanceModal";
import ProfileOverviewSheet from "@/components/ProfileOverviewSheet";
import StatusToggleSwitch from "@/components/StatusToggleSwitch";
import { Avatar, FlowScreen, SurfaceCard, T, people, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useAuth } from "@/context/AuthContext";
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
        <View
          style={[
            styles.moreIcon,
            { backgroundColor: palette.card },
          ]}
        >
          <Ionicons
            name={icon}
            size={16}
            color={isLogout ? "#E23744" : "#9CA3AF"}
          />
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
      {!isLogout ? <View pointerEvents="none" /> : null}
    </TouchableOpacity>
  );
}

function testimonialName(item: Testimonial) {
  return item.reviewer?.full_name || item.reviewer?.handle || "Member";
}

function testimonialDateLabel(value?: string | null) {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  return new Date(ts).toLocaleDateString();
}

function testimonialAvatarSource(item: Testimonial): string | null {
  const raw = String(item.reviewer?.avatar_url || "").trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : null;
}

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { session } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [activeOverviewSection, setActiveOverviewSection] = useState<
    "personal" | "experience" | "previousWorks" | "testimonials" | "social" | null
  >(null);
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
  const openUrl = (url: string) => {
    const value = String(url || "").trim();
    if (!value) return;
    const safe = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    Linking.openURL(safe).catch(() => {});
  };
  const selectAppearance = () => {
    setShowAppearanceModal(true);
  };
  const activeOverviewTitle =
    activeOverviewSection === "personal"
      ? "Personal Details"
      : activeOverviewSection === "experience"
        ? "Experience"
        : activeOverviewSection === "previousWorks"
          ? "Previous Works"
          : activeOverviewSection === "testimonials"
            ? "Testimonials"
            : activeOverviewSection === "social"
              ? "Connect & Profiles"
              : "Professional Overview";
  const renderOverviewContent = () => {
    if (activeOverviewSection === "personal") {
      return (
        <View>
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
        </View>
      );
    }

    if (activeOverviewSection === "experience") {
      return (
        <View>
          {works.length === 0 ? (
            <T weight="regular" color={palette.subText} style={styles.emptyText}>
              No experience items added yet.
            </T>
          ) : (
            works.slice(0, 8).map((work, index) => {
              const duration = work.duration || "Duration";
              const isCurrent = /present|current/i.test(duration);
              return (
                <View key={`${work.company || "work"}-sheet-${index}`} style={styles.workCard}>
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
        </View>
      );
    }

    if (activeOverviewSection === "previousWorks") {
      return (
        <View style={styles.sectionStack}>
          {previousWorks.length === 0 ? (
            <T weight="regular" color={palette.subText} style={styles.emptyText}>
              No previous works added yet.
            </T>
          ) : (
            previousWorks.slice(0, 12).map((work, index) => (
              <View
                key={`prev-sheet-${index}`}
                style={[
                  styles.previousWorkCard,
                  { borderColor: palette.borderLight, backgroundColor: palette.card },
                ]}
              >
                <View style={styles.previousWorkHead}>
                  <View style={styles.previousWorkHeadLeft}>
                    <View style={[styles.previousWorkIconWrap, { backgroundColor: "rgba(14, 165, 233, 0.14)" }]}>
                      <Ionicons name="briefcase-outline" size={15} color="#0EA5E9" />
                    </View>
                    <View style={[styles.previousWorkIndexTag, { borderColor: "rgba(14, 165, 233, 0.3)" }]}>
                      <T weight="bold" color="#0EA5E9" style={styles.previousWorkIndexText}>
                        Work {index + 1}
                      </T>
                    </View>
                  </View>
                </View>
                <T weight="semiBold" color={palette.text} style={styles.previousWorkTitle} numberOfLines={2}>
                  {String(work?.title || "Work")}
                </T>
                <T weight="regular" color={palette.subText} style={styles.previousWorkDesc} numberOfLines={4}>
                  {String(work?.description || "Description")}
                </T>
              </View>
            ))
          )}
        </View>
      );
    }

    if (activeOverviewSection === "testimonials") {
      return (
        <View style={styles.sectionStack}>
          {testimonialItemsWithTribeProfiles.length === 0 ? (
            <T weight="regular" color={palette.subText} style={styles.emptyText}>
              No founder reviews yet.
            </T>
          ) : (
            testimonialItemsWithTribeProfiles.slice(0, 12).map((item) => {
              const reviewer = testimonialName(item);
              const avatarSource = testimonialAvatarSource(item);
              const gigTitle = item.contract?.gig?.title || "Project";
              return (
                <View
                  key={`${item.id}-sheet`}
                  style={[
                    styles.testimonialItemCard,
                    { borderColor: palette.borderLight, backgroundColor: palette.surface },
                  ]}
                >
                  <View style={styles.testimonialItemHead}>
                    <View style={styles.testimonialPersonRow}>
                      {avatarSource ? (
                        <Avatar source={avatarSource} size={32} />
                      ) : (
                        <View style={[styles.testimonialInitial, { backgroundColor: palette.accentSoft }]}>
                          <T weight="semiBold" color={palette.accent} style={styles.testimonialInitialText}>
                            {reviewer.slice(0, 1).toUpperCase() || "U"}
                          </T>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T weight="semiBold" color={palette.text} style={styles.testimonialReviewer} numberOfLines={1}>
                          {reviewer}
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.testimonialMeta} numberOfLines={1}>
                          {gigTitle}
                        </T>
                      </View>
                    </View>
                    <T weight="regular" color={palette.subText} style={styles.testimonialMeta}>
                      {testimonialDateLabel(item.created_at)}
                    </T>
                  </View>

                  <View style={styles.testimonialStars}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Ionicons
                        key={`${item.id}-sheet-star-${idx}`}
                        name={idx < Number(item.score || 0) ? "star" : "star-outline"}
                        size={13}
                        color={idx < Number(item.score || 0) ? "#F4C430" : palette.subText}
                      />
                    ))}
                  </View>

                  <T weight="regular" color={palette.text} style={styles.testimonialText}>
                    {item.review_text || "Great collaboration and delivery."}
                  </T>
                </View>
              );
            })
          )}
        </View>
      );
    }

    return (
      <View>
        {links.length === 0 ? (
          <MoreRow icon="globe-outline" title="No social links added" subtitle="Add links to your profile" />
        ) : (
          links.slice(0, 12).map((item, index) => (
            <MoreRow
              key={`${item.platform || "link"}-sheet-${index}`}
              icon="globe-outline"
              title={item.label || item.platform || "Link"}
              subtitle={item.url || undefined}
              onPress={() => openUrl(String(item.url || ""))}
            />
          ))
        )}
      </View>
    );
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
                <Avatar source={profile?.photo_url || people.alex} size={60} />
                <View style={styles.statusDot} />
              </View>
            </View>
            <View style={styles.heroIdentityText}>
              <T weight="semiBold" color="#FFFFFF" style={styles.heroName} numberOfLines={2}>
                {profile?.display_name || "User"}
              </T>
              <T weight="regular" color="rgba(255,255,255,0.8)" style={styles.heroMeta} numberOfLines={1}>
                @{profile?.username || "user"}
              </T>
              <TouchableOpacity
                activeOpacity={0.84}
                style={styles.heroInlineAction}
                onPress={() => router.push("/edit-profile")}
              >
                <T weight="semiBold" color="#FFFFFF" style={styles.heroInlineActionText}>
                  Edit Profile &gt;
                </T>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusToggleWrap}>
              <T
                weight="semiBold"
                color={availabilityEnabled ? "#FFFFFF" : "rgba(255,255,255,0)"}
                style={styles.statusToggleLabel}
              >
                Open to Work
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

          <View style={styles.blockWrap}>
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              <SectionTitle color="#6366F1" title="Preferences" />
              <MoreRow
                icon="briefcase-outline"
                title="Manage Services"
                onPress={() => router.push("/my-services")}
              />
              <MoreRow
                icon="color-palette-outline"
                title="Appearance"
                onPress={selectAppearance}
              />
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              <SectionTitle color="#F59E0B" title="Professional Overview" />
              <MoreRow icon="person-outline" title="Personal Details" onPress={() => setActiveOverviewSection("personal")} />
              <MoreRow icon="folder-open-outline" title="Previous Works" onPress={() => setActiveOverviewSection("previousWorks")} />
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              <SectionTitle color="#0EA5E9" title="Career Highlights" />
              <MoreRow icon="briefcase-outline" title="Experience" onPress={() => router.push("/experience")} />
              <MoreRow icon="chatbubble-ellipses-outline" title="Testimonials" onPress={() => setActiveOverviewSection("testimonials")} />
              <MoreRow icon="globe-outline" title="Connect & Profiles" onPress={() => setActiveOverviewSection("social")} />
            </SurfaceCard>
          </View>

          <View style={styles.blockWrap}>
            <SurfaceCard style={[styles.sectionCard, styles.listCard]}>
              <MoreRow
                icon="log-out-outline"
                title="Log out"
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace("/login");
                }}
                isLogout
              />
            </SurfaceCard>
          </View>
          <AppearanceModal
            visible={showAppearanceModal}
            onClose={() => setShowAppearanceModal(false)}
          />
          <ProfileOverviewSheet
            visible={Boolean(activeOverviewSection)}
            title={activeOverviewTitle}
            onClose={() => setActiveOverviewSection(null)}
          >
            {renderOverviewContent()}
          </ProfileOverviewSheet>

          <View style={{ height: tabBarHeight + 16 }} />
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
  statusToggleWrap: {
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
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
    gap: 4,
  },
  sectionHeader: {
    paddingHorizontal: 0,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 0,
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
  sectionStack: {
    marginTop: 0,
    gap: 6,
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
  workIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
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
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  previousWorkCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previousWorkHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previousWorkHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previousWorkIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  previousWorkIndexTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    height: 22,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(14,165,233,0.08)",
  },
  previousWorkIndexText: {
    fontSize: 9.5,
    lineHeight: 12,
    textTransform: "uppercase",
  },
  previousWorkTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  previousWorkDesc: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
  },
  testimonialCarouselWrap: {
    position: "relative",
  },
  testimonialScroll: {
    marginTop: 6,
    paddingHorizontal: 18,
    gap: 8,
  },
  testimonialItemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    gap: 8,
  },
  testimonialItemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  testimonialPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  testimonialInitial: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialInitialText: {
    fontSize: 12,
    lineHeight: 15,
  },
  testimonialReviewer: {
    fontSize: 12,
    lineHeight: 16,
  },
  testimonialMeta: {
    fontSize: 10,
    lineHeight: 13,
  },
  testimonialStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  testimonialText: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
  },
  moreStack: {
    marginTop: 2,
  },
  moreRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    gap: 6,
    paddingVertical: 3,
  },
  moreRowDivider: {
    position: "absolute",
    left: 40,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: "rgba(17, 17, 17, 0.18)",
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
});
