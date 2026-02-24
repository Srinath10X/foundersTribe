import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { ErrorState } from "@/components/freelancer/ErrorState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { useContracts, useMyGigs, useMyProfile } from "@/hooks/useGig";

export default function FounderProfileScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useMyProfile();
  const { data: gigsData, isLoading: gigsLoading } = useMyGigs({ limit: 3, status: "open" });
  const { data: contractsData } = useContracts();

  if (profileLoading) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Founder Profile</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Your account overview</T>
        </View>
        <View style={styles.pad}><LoadingState rows={4} /></View>
      </FlowScreen>
    );
  }

  if (profileError || !profile) {
    return (
      <FlowScreen>
        <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
          <T weight="medium" color={palette.text} style={styles.pageTitle}>Founder Profile</T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Your account overview</T>
        </View>
        <View style={styles.pad}>
          <ErrorState title="Failed to load profile" message={profileError?.message || "Profile not found"} onRetry={() => refetchProfile()} />
        </View>
      </FlowScreen>
    );
  }

  const fullName = profile.full_name || profile.handle || "Founder";
  const avatarUrl = profile.avatar_url;
  const bio = profile.bio || "";
  const locationStr = [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "Location not set";
  const startupStage = profile.startup_stage
    ? profile.startup_stage.charAt(0).toUpperCase() + profile.startup_stage.slice(1)
    : "-";

  const allGigs = gigsData?.items ?? [];
  const contracts = contractsData?.items ?? [];
  const activeGigs = allGigs.filter((g) => g.status === "open" || g.status === "in_progress");

  const totalGigsPosted = allGigs.length;
  const totalContracts = contracts.length;
  const completedContracts = contracts.filter((c) => c.status === "completed").length;
  const hireRate = totalGigsPosted > 0 ? Math.round((totalContracts / totalGigsPosted) * 100) : 0;

  const highlights = [
    { label: "Role", value: profile.role === "founder" ? "Founder" : profile.role === "both" ? "Founder & Freelancer" : profile.role || "-" },
    { label: "Stage", value: startupStage },
    { label: "Location", value: locationStr },
    { label: "Timezone", value: profile.timezone || "-" },
  ];

  const metrics = [
    { label: "Gigs Posted", value: String(totalGigsPosted) },
    { label: "Contracts", value: String(totalContracts) },
    { label: "Completed", value: String(completedContracts) },
    { label: "Hire Rate", value: `${hireRate}%` },
  ];

  const formatAmount = (amount: number | undefined) => (amount ? `₹${amount.toLocaleString()}` : "");

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>Founder Profile</T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>Your account overview</T>
      </View>

      <View style={styles.pad}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarWrap}>
              <Avatar source={avatarUrl ? { uri: avatarUrl } : undefined} size={70} />
              <View style={[styles.verify, { backgroundColor: palette.accent }]}> 
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="medium" color={palette.text} style={styles.name} numberOfLines={1}>{fullName}</T>
              <T weight="regular" color={palette.subText} style={styles.role} numberOfLines={1}>
                {profile.role === "founder" ? "Founder" : "Founder & Freelancer"}
                {profile.startup_stage ? ` • ${startupStage}` : ""}
              </T>
              {bio ? <T weight="regular" color={palette.subText} style={styles.bio} numberOfLines={2}>{bio}</T> : null}
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.metaText} numberOfLines={1}>{locationStr}</T>
            </View>
            {profile.timezone ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={palette.subText} />
                <T weight="regular" color={palette.subText} style={styles.metaText}>{profile.timezone}</T>
              </View>
            ) : null}
          </View>
        </SurfaceCard>

        <View style={styles.metricsGrid}>
          {metrics.map((m) => (
            <SurfaceCard key={m.label} style={styles.metricCard}>
              <T weight="regular" color={palette.subText} style={styles.metricLabel}>{m.label}</T>
              <T weight="medium" color={palette.text} style={styles.metricValue}>{m.value}</T>
            </SurfaceCard>
          ))}
        </View>

        <SurfaceCard style={styles.card}>
          <T weight="medium" color={palette.text} style={styles.cardTitle}>Profile Details</T>
          <View style={styles.detailsGrid}>
            {highlights.map((h) => (
              <View key={h.label} style={styles.detailCell}>
                <T weight="regular" color={palette.subText} style={styles.detailLabel}>{h.label}</T>
                <T weight="medium" color={palette.text} style={styles.detailValue} numberOfLines={1}>{h.value}</T>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <T weight="medium" color={palette.text} style={styles.cardTitle}>Contact</T>
          {profile.email ? (
            <View style={styles.row}><Ionicons name="mail-outline" size={13} color={palette.subText} /><T weight="regular" color={palette.subText} style={styles.rowText}>{profile.email}</T></View>
          ) : null}
          {profile.phone ? (
            <View style={styles.row}><Ionicons name="call-outline" size={13} color={palette.subText} /><T weight="regular" color={palette.subText} style={styles.rowText}>{profile.phone}</T></View>
          ) : null}
          {profile.linkedin_url ? (
            <View style={styles.row}><Ionicons name="logo-linkedin" size={13} color={palette.subText} /><T weight="regular" color={palette.subText} style={styles.rowText} numberOfLines={1}>{profile.linkedin_url}</T></View>
          ) : null}
          {!profile.email && !profile.phone && !profile.linkedin_url ? (
            <T weight="regular" color={palette.subText} style={styles.emptyTxt}>No contact information set.</T>
          ) : null}
        </SurfaceCard>

        <View style={styles.sectionHead}>
          <T weight="medium" color={palette.text} style={styles.sectionTitle}>Active Postings</T>
          <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}>
            <T weight="regular" color={palette.accent} style={styles.link}>See all</T>
          </TouchableOpacity>
        </View>

        <View style={styles.listWrap}>
          {gigsLoading ? (
            <LoadingState rows={2} />
          ) : activeGigs.length === 0 ? (
            <T weight="regular" color={palette.subText} style={styles.emptyTxt}>No active postings.</T>
          ) : (
            activeGigs.map((gig) => (
              <TouchableOpacity key={gig.id} activeOpacity={0.86} onPress={() => nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)}>
                <SurfaceCard style={styles.postCard}>
                  <T weight="medium" color={palette.text} style={styles.postTitle} numberOfLines={1}>{gig.title}</T>
                  <T weight="regular" color={palette.subText} style={styles.postMeta} numberOfLines={1}>
                    {formatAmount(gig.budget_min)} - {formatAmount(gig.budget_max)} • {gig.budget_type === "hourly" ? "Hourly" : "Fixed"}
                  </T>
                </SurfaceCard>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
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
  pageTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  pageSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  pad: { paddingHorizontal: 18, paddingTop: 14, gap: 8 },
  heroCard: { padding: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative" },
  verify: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  name: { fontSize: 14, lineHeight: 19 },
  role: { marginTop: 1, fontSize: 11, lineHeight: 14 },
  bio: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  metaRow: { marginTop: 8, gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { flex: 1, fontSize: 11, lineHeight: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { width: "48.8%", padding: 10 },
  metricLabel: { fontSize: 10, lineHeight: 13 },
  metricValue: { marginTop: 4, fontSize: 13, lineHeight: 17 },
  card: { padding: 12 },
  cardTitle: { fontSize: 13, lineHeight: 17 },
  detailsGrid: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  detailCell: { width: "50%", paddingRight: 8 },
  detailLabel: { fontSize: 10, lineHeight: 13 },
  detailValue: { marginTop: 2, fontSize: 11, lineHeight: 14 },
  row: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  rowText: { flex: 1, fontSize: 11, lineHeight: 14 },
  sectionHead: { marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 13, lineHeight: 17 },
  link: { fontSize: 11, lineHeight: 14 },
  listWrap: { gap: 8, paddingBottom: 120 },
  postCard: { padding: 10 },
  postTitle: { fontSize: 12, lineHeight: 16 },
  postMeta: { marginTop: 2, fontSize: 10, lineHeight: 13 },
  emptyTxt: { fontSize: 11, lineHeight: 14 },
});
