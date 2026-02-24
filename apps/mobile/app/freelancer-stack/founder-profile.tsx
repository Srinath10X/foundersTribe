import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  FlowTopBar,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { StatCard } from "@/components/freelancer/StatCard";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { SP, RADIUS } from "@/components/freelancer/designTokens";
import { useMyProfile, useMyGigs, useContracts } from "@/hooks/useGig";

export default function FounderProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useMyProfile();
  const { data: gigsData, isLoading: gigsLoading } = useMyGigs({ limit: 3, status: "open" });
  const { data: contractsData } = useContracts();

  const isLoading = profileLoading;

  if (isLoading) {
    return (
      <FlowScreen>
        <FlowTopBar title="Founder Profile" showLeft={false} />
        <View style={{ paddingHorizontal: SP._16, paddingTop: SP._16 }}>
          <LoadingState rows={4} />
        </View>
      </FlowScreen>
    );
  }

  if (profileError || !profile) {
    return (
      <FlowScreen>
        <FlowTopBar title="Founder Profile" showLeft={false} />
        <View style={{ paddingHorizontal: SP._16, paddingTop: SP._16 }}>
          <ErrorState
            title="Failed to load profile"
            message={profileError?.message || "Profile not found"}
            onRetry={() => refetchProfile()}
          />
        </View>
      </FlowScreen>
    );
  }

  const fullName = profile.full_name || profile.handle || "Founder";
  const avatarUrl = profile.avatar_url;
  const bio = profile.bio || "";
  const city = profile.city;
  const state = profile.state;
  const country = profile.country;
  const locationStr = [city, state, country].filter(Boolean).join(", ") || "Location not set";
  const startupStage = profile.startup_stage
    ? profile.startup_stage.charAt(0).toUpperCase() + profile.startup_stage.slice(1)
    : "—";

  const allGigs = gigsData?.items ?? [];
  const contracts = contractsData?.items ?? [];
  const activeGigs = allGigs.filter((g) => g.status === "open" || g.status === "in_progress");

  // Derive metrics
  const totalGigsPosted = allGigs.length;
  const totalContracts = contracts.length;
  const completedContracts = contracts.filter((c) => c.status === "completed").length;
  const hireRate = totalGigsPosted > 0
    ? Math.round((totalContracts / totalGigsPosted) * 100)
    : 0;

  // Profile details
  const highlights = [
    { label: "Role", value: profile.role === "founder" ? "Founder" : profile.role === "both" ? "Founder & Freelancer" : profile.role },
    { label: "Stage", value: startupStage },
    { label: "Location", value: locationStr },
    { label: "Timezone", value: profile.timezone || "—" },
    ...(profile.linkedin_url ? [{ label: "LinkedIn", value: "Connected" }] : []),
    ...(profile.portfolio_url ? [{ label: "Portfolio", value: "Available" }] : []),
  ];

  const metrics = [
    { label: "Gigs Posted", value: String(totalGigsPosted) },
    { label: "Contracts", value: String(totalContracts) },
    { label: "Completed", value: String(completedContracts) },
    { label: "Hire Rate", value: `${hireRate}%` },
  ];
  const metricRows = [
    [metrics[0], metrics[1]],
    [metrics[2], metrics[3]],
  ];

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return "";
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <FlowScreen>
      <FlowTopBar title="Founder Profile" showLeft={false} />

      {/* Hero Card */}
      <SurfaceCard style={styles.heroCard}>
        <View style={styles.headerWrap}>
          <View style={styles.avatarWrap}>
            <Avatar source={avatarUrl ? { uri: avatarUrl } : undefined} size={88} />
            <View style={[styles.verify, { backgroundColor: palette.accent }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </View>
          <T weight="bold" color={palette.text} style={styles.name}>{fullName}</T>
          <T weight="semiBold" color={palette.text} style={styles.role}>
            {profile.role === "founder" ? "Founder" : "Founder & Freelancer"}
            {profile.startup_stage ? ` • ${startupStage} Stage` : ""}
          </T>
          {bio ? (
            <T weight="medium" color={palette.subText} style={styles.bio}>
              {bio}
            </T>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={palette.subText} />
              <T weight="medium" color={palette.subText} style={styles.metaText}>{locationStr}</T>
            </View>
            {profile.timezone && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={palette.subText} />
                <T weight="medium" color={palette.subText} style={styles.metaText}>{profile.timezone}</T>
              </View>
            )}
          </View>
        </View>
      </SurfaceCard>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metricRows.map((row, rowIdx) => (
          <View key={`row-${rowIdx}`} style={styles.metricRow}>
            {row.map((m) => (
              <StatCard key={m.label} label={m.label} value={m.value} />
            ))}
          </View>
        ))}
      </View>

      {/* Profile Details */}
      <SurfaceCard style={styles.card}>
        <T weight="bold" color={palette.text} style={styles.cardTitle}>Profile Details</T>
        <View style={styles.detailsGrid}>
          {highlights.map((h) => (
            <View key={h.label} style={styles.detailCell}>
              <T weight="semiBold" color={palette.subText} style={styles.detailLabel}>{h.label}</T>
              <T weight="semiBold" color={palette.text} style={styles.detailValue} numberOfLines={1}>{h.value}</T>
            </View>
          ))}
        </View>
      </SurfaceCard>

      {/* Contact Info */}
      <SurfaceCard style={styles.card}>
        <T weight="bold" color={palette.text} style={styles.cardTitle}>Contact</T>
        {profile.email && (
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={15} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.rowText}>{profile.email}</T>
          </View>
        )}
        {profile.phone && (
          <View style={styles.row}>
            <Ionicons name="call-outline" size={15} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.rowText}>{profile.phone}</T>
          </View>
        )}
        {profile.linkedin_url && (
          <View style={styles.row}>
            <Ionicons name="logo-linkedin" size={15} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.rowText} numberOfLines={1}>{profile.linkedin_url}</T>
          </View>
        )}
        {profile.portfolio_url && (
          <View style={styles.row}>
            <Ionicons name="globe-outline" size={15} color={palette.subText} />
            <T weight="medium" color={palette.subText} style={styles.rowText} numberOfLines={1}>{profile.portfolio_url}</T>
          </View>
        )}
        {!profile.email && !profile.phone && !profile.linkedin_url && !profile.portfolio_url && (
          <T weight="medium" color={palette.subText} style={{ fontSize: 14, marginTop: SP._8 }}>
            No contact information set.
          </T>
        )}
      </SurfaceCard>

      {/* Active Postings */}
      <View style={styles.sectionHead}>
        <T weight="bold" color={palette.text} style={styles.sectionTitle}>Active Postings</T>
        <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}>
          <T weight="bold" color={palette.accent} style={styles.link}>See All</T>
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        {gigsLoading ? (
          <LoadingState rows={2} />
        ) : activeGigs.length === 0 ? (
          <T weight="medium" color={palette.subText} style={{ fontSize: 14, textAlign: "center", paddingVertical: SP._16 }}>
            No active postings.
          </T>
        ) : (
          activeGigs.map((gig) => (
            <TouchableOpacity
              key={gig.id}
              activeOpacity={0.8}
              onPress={() => nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
            >
              <SurfaceCard style={styles.postCard}>
                <T weight="bold" color={palette.text} style={styles.postTitle}>{gig.title}</T>
                <T weight="medium" color={palette.subText} style={styles.postMeta}>
                  {formatAmount(gig.budget_min)} – {formatAmount(gig.budget_max)} • {gig.budget_type === "hourly" ? "Hourly" : "Fixed"}
                </T>
                {gig.gig_tags && gig.gig_tags.length > 0 && (
                  <View style={styles.tags}>
                    {gig.gig_tags.slice(0, 3).map((gt) => (
                      <View key={gt.tag_id} style={[styles.tag, { backgroundColor: palette.border }]}>
                        <T weight="medium" color={palette.subText} style={styles.tagTxt}>{gt.tags?.label || gt.tag_id}</T>
                      </View>
                    ))}
                  </View>
                )}
              </SurfaceCard>
            </TouchableOpacity>
          ))
        )}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginHorizontal: SP._16, marginTop: SP._16, padding: SP._16 },
  headerWrap: { alignItems: "center" },
  avatarWrap: { position: "relative" },
  verify: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: { fontSize: 24, marginTop: SP._12, letterSpacing: -0.4 },
  role: { fontSize: 14, marginTop: SP._2 },
  bio: { fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: SP._12, maxWidth: 330 },
  metaRow: { flexDirection: "row", gap: SP._16, marginTop: SP._12, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: SP._8 },
  metaText: { fontSize: 13 },

  metricsGrid: { gap: SP._16, paddingHorizontal: SP._16, marginTop: SP._16 },
  metricRow: { flexDirection: "row", gap: SP._16 },

  card: { marginHorizontal: SP._16, marginTop: SP._16, padding: SP._16 },
  cardTitle: { fontSize: 16, letterSpacing: -0.2 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: SP._16, rowGap: SP._16 },
  detailCell: { width: "50%", paddingRight: SP._8 },
  detailLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  detailValue: { fontSize: 14, marginTop: SP._4 },
  row: { flexDirection: "row", alignItems: "center", gap: SP._8, marginTop: SP._12 },
  rowText: { fontSize: 14, flex: 1, lineHeight: 20 },

  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP._24, paddingHorizontal: SP._16 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.2 },
  link: { fontSize: 14 },

  listWrap: { paddingHorizontal: SP._16, marginTop: SP._12, gap: SP._12 },
  postCard: { padding: SP._16, borderRadius: RADIUS.lg },
  postTitle: { fontSize: 15, flexShrink: 1, letterSpacing: -0.2 },
  postMeta: { fontSize: 13, marginTop: SP._4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SP._8, marginTop: SP._12 },
  tag: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
  tagTxt: { fontSize: 11 },
});
