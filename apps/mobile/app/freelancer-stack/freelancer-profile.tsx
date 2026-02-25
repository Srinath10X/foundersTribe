import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { TestimonialCarousel } from "@/components/freelancer/TestimonialCarousel";
import { useAuth } from "@/context/AuthContext";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useContracts, useUserTestimonials } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type PreviousWork = { company?: string; role?: string; duration?: string };
type SocialLink = { platform?: string; url?: string; label?: string };

type PublicProfileData = {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  user_type?: string | null;
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
    const val = raw.trim();
    return val.length > 0 ? val : null;
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

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { session } = useAuth();
  const { id, gigId } = useLocalSearchParams<{ id?: string; gigId?: string }>();
  const { data: contractsData } = useContracts({ limit: 200 });

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const targetUserId = (typeof id === "string" && id) || profile?.id || "";
  const { data: testimonials = [], refetch: refetchTestimonials } = useUserTestimonials(
    targetUserId,
    12,
    Boolean(targetUserId),
  );

  const loadProfile = useCallback(async () => {
    const profileId = typeof id === "string" ? id : "";
    if (!profileId || !session?.access_token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Try tribe-service API first, then fall back to direct Supabase queries
      let db: any = null;
      try {
        db = await tribeApi.getPublicProfile(session.access_token, profileId);
      } catch {
        // Tribe API failed (404 or network error) — query Supabase tables directly
        const [{ data: tribeRow }, { data: gigRow }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("id", profileId).maybeSingle(),
        ]);
        // Merge both sources: prefer tribe `profiles` data, fall back to gig `user_profiles`
        if (tribeRow || gigRow) {
          db = { ...(gigRow || {}), ...(tribeRow || {}) };
        }
      }

      if (!db) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const resolvedAvatar =
        (await resolveAvatar(db?.photo_url || db?.avatar_url || null, profileId)) ||
        people.alex;

      const merged: PublicProfileData = {
        id: profileId,
        display_name: db?.display_name || db?.full_name || "Freelancer",
        username: db?.username || db?.handle || null,
        bio: db?.bio ?? null,
        avatar_url: resolvedAvatar,
        photo_url: resolvedAvatar,
        user_type: db?.user_type || "freelancer",
        contact: db?.contact ?? null,
        address: db?.address ?? null,
        location: compactLocation(db?.location),
        linkedin_url: db?.linkedin_url ?? null,
        role: db?.role ?? null,
        previous_works: Array.isArray(db?.previous_works) ? db.previous_works : [],
        social_links: Array.isArray(db?.social_links) ? db.social_links : [],
        completed_gigs: Array.isArray(db?.completed_gigs) ? db.completed_gigs : [],
        updated_at: db?.updated_at ?? null,
      };

      setProfile(merged);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id, session?.access_token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([loadProfile(), refetchTestimonials()]);
    setRefreshing(false);
  }, [loadProfile, refetchTestimonials]);

  const works = profile?.previous_works || [];
  const previousWorks = (Array.isArray(profile?.completed_gigs) ? profile.completed_gigs : []) || [];
  const links = (profile?.social_links || []).filter((x) => x?.url);
  const founderTestimonials = testimonials.filter((item) => {
    const role = String(item.reviewer?.role || "").toLowerCase();
    return role === "founder" || role === "both";
  });
  const expCount = works.length;
  const workCount = previousWorks.length;
  const linkCount = links.length;
  const contracts = contractsData?.items ?? [];
  const linkedContract = contracts.find((contract) => {
    if (!contract) return false;
    if (contract.freelancer_id !== id) return false;
    if (gigId && contract.gig_id !== gigId) return false;
    return contract.status === "active" || contract.status === "completed";
  });
  const lastUpdatedLabel = profile?.updated_at
    ? new Date(profile.updated_at).toLocaleDateString()
    : null;

  const openExternalUrl = async (url: string) => {
    const value = String(url || "").trim();
    if (!value) return;
    const safe = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const canOpen = await Linking.canOpenURL(safe);
    if (canOpen) {
      Linking.openURL(safe).catch(() => {});
    }
  };

  if (loading) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Freelancer Profile</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>View profile details</T>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <SurfaceCard style={styles.skeletonCard}>
            <LoadingState rows={2} />
          </SurfaceCard>
          <SurfaceCard style={styles.skeletonCard}>
            <LoadingState rows={3} />
          </SurfaceCard>
          <SurfaceCard style={styles.skeletonCard}>
            <LoadingState rows={3} />
          </SurfaceCard>
        </View>
      </FlowScreen>
    );
  }

  if (!profile) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Freelancer Profile</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>View profile details</T>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <ErrorState title="Freelancer not found" message="The profile couldn't be loaded." onRetry={loadProfile} />
          <T weight="regular" color={palette.subText} style={styles.offlineHint}>
            Check your network connection and try again.
          </T>
          <TouchableOpacity
            activeOpacity={0.84}
            style={[styles.retryBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
            onPress={loadProfile}
          >
            <T weight="medium" color={palette.text} style={styles.retryBtnText}>
              Retry
            </T>
          </TouchableOpacity>
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Freelancer Profile</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>View profile details</T>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <SurfaceCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Avatar source={profile.photo_url || profile.avatar_url || people.alex} size={64} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.heroName} numberOfLines={1}>
                  {profile.display_name || "Freelancer"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  @{profile.username || "user"}
                </T>
                <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                  {profile.user_type || profile.role || "freelancer"}
                </T>
              </View>
            </View>

            <T weight="regular" color={palette.subText} style={styles.bioText}>
              {profile.bio || "No bio added yet."}
            </T>
            <T weight="regular" color={palette.subText} style={styles.updatedText}>
              Last updated: {lastUpdatedLabel || "Not available"}
            </T>

            <View style={styles.heroActions}>
              {linkedContract ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={[styles.actionBtn, { backgroundColor: palette.accentSoft }]}
                  onPress={() =>
                    nav.push(
                      `/freelancer-stack/contract-chat-thread?contractId=${linkedContract.id}&title=${encodeURIComponent(
                        `${profile.display_name} • Contract Chat`,
                      )}`,
                    )
                  }
                >
                  <T weight="medium" color={palette.accent} style={styles.actionBtnText}>
                    Message
                  </T>
                </TouchableOpacity>
              ) : null}
              {profile.linkedin_url ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={[styles.actionBtn, { backgroundColor: palette.border }]}
                  onPress={() => openExternalUrl(profile.linkedin_url || "")}
                >
                  <T weight="medium" color={palette.text} style={styles.actionBtnText}>
                    LinkedIn
                  </T>
                </TouchableOpacity>
              ) : null}
            </View>
            {!linkedContract ? (
              <T weight="regular" color={palette.subText} style={styles.actionHint}>
                Message is available once a contract is active.
              </T>
            ) : null}
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Personal Details
              </T>
              <T weight="regular" color={palette.subText} style={styles.sectionMeta}>
                Public fields
              </T>
            </View>
            <View style={styles.sectionStack}>
              <FieldRow icon="call-outline" label="Phone" value={profile.contact} />
              <FieldRow icon="location-outline" label="Address" value={profile.address} />
              <FieldRow icon="navigate-outline" label="Location" value={profile.location} />
              <FieldRow icon="logo-linkedin" label="LinkedIn" value={profile.linkedin_url} />
              <FieldRow icon="briefcase-outline" label="Role" value={profile.role} />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Experience
              </T>
              <T weight="regular" color={palette.subText} style={styles.sectionMeta}>
                {expCount} item{expCount === 1 ? "" : "s"}
              </T>
            </View>
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
            <View style={styles.sectionHeadRow}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Previous Works
              </T>
              <T weight="regular" color={palette.subText} style={styles.sectionMeta}>
                {workCount} item{workCount === 1 ? "" : "s"}
              </T>
            </View>
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
            items={founderTestimonials}
            emptyText="No founder reviews yet."
          />

          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeadRow}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Social Links
              </T>
              <T weight="regular" color={palette.subText} style={styles.sectionMeta}>
                {linkCount} active
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
                    onPress={() => openExternalUrl(String(item.url || ""))}
                    activeOpacity={0.84}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  loadingWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  skeletonCard: {
    padding: 12,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
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
  updatedText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
  },
  heroActions: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionHint: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnText: {
    fontSize: 11,
    lineHeight: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statsCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statsLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  statsValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  sectionMeta: {
    fontSize: 10,
    lineHeight: 13,
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
  offlineHint: {
    fontSize: 11,
    lineHeight: 14,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
