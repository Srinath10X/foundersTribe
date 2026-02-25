import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
import { useAuth } from "@/context/AuthContext";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
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

function FieldRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  const { palette } = useFlowPalette();
  if (!value) return null;

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
          {value}
        </T>
      </View>
    </View>
  );
}

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);

  const loadProfile = useCallback(async () => {
    const profileId = typeof id === "string" ? id : "";
    if (!profileId || !session?.access_token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const db = await tribeApi.getPublicProfile(session.access_token, profileId);
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
        location:
          typeof db?.location === "string"
            ? db.location
            : db?.location && typeof db.location === "object"
              ? [db.location.city, db.location.state, db.location.country].filter(Boolean).join(", ")
              : null,
        linkedin_url: db?.linkedin_url ?? null,
        role: db?.role ?? null,
        previous_works: Array.isArray(db?.previous_works) ? db.previous_works : [],
        social_links: Array.isArray(db?.social_links) ? db.social_links : [],
        completed_gigs: Array.isArray(db?.completed_gigs) ? db.completed_gigs : [],
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
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const works = profile?.previous_works || [];
  const previousWorks = (Array.isArray(profile?.completed_gigs) ? profile.completed_gigs : []) || [];
  const links = (profile?.social_links || []).filter((x) => x?.url);

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
        <View style={styles.loadingWrap}><LoadingState rows={5} /></View>
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
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Personal Details
            </T>
            <View style={styles.sectionStack}>
              <FieldRow icon="call-outline" label="Phone" value={profile.contact} />
              <FieldRow icon="location-outline" label="Address" value={profile.address} />
              <FieldRow icon="navigate-outline" label="Location" value={profile.location} />
              <FieldRow icon="logo-linkedin" label="LinkedIn" value={profile.linkedin_url} />
              <FieldRow icon="briefcase-outline" label="Role" value={profile.role} />
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

          <SurfaceCard style={styles.sectionCard}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Social Links
            </T>
            {links.length === 0 ? (
              <T weight="regular" color={palette.subText} style={styles.emptyText}>
                No social links added.
              </T>
            ) : (
              <View style={styles.linksWrap}>
                {links.slice(0, 6).map((item, index) => (
                  <View
                    key={`${item.platform || "link"}-${index}`}
                    style={[styles.linkPill, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
                  >
                    <Ionicons name="link-outline" size={13} color={palette.subText} />
                    <T weight="regular" color={palette.text} style={styles.linkText} numberOfLines={1}>
                      {item.label || item.platform || "Link"}
                    </T>
                  </View>
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
  sectionCard: {
    padding: 14,
    borderRadius: 14,
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
});
