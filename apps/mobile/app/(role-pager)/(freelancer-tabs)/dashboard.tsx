import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  people,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useContracts, useFreelancerStats, useMyProposals } from "@/hooks/useGig";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";

const STORAGE_BUCKET = "tribe-media";

type Metric = {
  id: string;
  label: string;
  value: string;
  note: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type JobItem = {
  id: string;
  title: string;
  client: string;
  due: string;
  progress: number;
  priority: "high" | "medium" | "low";
};

type InsightItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function normalizeHumanName(
  raw?: string | null,
  email?: string | null,
): string {
  let value = (raw || "").trim();
  if (!value) {
    return (email || "").split("@")[0] || "User";
  }

  if (/^[A-Za-z0-9]+-/.test(value)) {
    value = value.replace(/^[A-Za-z0-9]+-/, "").trim();
  }

  value = value
    .replace(/\b(B\.?\s*Tech|M\.?\s*Tech|BTech|MTech).*/i, "")
    .replace(/\([^)]*\)\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!value) {
    return (email || "").split("@")[0] || "User";
  }

  if (value === value.toUpperCase()) {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return value;
}

function KpiTile({ metric }: { metric: Metric }) {
  const { palette } = useFlowPalette();
  return (
    <SurfaceCard style={styles.kpiCard}>
      <View style={styles.kpiHead}>
        <T weight="medium" color={palette.subText} style={styles.kpiLabel}>
          {metric.label}
        </T>
        <View style={[styles.kpiIcon, { backgroundColor: palette.accentSoft }]}>
          <Ionicons name={metric.icon} size={13} color={palette.accent} />
        </View>
      </View>
      <T weight="semiBold" color={palette.text} style={styles.kpiValue}>
        {metric.value}
      </T>
      <T weight="regular" color={palette.subText} style={styles.kpiNote}>
        {metric.note}
      </T>
    </SurfaceCard>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { palette } = useFlowPalette();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.quickAction,
        { backgroundColor: palette.surface, borderColor: palette.borderLight },
      ]}
    >
      <Ionicons name={icon} size={16} color={palette.text} />
      <T weight="medium" color={palette.text} style={styles.quickActionLabel}>
        {label}
      </T>
    </TouchableOpacity>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  const { palette } = useFlowPalette();
  return (
    <SurfaceCard style={styles.insightCard}>
      <View
        style={[styles.insightIcon, { backgroundColor: palette.accentSoft }]}
      >
        <Ionicons name={item.icon} size={14} color={palette.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T
          weight="medium"
          color={palette.text}
          style={styles.insightTitle}
          numberOfLines={1}
        >
          {item.title}
        </T>
        <T
          weight="regular"
          color={palette.subText}
          style={styles.insightSubtitle}
          numberOfLines={1}
        >
          {item.subtitle}
        </T>
      </View>
    </SurfaceCard>
  );
}

function JobCard({ item, onPress }: { item: JobItem; onPress: () => void }) {
  const { palette } = useFlowPalette();
  const priorityColor =
    item.priority === "high"
      ? "#FF3B30"
      : item.priority === "medium"
        ? "#F59E0B"
        : palette.accent;
  const priorityBg =
    item.priority === "high"
      ? "rgba(255,59,48,0.14)"
      : item.priority === "medium"
        ? "rgba(245,158,11,0.14)"
        : palette.accentSoft;

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <SurfaceCard style={styles.jobCard}>
        <View style={styles.jobHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T
              weight="medium"
              color={palette.text}
              style={styles.jobTitle}
              numberOfLines={1}
            >
              {item.title}
            </T>
            <T
              weight="regular"
              color={palette.subText}
              style={styles.jobClient}
              numberOfLines={1}
            >
              {item.client}
            </T>
          </View>
          <View style={[styles.priorityPill, { backgroundColor: priorityBg }]}>
            <T
              weight="medium"
              color={priorityColor}
              style={styles.priorityText}
            >
              {item.priority}
            </T>
          </View>
        </View>

        <View
          style={[
            styles.progressTrack,
            { backgroundColor: palette.borderLight },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${item.progress}%`, backgroundColor: palette.accent },
            ]}
          />
        </View>

        <View style={styles.jobMeta}>
          <T
            weight="regular"
            color={palette.subText}
            style={styles.jobMetaText}
          >
            Due {item.due}
          </T>
          <T weight="semiBold" color={palette.text} style={styles.jobMetaText}>
            {item.progress}%
          </T>
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

function chunkIntoRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

async function resolveAvatarUrl(
  candidate: unknown,
  userId: string,
): Promise<string | null> {
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim()) {
    const { data: signedData, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (!error && signedData?.signedUrl) {
      return `${signedData.signedUrl}&t=${Date.now()}`;
    }
  }

  if (!userId) return null;

  const folder = `profiles/${userId}`;
  const { data: files, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 20 });
  if (error || !Array.isArray(files) || files.length === 0) return null;

  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const fullPath = `${folder}/${preferred.name}`;
  const { data: signedData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(fullPath, 60 * 60 * 24 * 30);
  if (!signedData?.signedUrl) return null;
  return `${signedData.signedUrl}&t=${Date.now()}`;
}

export default function TalentDashboardScreen() {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [headerName, setHeaderName] = useState("User");
  const [headerRole, setHeaderRole] = useState("Freelancer");
  const [headerAvatar, setHeaderAvatar] = useState<string>(people.alex);
  const [headerBio, setHeaderBio] = useState("");
  const { data: statsData, refetch: refetchStats } = useFreelancerStats();
  const { data: contractsData, refetch: refetchContracts } = useContracts({ status: "active", limit: 20 });
  const { data: myProposalsData, refetch: refetchMyProposals } = useMyProposals({ limit: 50 });

  useEffect(() => {
    let cancelled = false;

    const hydrateIdentity = async () => {
      try {
        const {
          data: { user: freshUser },
        } = await supabase.auth.getUser();

        const meta =
          freshUser?.user_metadata || session?.user?.user_metadata || {};
        const profileMeta = meta?.profile_data || {};
        let dbProfile: any = null;

        if (session?.access_token) {
          try {
            dbProfile = await tribeApi.getMyProfile(session.access_token);
          } catch {
            dbProfile = null;
          }
        }

        const resolvedName = normalizeHumanName(
          dbProfile?.display_name ||
            profileMeta?.display_name ||
            meta?.full_name ||
            meta?.name ||
            "",
          freshUser?.email || session?.user?.email || "",
        );

        const resolvedRole = String(
          dbProfile?.role ||
            dbProfile?.user_type ||
            profileMeta?.role ||
            meta?.user_type ||
            meta?.role ||
            "Freelancer",
        )
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const resolvedBio = String(
          dbProfile?.bio || profileMeta?.bio || meta?.bio || "",
        ).trim();

        const avatarCandidate =
          dbProfile?.photo_url ||
          dbProfile?.avatar_url ||
          profileMeta?.photo_url ||
          profileMeta?.avatar_url ||
          meta?.avatar_url ||
          meta?.picture ||
          null;

        const resolvedAvatar =
          (await resolveAvatarUrl(
            avatarCandidate,
            freshUser?.id || session?.user?.id || "",
          )) || people.alex;

        if (!cancelled) {
          setHeaderName(resolvedName);
          setHeaderRole(resolvedRole);
          setHeaderBio(resolvedBio);
          setHeaderAvatar(resolvedAvatar);
        }
      } catch {
        if (!cancelled) {
          const meta = session?.user?.user_metadata || {};
          setHeaderName(
            normalizeHumanName(
              meta?.full_name || meta?.name || "",
              session?.user?.email || "",
            ),
          );
          setHeaderRole(
            String(meta?.user_type || meta?.role || "Freelancer")
              .replace(/[_-]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          );
          setHeaderBio(String(meta?.bio || "").trim());
          setHeaderAvatar(people.alex);
        }
      }
    };

    hydrateIdentity();
    return () => {
      cancelled = true;
    };
  }, [
    session?.access_token,
    session?.user?.email,
    session?.user?.id,
    session?.user?.user_metadata,
  ]);

  const activeContracts = contractsData?.items || [];
  const proposalItems = myProposalsData?.items || [];
  const pendingProposals = proposalItems.filter((p) => p.status === "pending" || p.status === "shortlisted");

  const metrics: Metric[] = [
    {
      id: "m1",
      label: "This Month",
      value: `₹${Number(statsData?.earnings_mtd || 0).toLocaleString()}`,
      note: `${statsData?.earnings_growth_pct ?? 0}% vs last month`,
      icon: "trending-up-outline",
    },
    {
      id: "m2",
      label: "Active Jobs",
      value: String(statsData?.active_projects ?? activeContracts.length),
      note: `${activeContracts.length} contracts in progress`,
      icon: "briefcase-outline",
    },
  ];

  const activeJobs: JobItem[] = activeContracts.slice(0, 3).map((contract) => {
    const startedAt = new Date(contract.started_at).getTime();
    const elapsedDays = Math.max(1, Math.floor((Date.now() - startedAt) / (1000 * 60 * 60 * 24)));
    const progress = contract.status === "completed"
      ? 100
      : contract.founder_approved
        ? 95
        : contract.freelancer_marked_complete
          ? 80
          : Math.min(70, 20 + elapsedDays * 3);

    const priority: JobItem["priority"] = progress < 35 ? "high" : progress < 70 ? "medium" : "low";
    const client = contract.founder?.full_name || contract.gig?.founder?.full_name || "Founder";
    const due = contract.status === "completed" ? "completed" : `started ${new Date(contract.started_at).toLocaleDateString()}`;

    return {
      id: contract.id,
      title: contract.gig?.title || "Contract Work",
      client,
      due,
      progress,
      priority,
    };
  });

  const insights: InsightItem[] = [
    {
      id: "i1",
      title: `${pendingProposals.length} proposals awaiting response`,
      subtitle: "Follow up quickly to improve conversion",
      icon: "time-outline",
    },
    {
      id: "i2",
      title: `${activeContracts.length} active contract${activeContracts.length === 1 ? "" : "s"}`,
      subtitle: "Keep milestones and communication updated",
      icon: "checkmark-done-outline",
    },
    {
      id: "i3",
      title: "Profile visibility improves with fresh activity",
      subtitle: "Update portfolio and submit more proposals",
      icon: "flame-outline",
    },
  ];
  const metricRows = chunkIntoRows(metrics, 2);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.allSettled([
      refetchStats(),
      refetchContracts(),
      refetchMyProposals(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [refetchContracts, refetchMyProposals, refetchStats]);

  return (
    <FlowScreen scroll={false}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: palette.borderLight,
            backgroundColor: palette.bg,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>
              Dashboard
            </T>
            <T
              weight="regular"
              color={palette.subText}
              style={styles.pageSubtitle}
            >
              Freelancer workspace
            </T>
          </View>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                borderColor: palette.borderLight,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={palette.subText}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
        <View style={styles.content}>
            <LinearGradient
              colors={[palette.accentSoft, palette.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroCard, { borderColor: palette.borderLight }]}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroProfile}>
                  <Avatar source={headerAvatar} size={54} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T
                      weight="medium"
                      color={palette.text}
                      style={styles.heroName}
                      numberOfLines={2}
                    >
                      {headerName}
                    </T>
                    <T
                      weight="regular"
                      color={palette.subText}
                      style={styles.heroRole}
                      numberOfLines={1}
                    >
                      {headerRole}
                    </T>
                    {headerBio ? (
                      <T
                        weight="regular"
                        color={palette.subText}
                        style={styles.heroBio}
                        numberOfLines={2}
                      >
                        {headerBio}
                      </T>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.heroBottom}>
                <View style={styles.heroActions}>
                  <QuickAction
                    icon="document-text-outline"
                    label="Contracts"
                    onPress={() =>
                      router.push("/(role-pager)/(freelancer-tabs)/messages" as any)
                    }
                  />
                  <QuickAction
                    icon="compass-outline"
                    label="Browse Gigs"
                    onPress={() =>
                      router.push("/(role-pager)/(freelancer-tabs)/browse-gigs")
                    }
                  />
                </View>
              </View>
            </LinearGradient>

          <View style={styles.metricsGrid}>
            {metricRows.map((row, index) => (
              <View key={`metric-row-${index}`} style={styles.metricsRow}>
                {row.map((metric) => (
                  <View key={metric.id} style={styles.metricCell}>
                    <KpiTile metric={metric} />
                  </View>
                ))}
                {row.length === 1 ? <View style={styles.metricCell} /> : null}
              </View>
            ))}
          </View>

          <View style={styles.sectionHead}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Active Jobs
            </T>
            <TouchableOpacity
              onPress={() => router.push("/(role-pager)/(freelancer-tabs)/messages")}
            >
              <T
                weight="medium"
                color={palette.accent}
                style={styles.sectionLink}
              >
                View all
              </T>
            </TouchableOpacity>
          </View>

          <View style={styles.jobsStack}>
            {activeJobs.length === 0 ? (
              <SurfaceCard style={styles.emptyStateCard}>
                <T weight="regular" color={palette.subText} style={styles.emptyStateText}>
                  No active contracts yet
                </T>
              </SurfaceCard>
            ) : activeJobs.map((job) => (
              <JobCard
                key={job.id}
                item={job}
                onPress={() =>
                  router.push(
                    `/(role-pager)/(freelancer-tabs)/contract-details?id=${encodeURIComponent(job.id)}` as any,
                  )
                }
              />
            ))}
          </View>

          <View style={styles.sectionHead}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Insights
            </T>
          </View>
          <View style={styles.insightStack}>
            {insights.map((item) => (
              <InsightCard key={item.id} item={item} />
            ))}
          </View>
          <View style={{ height: tabBarHeight + 16 }} />
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
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroProfile: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  heroName: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  heroRole: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  heroBio: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
  heroBottom: {
    marginTop: 12,
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  metricsGrid: {
    gap: 8,
  },
  metricsRow: {
    flexDirection: "row",
    columnGap: 8,
  },
  metricCell: {
    flex: 1,
  },
  kpiCard: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  kpiIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  kpiNote: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
  sectionHead: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  jobsStack: {
    gap: 8,
  },
  emptyStateCard: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
    lineHeight: 16,
  },
  jobCard: {
    padding: 13,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  jobHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  jobTitle: {
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  jobClient: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
  priorityPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  priorityText: {
    textTransform: "capitalize",
    fontSize: 10,
    lineHeight: 13,
  },
  progressTrack: {
    marginTop: 11,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
  },
  jobMeta: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobMetaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  insightStack: {
    gap: 8,
  },
  insightCard: {
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  insightIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  insightSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
});
