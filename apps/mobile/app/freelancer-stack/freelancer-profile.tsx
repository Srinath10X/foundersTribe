import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
import { EmptyState } from "@/components/freelancer/EmptyState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { searchAccounts } from "@/lib/searchService";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type PublicProfile = {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  role?: string | null;
  user_type?: string | null;
  location?: string | null;
  rating?: number | string | null;
  hourly_rate?: number | string | null;
  skills?: string[] | null;
};

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;

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

export default function FreelancerProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [freelancer, setFreelancer] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFreelancer = useCallback(async () => {
    const freelancerId = typeof id === "string" ? id : "";
    if (!freelancerId) {
      setFreelancer(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fallback = searchAccounts("").find((item) => item.id === freelancerId) || null;

    if (!session?.access_token) {
      setFreelancer(
        fallback
          ? {
              id: fallback.id,
              display_name: fallback.display_name,
              username: fallback.username,
              bio: fallback.bio,
              avatar_url: fallback.avatar_url,
              role: "freelancer",
              skills: fallback.skills,
              rating: fallback.rating,
              hourly_rate: fallback.hourly_rate,
            }
          : null,
      );
      setLoading(false);
      return;
    }

    try {
      const raw = await tribeApi.getPublicProfile(session.access_token, freelancerId);
      const avatar =
        (await resolveAvatar(raw?.photo_url || raw?.avatar_url || null, freelancerId)) ||
        fallback?.avatar_url ||
        people.alex;

      setFreelancer({
        id: freelancerId,
        display_name: raw?.display_name || raw?.full_name || fallback?.display_name || "Freelancer",
        username: raw?.username || raw?.handle || fallback?.username || null,
        bio: raw?.bio ?? fallback?.bio ?? null,
        avatar_url: avatar,
        photo_url: avatar,
        role: raw?.role || raw?.user_type || "freelancer",
        user_type: raw?.user_type || null,
        location: typeof raw?.location === "string" ? raw.location : null,
        rating: raw?.rating ?? fallback?.rating ?? null,
        hourly_rate: raw?.hourly_rate ?? fallback?.hourly_rate ?? null,
        skills: Array.isArray(raw?.skills)
          ? raw.skills
          : Array.isArray(fallback?.skills)
            ? fallback.skills
            : [],
      });
    } catch {
      setFreelancer(
        fallback
          ? {
              id: fallback.id,
              display_name: fallback.display_name,
              username: fallback.username,
              bio: fallback.bio,
              avatar_url: fallback.avatar_url || people.alex,
              photo_url: fallback.avatar_url || people.alex,
              role: "freelancer",
              skills: fallback.skills,
              rating: fallback.rating,
              hourly_rate: fallback.hourly_rate,
            }
          : null,
      );
    } finally {
      setLoading(false);
    }
  }, [id, session?.access_token]);

  useEffect(() => {
    loadFreelancer();
  }, [loadFreelancer]);

  const skills = useMemo(() => freelancer?.skills ?? [], [freelancer?.skills]);
  const ratingValue = Number(freelancer?.rating);
  const rateValue = Number(freelancer?.hourly_rate);
  const ratingDisplay = Number.isFinite(ratingValue) && ratingValue > 0 ? `${ratingValue.toFixed(1)} / 5` : "N/A";
  const rateDisplay = Number.isFinite(rateValue) && rateValue > 0 ? `INR ${rateValue}/hr` : "N/A";

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
        <View style={styles.contentPad}><LoadingState rows={4} /></View>
      </FlowScreen>
    );
  }

  if (!freelancer) {
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
        <View style={styles.contentPad}>
          <ErrorState
            title="Freelancer not found"
            message="The profile couldn't be loaded."
            onRetry={loadFreelancer}
          />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
        <View style={styles.contentPad}>
          <SurfaceCard style={styles.heroCard}>
            <View style={styles.head}>
              <View style={styles.avatarWrap}>
                <Avatar source={freelancer.photo_url || freelancer.avatar_url || people.alex} size={72} />
                <View style={[styles.online, { borderColor: palette.surface }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>{freelancer.display_name}</T>
                <T weight="regular" color={palette.subText} style={styles.role} numberOfLines={1}>
                  {freelancer.role || freelancer.user_type || "freelancer"}
                </T>
                {freelancer.bio ? (
                  <T weight="regular" color={palette.subText} style={styles.bio} numberOfLines={2}>{freelancer.bio}</T>
                ) : null}
              </View>
            </View>
          </SurfaceCard>

          <View style={styles.statsRow}>
            <SurfaceCard style={styles.statCard}>
              <T weight="regular" color={palette.subText} style={styles.statLabel}>Rating</T>
              <T weight="medium" color={palette.text} style={styles.statValue}>{ratingDisplay}</T>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <T weight="regular" color={palette.subText} style={styles.statLabel}>Hourly Rate</T>
              <T weight="medium" color={palette.text} style={styles.statValue}>{rateDisplay}</T>
            </SurfaceCard>
          </View>

          {skills.length > 0 ? (
            <SurfaceCard style={styles.sectionCard}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>Top Skills</T>
              <View style={styles.tags}>
                {skills.map((skill) => (
                  <View key={skill} style={[styles.tag, { backgroundColor: palette.border }]}> 
                    <T weight="regular" color={palette.subText} style={styles.tagText}>{skill}</T>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.sectionCard}>
              <EmptyState
                icon="construct-outline"
                title="No skills listed"
                subtitle="This freelancer hasn't added skills to their profile yet."
              />
            </SurfaceCard>
          )}
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
  pageTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  pageSubtitle: { marginTop: 1, fontSize: 12, lineHeight: 16 },
  scrollPad: { paddingBottom: 100 },
  contentPad: { paddingHorizontal: 18, paddingTop: 14, gap: 8 },
  heroCard: { padding: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  online: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "#5FA876",
  },
  name: { fontSize: 14, lineHeight: 19 },
  role: { marginTop: 2, fontSize: 11, lineHeight: 14, textTransform: "capitalize" },
  bio: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, padding: 10 },
  statLabel: { fontSize: 10, lineHeight: 13 },
  statValue: { marginTop: 4, fontSize: 13, lineHeight: 17 },
  sectionCard: { padding: 12 },
  sectionTitle: { fontSize: 13, lineHeight: 17 },
  tags: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 10, lineHeight: 13 },
});
