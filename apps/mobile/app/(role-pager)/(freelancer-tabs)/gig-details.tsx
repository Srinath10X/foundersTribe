import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useContracts, useGig, useMyProposals } from "@/hooks/useGig";
import { formatTimeline, parseGigDescription } from "@/lib/gigContent";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type FounderProfileView = {
  name: string;
  handle: string | null;
  role: string | null;
  avatar: string | null;
};

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeHandle(value: unknown) {
  const raw = firstString(value);
  if (!raw) return null;
  return raw.replace(/^@+/, "");
}

function formatRole(value: unknown) {
  const raw = firstString(value);
  if (!raw) return null;
  if (/^founder$/i.test(raw)) return "Founder";
  if (/^freelancer$/i.test(raw)) return "Freelancer";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function resolveAvatar(candidate: unknown, userId: string): Promise<string | null> {
  try {
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
  } catch {
    return null;
  }
}

async function buildFounderProfileView(
  rawProfile: any,
  founderId: string,
  fallback: FounderProfileView,
): Promise<FounderProfileView> {
  const avatarCandidate =
    firstString(rawProfile?.photo_url, rawProfile?.avatar_url, fallback.avatar) || null;
  const avatar = await resolveAvatar(avatarCandidate, founderId);

  return {
    name:
      firstString(rawProfile?.display_name, rawProfile?.full_name, rawProfile?.name, fallback.name) ||
      "Founder",
    handle: normalizeHandle(rawProfile?.username) || normalizeHandle(rawProfile?.handle) || fallback.handle,
    role: formatRole(rawProfile?.role) || formatRole(rawProfile?.user_type) || fallback.role,
    avatar: avatar || fallback.avatar,
  };
}

function statusLabel(status?: string) {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "draft") return "Draft";
  return "Open";
}

export default function GigDetailsScreen() {
  const router = useRouter();
  const { palette } = useFlowPalette();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ id?: string }>();
  const resolvedId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: item, isLoading } = useGig(resolvedId);
  const { data: myProposals } = useMyProposals({ limit: 100 });
  const { data: myContracts } = useContracts({ limit: 100 });

  const myProposal = useMemo(() => {
    if (!resolvedId) return null;
    return (myProposals?.items || []).find((p) => p.gig_id === resolvedId) || null;
  }, [myProposals?.items, resolvedId]);

  const acceptedContract = useMemo(() => {
    if (!myProposal?.id) return null;
    return (myContracts?.items || []).find((c) => c.proposal_id === myProposal.id) || null;
  }, [myContracts?.items, myProposal?.id]);

  const status = item?.status || "open";
  const statusTone =
    status === "completed" ? palette.subText : status === "in_progress" ? "#F59E0B" : palette.accent;
  const statusBg =
    status === "completed"
      ? palette.borderLight
      : status === "in_progress"
        ? "rgba(245,158,11,0.14)"
        : palette.accentSoft;

  const tags = item?.gig_tags?.map((t) => t.tags?.label).filter(Boolean) || [];
  const parsedContent = parseGigDescription(item?.description || "");
  const budgetText = item
    ? `₹${Number(item.budget_min || 0).toLocaleString()} - ₹${Number(item.budget_max || 0).toLocaleString()}`
    : "-";

  const founderFromGig = useMemo<FounderProfileView>(
    () => ({
      name: firstString(item?.founder?.full_name) || "Founder",
      handle: normalizeHandle(item?.founder?.handle),
      role: "Founder",
      avatar: firstString(item?.founder?.avatar_url),
    }),
    [item?.founder?.avatar_url, item?.founder?.full_name, item?.founder?.handle],
  );
  const [founderProfile, setFounderProfile] = useState<FounderProfileView>(founderFromGig);

  useEffect(() => {
    setFounderProfile(founderFromGig);
  }, [founderFromGig]);

  useEffect(() => {
    const founderId = firstString(item?.founder_id);
    const token = session?.access_token;
    if (!founderId || !token) return;

    let cancelled = false;
    (async () => {
      const cached = queryClient.getQueryData<any>(["tribe-public-profile", founderId]);
      if (cached) {
        const hydrated = await buildFounderProfileView(cached, founderId, founderFromGig);
        if (!cancelled) setFounderProfile(hydrated);
      }

      try {
        const raw = await tribeApi.getPublicProfile(token, founderId);
        queryClient.setQueryData(["tribe-public-profile", founderId], raw);
        const hydrated = await buildFounderProfileView(raw, founderId, founderFromGig);
        if (!cancelled) setFounderProfile(hydrated);
      } catch {
        // Keep joined founder fallback if profile service is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [founderFromGig, item?.founder_id, queryClient, session?.access_token]);

  const founderMeta = founderProfile.handle
    ? `@${founderProfile.handle}`
    : founderProfile.role || "Founder account";

  const ctaDisabled = !!myProposal && !acceptedContract;
  const ctaLabel = myProposal
    ? acceptedContract
      ? "Open Contract"
      : "Already Submitted"
    : "Send Proposal";

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={17} color={palette.text} />
        </TouchableOpacity>

        <T weight="medium" color={palette.text} style={styles.headerTitle} numberOfLines={1}>
          Gig Details
        </T>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: palette.borderLight }]}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.pill, { backgroundColor: statusBg }]}> 
                <T weight="medium" color={statusTone} style={styles.pillText}>
                  {statusLabel(status)}
                </T>
              </View>
              <View style={[styles.pill, { backgroundColor: palette.borderLight }]}> 
                <T weight="regular" color={palette.subText} style={styles.pillText}>
                  {item?.experience_level || "mid"}
                </T>
              </View>
            </View>

            <T weight="medium" color={palette.text} style={styles.gigTitle}>
              {item?.title || (isLoading ? "Loading..." : "Gig")}
            </T>
            <T weight="regular" color={palette.subText} style={styles.gigCompany}>
              {founderProfile.name}
            </T>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>
                  {budgetText}
                </T>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>
                  {formatTimeline(parsedContent.timelineValue, parsedContent.timelineUnit)}
                </T>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name={item?.is_remote ? "globe-outline" : "business-outline"} size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>
                  {item?.is_remote ? "Remote" : item?.location_text || "On-site"}
                </T>
              </View>
            </View>
          </LinearGradient>

          <SurfaceCard style={styles.card}>
            <View style={styles.ownerRow}>
              <Avatar source={founderProfile.avatar || undefined} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" color={palette.text} style={styles.ownerName} numberOfLines={1}>
                  {founderProfile.name}
                </T>
                <T weight="regular" color={palette.subText} style={styles.ownerMeta} numberOfLines={1}>
                  {founderMeta}
                </T>
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Project Overview
            </T>
            <T weight="regular" color={palette.subText} style={styles.sectionBody}>
              {parsedContent.projectOverview || "No description available."}
            </T>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Deliverables
            </T>
            {parsedContent.deliverables.length > 0 ? (
              parsedContent.deliverables.map((entry, idx) => (
                <T key={`deliverable-${idx}`} weight="regular" color={palette.subText} style={styles.sectionBody}>
                  - {entry}
                </T>
              ))
            ) : (
              <T weight="regular" color={palette.subText} style={styles.sectionBody}>
                No deliverables listed.
              </T>
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Screening Questions
            </T>
            {parsedContent.screeningQuestions.length > 0 ? (
              parsedContent.screeningQuestions.map((entry, idx) => (
                <T key={`question-${idx}`} weight="regular" color={palette.subText} style={styles.sectionBody}>
                  {idx + 1}. {entry}
                </T>
              ))
            ) : (
              <T weight="regular" color={palette.subText} style={styles.sectionBody}>
                No screening questions provided.
              </T>
            )}
          </SurfaceCard>

          {tags.length > 0 ? (
            <SurfaceCard style={styles.card}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Skills Needed
              </T>
              <View style={styles.skillWrap}>
                {tags.map((tag) => (
                  <View key={tag} style={[styles.skillTag, { backgroundColor: palette.borderLight }]}> 
                    <T weight="regular" color={palette.subText} style={styles.skillText}>
                      {tag}
                    </T>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={ctaDisabled}
            style={[
              styles.primaryBtn,
              { backgroundColor: ctaDisabled ? palette.borderLight : palette.accent },
            ]}
            onPress={() => {
              if (acceptedContract?.id) {
                router.push(`/(role-pager)/(freelancer-tabs)/contract-details?id=${encodeURIComponent(acceptedContract.id)}` as any);
                return;
              }

              if (!myProposal) {
                router.push(`/(role-pager)/(freelancer-tabs)/send-proposal?id=${encodeURIComponent(resolvedId || "")}` as any);
              }
            }}
          >
            <T
              weight="medium"
              color={ctaDisabled ? palette.subText : "#fff"}
              style={styles.primaryText}
            >
              {ctaLabel}
            </T>
          </TouchableOpacity>

          <View style={{ height: tabBarHeight + 18 }} />
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
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  gigTitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  gigCompany: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 10,
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  ownerName: {
    fontSize: 13,
    lineHeight: 17,
  },
  ownerMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    padding: 14,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  skillWrap: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  skillTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skillText: {
    fontSize: 11,
    lineHeight: 14,
  },
  primaryBtn: {
    marginTop: 2,
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
});
