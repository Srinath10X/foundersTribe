import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Avatar, FlowScreen, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
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

function resolveRoleBadges(profile: PublicProfileData | null): string[] {
  if (!profile) return [];
  const combined = [profile.user_type, profile.role].filter(Boolean).join(" ").toLowerCase();
  if (combined.includes("both")) return ["Founder", "Freelancer"];
  const badges: string[] = [];
  if (combined.includes("founder")) badges.push("Founder");
  if (combined.includes("freelancer")) badges.push("Freelancer");
  return badges.length ? badges : ["Member"];
}

export default function PublicProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);

  const loadProfile = useCallback(async () => {
    const profileId = typeof id === "string" ? id : "";
    if (!profileId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let db: any = null;
      if (session?.access_token) {
        try {
          db = await tribeApi.getPublicProfile(session.access_token, profileId);
        } catch {
          db = null;
        }
      }

      if (!db) {
        const [{ data: tribeRow }, { data: gigRow }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("id", profileId).maybeSingle(),
        ]);
        if (tribeRow || gigRow) {
          db = { ...(gigRow || {}), ...(tribeRow || {}) };
        }
      }

      if (!db) {
        setProfile(null);
        return;
      }

      const resolvedAvatar = await resolveAvatar(db?.photo_url || db?.avatar_url || null, profileId);

      const merged: PublicProfileData = {
        id: profileId,
        display_name: db?.display_name || db?.full_name || "User",
        username: db?.username || db?.handle || null,
        bio: db?.bio ?? null,
        avatar_url: resolvedAvatar,
        photo_url: resolvedAvatar,
        user_type: db?.user_type || db?.role || null,
        contact: db?.contact ?? null,
        address: db?.address ?? null,
        location: compactLocation(db?.location),
        linkedin_url: db?.linkedin_url ?? null,
        role: db?.role ?? null,
        previous_works: Array.isArray(db?.previous_works) ? db.previous_works : [],
        social_links: Array.isArray(db?.social_links) ? db.social_links : [],
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
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const links = useMemo(() => {
    if (!profile) return [] as SocialLink[];
    const base = (profile.social_links || []).filter((x) => x?.url);
    if (profile.linkedin_url) {
      base.unshift({ platform: "LinkedIn", url: profile.linkedin_url, label: "LinkedIn" });
    }
    return base;
  }, [profile]);

  const roleBadges = useMemo(() => resolveRoleBadges(profile), [profile]);
  const lastUpdatedLabel = profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : null;

  const openExternalUrl = async (url: string) => {
    const value = String(url || "").trim();
    if (!value) return;
    const safe = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const canOpen = await Linking.canOpenURL(safe);
    if (canOpen) {
      Linking.openURL(safe).catch(() => {});
    }
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={nav.back}
        >
          <Ionicons name="arrow-back" size={15} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Profile</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Public profile</T>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          {loading ? (
            <SurfaceCard style={styles.loadingCard}>
              <ActivityIndicator color={palette.accent} />
            </SurfaceCard>
          ) : !profile ? (
            <SurfaceCard style={styles.loadingCard}>
              <T weight="semiBold" color={palette.text} style={styles.emptyTitle}>Profile unavailable</T>
              <T weight="regular" color={palette.subText} style={styles.emptySubtitle}>
                This user hasn’t completed a public profile yet.
              </T>
            </SurfaceCard>
          ) : (
            <>
              <SurfaceCard style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.avatarWrap}>
                    {profile.photo_url || profile.avatar_url ? (
                      <Avatar source={profile.photo_url || profile.avatar_url || undefined} size={64} />
                    ) : (
                      <View style={[styles.initialsAvatar, { backgroundColor: palette.accentSoft }]}>
                        <T weight="bold" color={palette.accent} style={styles.initialsText}>
                          {(profile.display_name || "U")
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </T>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="semiBold" color={palette.text} style={styles.heroName} numberOfLines={1}>
                      {profile.display_name || "User"}
                    </T>
                    {profile.username && (
                      <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                        @{profile.username}
                      </T>
                    )}
                    {profile.location && (
                      <T weight="regular" color={palette.subText} style={styles.heroMeta} numberOfLines={1}>
                        {profile.location}
                      </T>
                    )}
                  </View>
                </View>

                <T weight="regular" color={palette.subText} style={styles.bioText}>
                  {profile.bio || "No bio added yet."}
                </T>
                <T weight="regular" color={palette.subText} style={styles.updatedText}>
                  Last updated: {lastUpdatedLabel || "Not available"}
                </T>
              </SurfaceCard>

              {links.length > 0 && (
                <SurfaceCard style={styles.sectionCard}>
                  <T weight="semiBold" color={palette.text} style={styles.sectionTitle}>Links</T>
                  <View style={styles.linkList}>
                    {links.map((link, index) => (
                      <TouchableOpacity
                        key={`${link.url}-${index}`}
                        style={[styles.linkRow, { borderColor: palette.borderLight }]}
                        onPress={() => openExternalUrl(String(link.url || ""))}
                      >
                        <Ionicons name="link" size={14} color={palette.accent} />
                        <T weight="medium" color={palette.text} style={styles.linkText} numberOfLines={1}>
                          {socialLabel(link)}
                        </T>
                      </TouchableOpacity>
                    ))}
                  </View>
                </SurfaceCard>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  pageTitle: { fontSize: 15 },
  pageSubtitle: { fontSize: 11 },
  scrollContent: { paddingBottom: 120 },
  content: { padding: 20, gap: 16 },
  loadingCard: {
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 15 },
  emptySubtitle: { fontSize: 12, textAlign: "center" },
  heroCard: { padding: 16, gap: 10 },
  heroTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatarWrap: { width: 64, height: 64 },
  initialsAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: { fontSize: 16 },
  heroName: { fontSize: 16 },
  heroMeta: { fontSize: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" },
  badge: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { fontSize: 10, lineHeight: 12, textTransform: "uppercase" },
  bioText: { fontSize: 12, lineHeight: 18 },
  updatedText: { fontSize: 11 },
  sectionCard: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13 },
  linkList: { gap: 10 },
  linkRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: { fontSize: 12, flex: 1 },
});
