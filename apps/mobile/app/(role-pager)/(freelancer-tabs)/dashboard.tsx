import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, RefreshControl, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";

import { Avatar, FlowScreen, PrimaryButton, SurfaceCard, T, people, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { gigService, FreelancerStats, Gig } from "@/lib/gigService";

export default function TalentDashboardScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const router = useRouter();

  const [stats, setStats] = useState<FreelancerStats | null>(null);
  const [activeJobs, setActiveJobs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [fetchedStats, fetchedGigs] = await Promise.all([
        gigService.getStats(),
        gigService.getGigs({ status: "in_progress", limit: 3 })
      ]);
      setStats(fetchedStats);
      setActiveJobs(fetchedGigs || []);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const earnings = stats?.earnings_mtd ?? 0;
  const activeProjects = stats?.active_projects ?? 0;
  const earningsGrowth = stats?.earnings_growth_pct ?? 0;

  return (
    <FlowScreen>
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <View style={styles.userRow}>
          <Avatar source={people.alex} size={54} />
          <View style={{ flex: 1 }}>
            <T weight="bold" color={palette.text} style={styles.name}>Arjun Patel</T>
            <T weight="medium" color={palette.subText} style={styles.role}>Senior UI Designer</T>
          </View>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
            <Ionicons name="notifications-outline" size={18} color={palette.subText} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          {error ? (
            <SurfaceCard style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={32} color="#FF3B30" />
              <T weight="medium" color={palette.text} style={styles.errorText}>{error}</T>
              <PrimaryButton label="Retry" onPress={fetchDashboardData} style={styles.retryBtn} />
            </SurfaceCard>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.accent} />
              <T color={palette.subText} style={{ marginTop: 8 }}>Loading dashboard...</T>
            </View>
          ) : (
            <>
              <View style={styles.kpiRow}>
                <SurfaceCard style={styles.kpiCard}>
                  <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>EARNINGS (MTD)</T>
                  <T weight="bold" color={palette.text} style={styles.kpiValue}>₹{earnings.toLocaleString()}</T>
                  <T weight="semiBold" color={earningsGrowth >= 0 ? palette.success : "#FF3B30"} style={styles.kpiMeta}>
                    {earningsGrowth >= 0 ? "+" : ""}{earningsGrowth}%
                  </T>
                </SurfaceCard>
                <SurfaceCard style={styles.kpiCard}>
                  <T weight="semiBold" color={palette.subText} style={styles.kpiLabel}>ACTIVE PROJECTS</T>
                  <T weight="bold" color={palette.text} style={styles.kpiValue}>{activeProjects}</T>
                  <T weight="medium" color={palette.subText} style={styles.kpiMeta}>In progress</T>
                </SurfaceCard>
              </View>

              <View style={styles.sectionHead}>
                <T weight="bold" color={palette.text} style={styles.sectionTitle}>My Active Jobs</T>
                <TouchableOpacity onPress={() => nav.push("/talent-stack/contracts")}>
                  <T weight="bold" color={palette.accent} style={styles.link}>View All</T>
                </TouchableOpacity>
              </View>

              {activeJobs.length === 0 ? (
                <SurfaceCard style={styles.emptyCard}>
                  <Ionicons name="briefcase-outline" size={32} color={palette.subText} />
                  <T weight="medium" color={palette.subText} style={styles.emptyText}>No active jobs found.</T>
                  <PrimaryButton label="Browse Gigs" onPress={() => router.push("/(role-pager)/(freelancer-tabs)/browse-gigs")} style={styles.emptyBtn} />
                </SurfaceCard>
              ) : (
                activeJobs.map((job) => {
                  const jobProgress = job.progress !== undefined ? job.progress : Math.floor(Math.random() * 60) + 10; // Fallback mock 
                  // Formatting date
                  const dueDate = job.deadline ? new Date(job.deadline) : new Date();
                  const now = new Date();
                  const diffTime = Math.abs(dueDate.getTime() - now.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isOverdue = dueDate < now;

                  return (
                    <TouchableOpacity
                      key={job.id}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/talent-stack/gig-details?id=${job.id}` as any)}
                    >
                      <SurfaceCard style={styles.jobCard}>
                        <View style={styles.jobHead}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <T weight="bold" color={palette.text} style={styles.jobTitle} numberOfLines={1}>{job.title}</T>
                            <T weight="medium" color={palette.subText} style={styles.company}>{job.client_company || job.client_name || "A Client"}</T>
                          </View>
                          <T weight="semiBold" color={isOverdue ? "#FF3B30" : palette.accent} style={styles.due}>
                            {isOverdue ? "Overdue" : `Due in ${diffDays}d`}
                          </T>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                          <View style={[styles.progressFill, { width: `${jobProgress}%`, backgroundColor: palette.accent }]} />
                        </View>
                        <View style={styles.jobFoot}>
                          <T weight="medium" color={palette.subText} style={styles.company}>Progress</T>
                          <T weight="semiBold" color={palette.text} style={styles.company}>{jobProgress}%</T>
                        </View>
                      </SurfaceCard>
                    </TouchableOpacity>
                  );
                })
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
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 21 },
  role: { fontSize: 13 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiCard: { flex: 1, padding: 12 },
  kpiLabel: { fontSize: 10, letterSpacing: 0.8 },
  kpiValue: { fontSize: 24, marginTop: 4 },
  kpiMeta: { fontSize: 13, marginTop: 4 },
  sectionHead: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18 },
  link: { fontSize: 14, padding: 4 },
  jobCard: { padding: 16, borderRadius: 12, marginBottom: 4 },
  jobHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  jobTitle: { fontSize: 16, lineHeight: 22 },
  company: { fontSize: 13, marginTop: 4 },
  due: { fontSize: 12 },
  progressTrack: { marginTop: 16, height: 8, borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  jobFoot: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  loadingContainer: { padding: 40, alignItems: "center", justifyContent: "center" },
  errorCard: { padding: 24, alignItems: "center", borderRadius: 12 },
  errorText: { marginTop: 12, marginBottom: 16, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  emptyCard: { padding: 32, alignItems: "center", borderRadius: 12 },
  emptyText: { marginTop: 12, marginBottom: 16 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
