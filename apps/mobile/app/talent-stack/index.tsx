import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Avatar, FlowScreen, PrimaryButton, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";

const activeJobs = [
  { title: "SaaS Platform Redesign", company: "Velocity Tech Inc.", progress: 75, due: "Due in 2d" },
  { title: "Mobile App Prototyping", company: "Lumina Wellness", progress: 30, due: "Due in 8d" },
];

export default function TalentDashboardScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();

  return (
    <FlowScreen>
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}> 
        <View style={styles.userRow}>
          <Avatar source={people.alex} size={54} />
          <View style={{ flex: 1 }}>
            <T weight="bold" color={palette.text} style={styles.name}>Alex Rivera</T>
            <T weight="medium" color={palette.subText} style={styles.role}>Senior UI Designer</T>
          </View>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
          <Ionicons name="notifications-outline" size={18} color={palette.subText} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.kpiRow}>
          <SurfaceCard style={styles.kpiCard}>
            <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>EARNINGS (MTD)</T>
            <T weight="bold" color={palette.text} style={styles.kpiValue}>$8,450</T>
            <T weight="semiBold" color={palette.success} style={styles.kpiMeta}>+12%</T>
          </SurfaceCard>
          <SurfaceCard style={styles.kpiCard}>
            <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>ACTIVE PROJECTS</T>
            <T weight="bold" color={palette.text} style={styles.kpiValue}>4</T>
            <T weight="medium" color={palette.subText} style={styles.kpiMeta}>In progress</T>
          </SurfaceCard>
        </View>

        <PrimaryButton label="Browse New Gigs" icon="search" onPress={() => nav.push("/talent-stack/browse-gigs")} />

        <View style={styles.sectionHead}>
          <T weight="bold" color={palette.text} style={styles.sectionTitle}>My Active Jobs</T>
          <TouchableOpacity onPress={() => nav.push("/talent-stack/contracts")}> 
            <T weight="bold" color={palette.accent} style={styles.link}>View All</T>
          </TouchableOpacity>
        </View>

        {activeJobs.map((job) => (
          <SurfaceCard key={job.title} style={styles.jobCard}>
            <View style={styles.jobHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="bold" color={palette.text} style={styles.jobTitle} numberOfLines={1}>{job.title}</T>
                <T weight="medium" color={palette.subText} style={styles.company}>{job.company}</T>
              </View>
              <T weight="semiBold" color={palette.accent} style={styles.due}>{job.due}</T>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}> 
              <View style={[styles.progressFill, { width: `${job.progress}%`, backgroundColor: palette.accent }]} />
            </View>
            <View style={styles.jobFoot}>
              <T weight="medium" color={palette.subText} style={styles.company}>Progress</T>
              <T weight="semiBold" color={palette.text} style={styles.company}>{job.progress}%</T>
            </View>
          </SurfaceCard>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  name: { fontSize: 21 },
  role: { fontSize: 13 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiCard: { flex: 1, padding: 12 },
  kpiLabel: { fontSize: 10, letterSpacing: 0.8 },
  kpiValue: { fontSize: 21, marginTop: 4 },
  kpiMeta: { fontSize: 12, marginTop: 3 },
  sectionHead: { marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 20 },
  link: { fontSize: 13 },
  jobCard: { padding: 12 },
  jobHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  jobTitle: { fontSize: 17 },
  company: { fontSize: 13, marginTop: 2 },
  due: { fontSize: 12 },
  progressTrack: { marginTop: 12, height: 9, borderRadius: 999 },
  progressFill: { height: 9, borderRadius: 999 },
  jobFoot: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
