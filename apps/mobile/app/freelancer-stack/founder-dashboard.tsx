import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useContracts, useMyGigs } from "@/hooks/useGig";
import { formatTimeline, parseGigDescription } from "@/lib/gigContent";
import gigApi from "@/lib/gigService";
import type { Gig, Proposal } from "@/types/gig";

type ProposalSummary = {
  total: number;
  pending: number;
  shortlisted: number;
  byGigPending: Record<string, number>;
};

const popularCategories = [
  { id: 1, title: "Graphic Designer", icon: "color-palette" as const, color: "#FF7A00", bg: "rgba(255,122,0,0.12)" },
  { id: 2, title: "Profile Maker", icon: "person" as const, color: "#007AFF", bg: "rgba(0,122,255,0.12)" },
  { id: 3, title: "Reel Editor", icon: "videocam" as const, color: "#FF2D55", bg: "rgba(255,45,85,0.12)" },
  { id: 4, title: "Financial Pro", icon: "briefcase" as const, color: "#34C759", bg: "rgba(52,199,89,0.12)" },
];

function formatMoney(min?: number | null, max?: number | null) {
  const low = Number(min || 0).toLocaleString();
  const high = Number(max || 0).toLocaleString();
  return `INR ${low} - ${high}`;
}

function statusTone(status: Gig["status"]) {
  if (status === "open") {
    return { label: "Hiring", color: "#34C759", bg: "rgba(52,199,89,0.12)" };
  }
  if (status === "in_progress") {
    return {
      label: "In progress",
      color: "#2A63F6",
      bg: "rgba(42,99,246,0.12)",
    };
  }
  if (status === "completed") {
    return { label: "Completed", color: "#5FA876", bg: "rgba(95,168,118,0.12)" };
  }
  return { label: "Draft", color: "#8E8E93", bg: "rgba(142,142,147,0.12)" };
}

export default function FounderDashboardScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";

  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSummary, setProposalSummary] = useState<ProposalSummary>({
    total: 0,
    pending: 0,
    shortlisted: 0,
    byGigPending: {},
  });

  const {
    data: gigsData,
    isLoading: gigsLoading,
    isRefetching: gigsRefetching,
    error: gigsError,
    refetch: refetchGigs,
  } = useMyGigs({ limit: 40 });

  const {
    data: contractsData,
    isLoading: contractsLoading,
    isRefetching: contractsRefetching,
    error: contractsError,
    refetch: refetchContracts,
  } = useContracts({ limit: 40 });

  const gigs = useMemo(() => gigsData?.items ?? [], [gigsData?.items]);
  const contracts = useMemo(
    () => (contractsData?.items ?? []).filter((contract) => !currentUserId || contract.founder_id === currentUserId),
    [contractsData?.items, currentUserId],
  );

  const loadProposalSummary = useCallback(async (sourceGigs: Gig[]) => {
    if (!sourceGigs.length) {
      setProposalSummary({
        total: 0,
        pending: 0,
        shortlisted: 0,
        byGigPending: {},
      });
      setProposalError(null);
      return;
    }

    // Limit batched requests to avoid flooding the API for large founder accounts.
    const targetGigs = sourceGigs.slice(0, 20);
    setProposalLoading(true);
    setProposalError(null);

    try {
      const responses = await Promise.all(
        targetGigs.map((gig) => gigApi.getGigProposals(gig.id, { limit: 50 })),
      );

      let total = 0;
      let pending = 0;
      let shortlisted = 0;
      const byGigPending: Record<string, number> = {};

      responses.forEach((res, index) => {
        const gigId = targetGigs[index]?.id;
        const proposals = res.items ?? [];
        total += proposals.length;

        const pendingForGig = proposals.filter(
          (proposal: Proposal) =>
            proposal.status === "pending" || proposal.status === "shortlisted",
        ).length;

        if (gigId) {
          byGigPending[gigId] = pendingForGig;
        }

        proposals.forEach((proposal: Proposal) => {
          if (proposal.status === "pending") pending += 1;
          if (proposal.status === "shortlisted") shortlisted += 1;
        });
      });

      setProposalSummary({ total, pending, shortlisted, byGigPending });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setProposalError(message || "Failed to load proposal insights.");
    } finally {
      setProposalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposalSummary(gigs);
  }, [gigs, loadProposalSummary]);

  const activeGigs = useMemo(
    () => gigs.filter((g) => g.status === "open" || g.status === "in_progress"),
    [gigs],
  );
  const openGigs = useMemo(() => gigs.filter((g) => g.status === "open").length, [gigs]);
  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === "active"),
    [contracts],
  );
  const contractByGigId = useMemo(() => {
    const map: Record<string, (typeof contracts)[number]> = {};
    contracts.forEach((contract) => {
      if (!contract?.gig_id) return;
      const existing = map[contract.gig_id];
      if (!existing) {
        map[contract.gig_id] = contract;
        return;
      }
      const existingTs = new Date(existing.updated_at || existing.created_at).getTime();
      const currentTs = new Date(contract.updated_at || contract.created_at).getTime();
      if (currentTs > existingTs) {
        map[contract.gig_id] = contract;
      }
    });
    return map;
  }, [contracts]);

  const gigsNeedingReview = useMemo(
    () =>
      activeGigs
        .map((gig) => ({
          gig,
          queueCount: proposalSummary.byGigPending[gig.id] || 0,
        }))
        .filter((item) => item.queueCount > 0)
        .sort((a, b) => b.queueCount - a.queueCount)
        .slice(0, 4),
    [activeGigs, proposalSummary.byGigPending],
  );

  const hasError = Boolean(gigsError || contractsError || proposalError);
  const loading = gigsLoading || contractsLoading;
  const activeCategoryTitle = searchText.trim().toLowerCase();

  const openServiceSearch = useCallback(
    (seed?: string) => {
      const q = (seed ?? searchText).trim();
      if (!q) {
        nav.push("/freelancer-stack/service-search");
        return;
      }
      nav.push(`/freelancer-stack/service-search?q=${encodeURIComponent(q)}`);
    },
    [nav, searchText],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const gigsResult = await refetchGigs();
      await refetchContracts();
      const latestGigs = gigsResult.data?.items ?? gigs;
      await loadProposalSummary(latestGigs);
    } finally {
      setRefreshing(false);
    }
  }, [gigs, loadProposalSummary, refetchContracts, refetchGigs]);

  return (
    <FlowScreen scroll={false}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: palette.borderLight,
            backgroundColor: palette.bg,
          },
        ]}
      >
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Find your{"\n"}
          <T weight="medium" color="#FF2D55" style={styles.pageTitle}>
            Freelancer
          </T>
        </T>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || gigsRefetching || contractsRefetching}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
        <View style={styles.content}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openServiceSearch()}
            style={[styles.searchBox, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          >
            <Ionicons name="search" size={15} color={palette.subText} />
            <View style={styles.searchInput}>
              <T weight="regular" color={searchText ? palette.text : palette.subText} style={styles.searchInputText} numberOfLines={1}>
                {searchText || "Search by service (e.g. UI Design, Reel Editing)"}
              </T>
            </View>
            <View>
              <Ionicons name="arrow-forward-circle" size={20} color={palette.accent} />
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Popular Categories
              </T>
            </View>
            <View style={styles.categoriesGrid}>
              {popularCategories.map((cat) => {
                const active = activeCategoryTitle === cat.title.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.86}
                    onPress={() => {
                      setSearchText(cat.title);
                      openServiceSearch(cat.title);
                    }}
                    style={[
                      styles.categoryCell,
                      {
                        borderColor: active ? palette.accent : palette.borderLight,
                        backgroundColor: active ? palette.accentSoft : palette.surface,
                      },
                    ]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon} size={14} color={cat.color} />
                    </View>
                    <T weight="medium" color={palette.text} style={styles.categoryTitle} numberOfLines={1}>
                      {cat.title}
                    </T>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {hasError ? (
            <SurfaceCard style={styles.errorCard}>
              <T weight="regular" color={palette.accent} style={styles.errorText}>
                Some dashboard data failed to load. Pull to refresh.
              </T>
            </SurfaceCard>
          ) : null}

          <View style={styles.kpiRow}>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                Open Gigs
              </T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                {openGigs}
              </T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
                Active Contracts
              </T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>
                {activeContracts.length}
              </T>
            </SurfaceCard>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                Active Gigs
              </T>
              <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}> 
                <T weight="regular" color={palette.accent} style={styles.linkText}>
                  See all
                </T>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="small" color={palette.accent} />
              </View>
            ) : activeGigs.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="briefcase-outline" size={22} color={palette.subText} />
                <T weight="medium" color={palette.text} style={styles.emptyTitle}>
                  No active gigs yet
                </T>
                <T weight="regular" color={palette.subText} style={styles.emptySub}>
                  Create your first gig to start receiving proposals.
                </T>
              </SurfaceCard>
            ) : (
              <View style={styles.stack}>
                {activeGigs.slice(0, 4).map((gig) => {
                  const tone = statusTone(gig.status);
                  const linkedContract = contractByGigId[gig.id];
                  const hasAcceptedProposal = Boolean(linkedContract);
                  const parsedContent = parseGigDescription(gig.description);
                  const timeline = formatTimeline(
                    parsedContent.timelineValue,
                    parsedContent.timelineUnit,
                  );
                  return (
                    <TouchableOpacity
                      key={gig.id}
                      activeOpacity={0.86}
                      onPress={() => nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
                    >
                      <SurfaceCard style={styles.gigCard}>
                        <View style={styles.gigHeaderRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <T weight="medium" color={palette.text} style={styles.gigTitle} numberOfLines={1}>
                              {gig.title}
                            </T>
                            <T weight="regular" color={palette.subText} style={styles.gigBudget} numberOfLines={1}>
                              {formatMoney(gig.budget_min, gig.budget_max)}
                            </T>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}> 
                            <T weight="medium" color={tone.color} style={styles.statusText}>
                              {tone.label}
                            </T>
                          </View>
                        </View>
                        <View style={[styles.rowDivider, { backgroundColor: palette.borderLight }]} />
                        <View style={styles.gigFooter}>
                          {!hasAcceptedProposal ? (
                            <T weight="regular" color={palette.subText} style={styles.gigMeta}>
                              {gig.proposals_count || 0} proposal{gig.proposals_count === 1 ? "" : "s"}
                              {" · "}
                              {proposalSummary.byGigPending[gig.id] || 0} pending review
                              {" · "}
                              {timeline}
                            </T>
                          ) : null}
                          <View style={styles.gigActions}>
                            {hasAcceptedProposal ? (
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: palette.accentSoft }]}
                                onPress={() =>
                                  nav.push(
                                    `/freelancer-stack/contract-chat-thread?contractId=${linkedContract?.id}&title=${encodeURIComponent(
                                      `${gig.title} • Contract Chat`,
                                    )}`,
                                  )
                                }
                              >
                                <T weight="medium" color={palette.accent} style={styles.actionBtnText}>
                                  Chat
                                </T>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: palette.border }]}
                                onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)}
                              >
                                <T weight="medium" color={palette.text} style={styles.actionBtnText}>
                                  Proposals
                                </T>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: palette.accentSoft }]}
                              onPress={() =>
                                hasAcceptedProposal && linkedContract?.id
                                  ? nav.push(
                                      `/freelancer-stack/contract-details?contractId=${linkedContract.id}`,
                                    )
                                  : nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)
                              }
                            >
                              <T weight="medium" color={palette.accent} style={styles.actionBtnText}>
                                {hasAcceptedProposal ? "View Contract" : "View Details"}
                              </T>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </SurfaceCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 14,
  },
  searchBox: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    justifyContent: "center",
  },
  searchInputText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    padding: 0,
    textAlignVertical: "center",
  },
  filtersCard: {
    padding: 10,
    gap: 8,
  },
  filterRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: 10,
    lineHeight: 13,
  },
  errorCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 14,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  kpiLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  sectionMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
  linkText: {
    fontSize: 12,
    lineHeight: 16,
  },
  centerWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stack: {
    gap: 8,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCell: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  freelancerCard: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  freelancerName: {
    fontSize: 13,
    lineHeight: 17,
  },
  freelancerBio: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  freelancerHint: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
  },
  freelancerRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    lineHeight: 13,
  },
  gigCard: {
    padding: 12,
  },
  gigHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  gigTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  gigBudget: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
  },
  queuePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  queueText: {
    fontSize: 10,
    lineHeight: 13,
  },
  rowDivider: {
    height: 1,
    marginVertical: 10,
  },
  gigMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
  gigFooter: {
    gap: 8,
  },
  gigActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 11,
    lineHeight: 14,
  },
  emptyCard: {
    paddingVertical: 18,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  emptySub: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
  },
});
