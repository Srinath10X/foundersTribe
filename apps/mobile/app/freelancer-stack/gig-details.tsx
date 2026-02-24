import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  Badge,
  FlowScreen,
  FlowTopBar,
  PrimaryButton,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { SectionHeader } from "@/components/freelancer/SectionHeader";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { SP, RADIUS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { useGig } from "@/hooks/useGig";

export default function GigDetailsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: gig, isLoading: loading, error, refetch } = useGig(id);

  // Extract tags from gig_tags join
  const tags = gig?.gig_tags?.map((gt) => gt.tags?.label).filter(Boolean) ?? [];

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

  // ─── No ID state ───
  if (!id) {
    return (
      <FlowScreen>
        <FlowTopBar title="Gig Details" onLeftPress={nav.back} />
        <ErrorState title="No gig ID" message="No gig ID was provided." onRetry={nav.back} />
      </FlowScreen>
    );
  }

  // ─── Loading state ───
  if (loading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Gig Details" onLeftPress={nav.back} />
        <LoadingState rows={5} />
      </FlowScreen>
    );
  }

  // ─── Error state ───
  if (error || !gig) {
    return (
      <FlowScreen>
        <FlowTopBar title="Gig Details" onLeftPress={nav.back} />
        <ErrorState
          title="Failed to load gig"
          message={error?.message || "Gig not found"}
          onRetry={() => refetch()}
        />
      </FlowScreen>
    );
  }

  return (
    <FlowScreen>
      <FlowTopBar
        title="Gig Details"
        onLeftPress={nav.back}
        right="create-outline"
        onRightPress={() => nav.push(`/freelancer-stack/post-gig?id=${gig.id}`)}
      />

      {/* ─── Title Section ─── */}
      <View style={[styles.titleSection, { backgroundColor: palette.surface }]}>
        <View style={styles.titleHeader}>
          <Badge label={statusLabel} tone={statusTone} />
          <T weight="medium" color={palette.subText} style={styles.postedAgo}>
            {postedAgo}
          </T>
        </View>
        <T weight="bold" color={palette.text} style={styles.title}>
          {gig.title}
        </T>
        {gig.founder?.full_name && (
          <View style={styles.founderRow}>
            <Ionicons name="person-circle-outline" size={18} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.founderName}>
              {gig.founder.full_name}
            </T>
          </View>
        )}
      </View>

      {/* ─── Stats Row ─── */}
      <View style={[styles.statsRow, { borderColor: palette.borderLight }]}>
        <View style={[styles.statCol, { borderRightColor: palette.borderLight }]}>
          <T weight="semiBold" color={palette.subText} style={styles.statLabel}>Budget Range</T>
          <T weight="bold" color={palette.accent} style={styles.statValue}>
            ₹{Number(gig.budget_min).toLocaleString()} - ₹{Number(gig.budget_max).toLocaleString()}
          </T>
        </View>
        <View style={styles.statCol}>
          <T weight="semiBold" color={palette.subText} style={styles.statLabel}>Type</T>
          <T weight="bold" color={palette.text} style={styles.statValue}>
            {gig.budget_type === "hourly" ? "Hourly" : "Fixed Price"}
          </T>
        </View>
      </View>

      {/* ─── Description ─── */}
      <View style={[styles.sectionPad, styles.bordered, { borderBottomColor: palette.borderLight }]}>
        <SectionHeader title="Description" style={{ marginBottom: SP._8 }} />
        <T color={palette.subText} style={styles.body}>
          {gig.description}
        </T>
      </View>

      {/* ─── Details Row ─── */}
      <View style={[styles.sectionPad, styles.bordered, { borderBottomColor: palette.borderLight }]}>
        <SectionHeader title="Details" style={{ marginBottom: SP._8 }} />
        <View style={styles.detailRow}>
          <Ionicons name="briefcase-outline" size={16} color={palette.subText} />
          <T weight="medium" color={palette.subText} style={styles.detailText}>
            Experience: {gig.experience_level ? gig.experience_level.charAt(0).toUpperCase() + gig.experience_level.slice(1) : "—"}
          </T>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name={gig.is_remote ? "globe-outline" : "location-outline"} size={16} color={palette.subText} />
          <T weight="medium" color={palette.subText} style={styles.detailText}>
            {gig.is_remote ? "Remote" : gig.location_text || "On-site"}
          </T>
        </View>
        {gig.startup_stage && (
          <View style={styles.detailRow}>
            <Ionicons name="rocket-outline" size={16} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.detailText}>
              Stage: {gig.startup_stage.charAt(0).toUpperCase() + gig.startup_stage.slice(1)}
            </T>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color={palette.subText} />
          <T weight="medium" color={palette.subText} style={styles.detailText}>
            {gig.proposals_count} proposal{gig.proposals_count !== 1 ? "s" : ""}
          </T>
        </View>
      </View>

      {/* ─── Tags ─── */}
      {tags.length > 0 && (
        <View style={[styles.sectionPad, styles.bordered, { borderBottomColor: palette.borderLight }]}>
          <SectionHeader title="Skills & Tags" style={{ marginBottom: SP._8 }} />
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: palette.border }]}>
                <T weight="medium" color={palette.text} style={styles.tagText}>{tag}</T>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Exit & Actions ─── */}
      <TouchableOpacity style={styles.exitLink} onPress={() => nav.replace("/freelancer-stack")} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={18} color={palette.subText} />
        <T weight="semiBold" color={palette.subText} style={styles.exitText}>
          Back to Dashboard
        </T>
      </TouchableOpacity>

      <View style={styles.ctaWrap}>
        <PrimaryButton
          label="View Proposals"
          onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)}
        />
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  titleSection: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._20,
    paddingBottom: SP._24,
  },
  titleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postedAgo: {
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    marginTop: SP._12,
  },
  founderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SP._8,
  },
  founderName: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: SP._20,
  },
  statCol: {
    flex: 1,
    padding: SP._20,
    borderRightWidth: 1,
  },
  statLabel: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginTop: SP._8,
  },
  sectionPad: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._24,
  },
  bordered: {
    borderBottomWidth: 1,
    paddingBottom: SP._24,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._8,
    marginBottom: SP._12,
  },
  detailText: {
    fontSize: 14,
  },
  tags: {
    flexDirection: "row",
    gap: SP._8,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: SP._16,
    paddingVertical: SP._8,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    fontSize: 13,
  },
  exitLink: {
    marginTop: SP._20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SP._8,
  },
  exitText: {
    fontSize: 14,
  },
  ctaWrap: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: SP._24,
    marginBottom: SP._32,
  },
});
