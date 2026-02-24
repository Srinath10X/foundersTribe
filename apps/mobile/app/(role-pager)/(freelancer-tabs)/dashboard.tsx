import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import {
  Avatar,
  FlowScreen,
  PrimaryButton,
  SurfaceCard,
  T,
  people,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { StatCard } from "@/components/freelancer/StatCard";
import { SectionHeader } from "@/components/freelancer/SectionHeader";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { SP, RADIUS, SHADOWS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { gigService, FreelancerStats, Gig } from "@/lib/gigService";

// ─── Temporary Dummy Data ──────────────────────────────────────
const DUMMY_STATS: FreelancerStats = {
  earnings_mtd: 124500,
  active_projects: 3,
  earnings_growth_pct: 12,
};

const DUMMY_ACTIVE_JOBS: Gig[] = [
  {
    id: "dj-1",
    title: "Mobile Banking App — React Native",
    description: "Cross-platform fintech mobile app.",
    budget: 85000,
    status: "in_progress",
    progress: 72,
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "PayFlex Finance",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dj-2",
    title: "E-Commerce Dashboard Redesign",
    description: "Analytics dashboard UI overhaul.",
    budget: 25000,
    status: "in_progress",
    progress: 45,
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "ShopEasy",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dj-3",
    title: "API Integration — Payment Gateway",
    description: "Stripe + Razorpay integration.",
    budget: 35000,
    status: "in_progress",
    progress: 20,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "GreenCart",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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
        gigService.getGigs({ status: "in_progress", limit: 3 }),
      ]);
      setStats(fetchedStats || DUMMY_STATS);
      setActiveJobs(fetchedGigs && fetchedGigs.length > 0 ? fetchedGigs : DUMMY_ACTIVE_JOBS);
    } catch (err: any) {
      console.error("Dashboard fetch error (using dummy):", err);
      setStats(DUMMY_STATS);
      setActiveJobs(DUMMY_ACTIVE_JOBS);
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
    <FlowScreen scroll={false}>
      {/* ─── Premium Header ─── */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.borderLight }]}>
        <View style={styles.headerLeft}>
          <T weight="medium" color={palette.subText} style={styles.greeting}>
            Welcome back
          </T>
          <T weight="bold" color={palette.text} style={styles.name}>
            Arjun Patel
          </T>
          <T weight="medium" color={palette.subText} style={styles.role}>
            Senior UI Designer
          </T>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: palette.card, borderColor: palette.borderLight }]}
          >
            <Ionicons name="notifications-outline" size={18} color={palette.subText} />
            <View style={[styles.notifDot, { backgroundColor: palette.accent }]} />
          </TouchableOpacity>
          <Avatar source={people.alex} size={48} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Error State ─── */}
        {error ? (
          <View style={styles.content}>
            <EmptyState
              icon="alert-circle-outline"
              title="Something went wrong"
              subtitle={error}
              ctaLabel="Retry"
              onCtaPress={fetchDashboardData}
            />
          </View>
        ) : loading ? (
          <View style={styles.content}>
            {/* KPI Skeleton */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiSkeleton, { backgroundColor: palette.card, borderColor: palette.borderLight }]} />
              <View style={[styles.kpiSkeleton, { backgroundColor: palette.card, borderColor: palette.borderLight }]} />
            </View>
            <LoadingState rows={2} style={{ marginTop: SP._16 }} />
          </View>
        ) : (
          <View style={styles.content}>
            {/* ─── KPI Stats Row ─── */}
            <View style={styles.kpiRow}>
              <StatCard
                label="Earnings (MTD)"
                value={`₹${earnings.toLocaleString()}`}
                trend={earningsGrowth}
                accentColor={palette.text}
              />
              <StatCard
                label="Active Projects"
                value={activeProjects}
                trendLabel="In progress"
              />
            </View>

            {/* ─── Active Jobs ─── */}
            <View style={styles.section}>
              <SectionHeader
                title="My Active Jobs"
                actionLabel="View All"
                onAction={() => nav.push("/talent-stack/contracts")}
              />

              {activeJobs.length === 0 ? (
                <EmptyState
                  icon="briefcase-outline"
                  title="No active jobs"
                  subtitle="Browse available gigs and start earning today."
                  ctaLabel="Browse Gigs"
                  onCtaPress={() => router.push("/(role-pager)/(freelancer-tabs)/browse-gigs")}
                />
              ) : (
                <View style={styles.jobList}>
                  {activeJobs.map((job) => {
                    const jobProgress = job.progress !== undefined ? job.progress : Math.floor(Math.random() * 60) + 10;
                    const dueDate = job.deadline ? new Date(job.deadline) : new Date();
                    const now = new Date();
                    const diffTime = Math.abs(dueDate.getTime() - now.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isOverdue = dueDate < now;

                    return (
                      <TouchableOpacity
                        key={job.id}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/talent-stack/gig-details?id=${job.id}` as any)}
                      >
                        <View style={[styles.jobCard, { backgroundColor: palette.card, borderColor: palette.borderLight }]}>
                          <View style={styles.jobHead}>
                            <View style={styles.jobInfo}>
                              <T weight="bold" color={palette.text} style={styles.jobTitle} numberOfLines={1}>
                                {job.title}
                              </T>
                              <T weight="medium" color={palette.subText} style={styles.company}>
                                {job.client_company || job.client_name || "A Client"}
                              </T>
                            </View>
                            <View style={[styles.duePill, { backgroundColor: isOverdue ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)' }]}>
                              <T weight="bold" color={isOverdue ? "#FF3B30" : palette.accent} style={styles.dueText}>
                                {isOverdue ? "Overdue" : `${diffDays}d left`}
                              </T>
                            </View>
                          </View>

                          {/* Progress */}
                          <View style={styles.progressSection}>
                            <View style={styles.progressHeader}>
                              <T weight="medium" color={palette.subText} style={styles.progressLabel}>
                                Progress
                              </T>
                              <T weight="bold" color={palette.text} style={styles.progressValue}>
                                {jobProgress}%
                              </T>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${jobProgress}%`,
                                    backgroundColor: jobProgress >= 80 ? palette.success : palette.accent,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SP._20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP._12,
  },
  greeting: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: SP._2,
  },
  role: {
    fontSize: 13,
    marginTop: SP._2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._20,
  },
  kpiRow: {
    flexDirection: "row",
    gap: SP._12,
  },
  kpiSkeleton: {
    flex: 1,
    height: 110,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  section: {
    marginTop: SP._32,
  },
  jobList: {
    gap: SP._12,
  },
  jobCard: {
    padding: SP._20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  jobHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SP._12,
  },
  jobInfo: {
    flex: 1,
    minWidth: 0,
  },
  jobTitle: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  company: {
    fontSize: 13,
    marginTop: SP._4,
  },
  duePill: {
    paddingHorizontal: SP._12,
    paddingVertical: SP._6,
    borderRadius: RADIUS.pill,
  },
  dueText: {
    fontSize: 12,
  },
  progressSection: {
    marginTop: SP._16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP._8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 14,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
