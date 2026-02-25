import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Badge,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useContracts, useGig } from "@/hooks/useGig";
import { formatTimeline, parseGigDescription } from "@/lib/gigContent";

export default function GigDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: gig, isLoading, error, refetch } = useGig(id);
  const { data: contractsData } = useContracts({ limit: 100 });

  const tags = gig?.gig_tags?.map((gt) => gt.tags?.label).filter(Boolean) ?? [];
  const parsedContent = parseGigDescription(gig?.description || "");
  const isLockedForEdit = Boolean((contractsData?.items ?? []).some((c) => c.gig_id === gig?.id));

  const statusTone =
    gig?.status === "open"
      ? ("success" as const)
      : gig?.status === "in_progress"
        ? ("progress" as const)
        : ("neutral" as const);

  const statusLabel =
    gig?.status === "open"
      ? "Hiring"
      : gig?.status === "in_progress"
        ? "In Progress"
        : gig?.status === "completed"
          ? "Completed"
          : gig?.status === "draft"
            ? "Draft"
            : gig?.status === "cancelled"
              ? "Cancelled"
              : "Unknown";

  const postedAgo = gig
    ? (() => {
        const days = Math.floor((Date.now() - new Date(gig.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (days === 0) return "Posted today";
        if (days === 1) return "Posted yesterday";
        return `Posted ${days} days ago`;
      })()
    : "";

  if (!id) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Gig Details</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review requirements and status</T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <ErrorState title="No gig ID" message="No gig ID was provided." onRetry={nav.back} />
        </View>
      </FlowScreen>
    );
  }

  if (isLoading) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Gig Details</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review requirements and status</T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <LoadingState rows={4} />
        </View>
      </FlowScreen>
    );
  }

  if (error || !gig) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <TouchableOpacity style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]} onPress={nav.back}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>Gig Details</T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review requirements and status</T>
          </View>
        </View>
        <View style={styles.feedbackWrap}>
          <ErrorState title="Failed to load gig" message={error?.message || "Gig not found"} onRetry={() => refetch()} />
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
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Gig Details</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Review requirements and status</T>
        </View>
        {isLockedForEdit ? null : (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
            onPress={() => nav.push(`/freelancer-stack/post-gig?id=${gig.id}`)}
          >
            <Ionicons name="pencil" size={14} color={palette.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <SurfaceCard style={styles.card}>
            <View style={styles.topRow}>
              <Badge label={statusLabel} tone={statusTone} />
              <T weight="regular" color={palette.subText} style={styles.postedAgo}>{postedAgo}</T>
            </View>
            <T weight="medium" color={palette.text} style={styles.title}>
              {gig.title}
            </T>
            {gig.founder?.full_name ? (
              <View style={styles.founderRow}>
                <Ionicons name="person-circle-outline" size={14} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.founderText} numberOfLines={1}>
                  {gig.founder.full_name}
                </T>
              </View>
            ) : null}
          </SurfaceCard>

          <View style={styles.kpiRow}>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Budget</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                ₹{Number(gig.budget_min).toLocaleString()} - ₹{Number(gig.budget_max).toLocaleString()}
              </T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Timeline</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                {formatTimeline(parsedContent.timelineValue, parsedContent.timelineUnit)}
              </T>
            </SurfaceCard>
          </View>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.blockTitle}>Project Overview</T>
            <T weight="regular" color={palette.subText} style={styles.blockBody}>
              {parsedContent.projectOverview || "No project overview provided."}
            </T>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.blockTitle}>Deliverables</T>
            {parsedContent.deliverables.length > 0 ? (
              parsedContent.deliverables.map((item, idx) => (
                <T key={`deliverable-${idx}`} weight="regular" color={palette.subText} style={styles.blockBody}>
                  - {item}
                </T>
              ))
            ) : (
              <T weight="regular" color={palette.subText} style={styles.blockBody}>
                No deliverables listed.
              </T>
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.blockTitle}>Screening Questions</T>
            {parsedContent.screeningQuestions.length > 0 ? (
              parsedContent.screeningQuestions.map((item, idx) => (
                <T key={`question-${idx}`} weight="regular" color={palette.subText} style={styles.blockBody}>
                  {idx + 1}. {item}
                </T>
              ))
            ) : (
              <T weight="regular" color={palette.subText} style={styles.blockBody}>
                No screening questions added.
              </T>
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <T weight="medium" color={palette.text} style={styles.blockTitle}>Details</T>

            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={14} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.detailText}>
                Experience: {gig.experience_level ? gig.experience_level.charAt(0).toUpperCase() + gig.experience_level.slice(1) : "-"}
              </T>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name={gig.is_remote ? "globe-outline" : "location-outline"} size={14} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.detailText}>
                {gig.is_remote ? "Remote" : gig.location_text || "On-site"}
              </T>
            </View>
            {gig.startup_stage ? (
              <View style={styles.detailRow}>
                <Ionicons name="rocket-outline" size={14} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.detailText}>
                  Stage: {gig.startup_stage.charAt(0).toUpperCase() + gig.startup_stage.slice(1)}
                </T>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={14} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.detailText}>
                {gig.proposals_count} proposal{gig.proposals_count !== 1 ? "s" : ""}
              </T>
            </View>
          </SurfaceCard>

          {tags.length > 0 ? (
            <SurfaceCard style={styles.card}>
              <T weight="medium" color={palette.text} style={styles.blockTitle}>Skills & Tags</T>
              <View style={styles.tagsWrap}>
                {tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}> 
                    <T weight="regular" color={palette.text} style={styles.tagText}>{tag}</T>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          ) : null}

          <View style={styles.actionsWrap}>
            <PrimaryButton label="View Proposals" onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)} />
          </View>
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
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  feedbackWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  card: {
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  postedAgo: {
    fontSize: 10,
    lineHeight: 13,
  },
  title: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 19,
  },
  founderRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  founderText: {
    fontSize: 11,
    lineHeight: 14,
    flex: 1,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 17,
  },
  blockTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  blockBody: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
  },
  detailRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 11,
    lineHeight: 14,
  },
  tagsWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  tagText: {
    fontSize: 10,
    lineHeight: 13,
  },
  actionsWrap: {
    marginTop: 4,
  },
});
