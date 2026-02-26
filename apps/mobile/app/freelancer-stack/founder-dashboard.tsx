import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

/* ─── Spacing & Radius constants (8-pt grid) ──────────────────── */
const SP = { _4: 4, _6: 6, _8: 8, _10: 10, _12: 12, _14: 14, _16: 16, _20: 20, _24: 24 } as const;
const R = 14; // unified border-radius for all cards/inputs

type ProposalSummary = {
  total: number;
  pending: number;
  shortlisted: number;
  byGigPending: Record<string, number>;
};

const SEARCH_PLACEHOLDERS = [
  "Find your freelancer…",
  "Find your video editor…",
  "Find your graphic designer…",
  "Find your web developer…",
  "Find your content writer…",
  "Find your social media manager…",
];

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
    return { label: "Hiring", color: "#34C759", bg: "rgba(52,199,89,0.14)" };
  }
  if (status === "in_progress") {
    return {
      label: "In progress",
      color: "#2A63F6",
      bg: "rgba(42,99,246,0.14)",
    };
  }
  if (status === "completed") {
    return { label: "Completed", color: "#5FA876", bg: "rgba(95,168,118,0.14)" };
  }
  return { label: "Draft", color: "#8E8E93", bg: "rgba(142,142,147,0.10)" };
}

export default function FounderDashboardScreen() {
  const { palette, isDark } = useFlowPalette();
  const nav = useFlowNav();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const currentUserId = session?.user?.id || "";

  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Rotating placeholder animation
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const placeholderFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(placeholderFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setPlaceholderIdx((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        Animated.timing(placeholderFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);
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
            paddingTop: insets.top + 14,
            backgroundColor: palette.bg,
          },
        ]}
      >
        <T weight="semiBold" color={palette.text} style={styles.pageTitle}>
          Find your{" "}
          <T weight="semiBold" color="#FF2D55" style={styles.pageTitle}>
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
            <Ionicons name="search" size={17} color={palette.subText} />
            <View style={styles.searchInput}>
              {searchText ? (
                <T weight="regular" color={palette.text} style={styles.searchInputText} numberOfLines={1}>
                  {searchText}
                </T>
              ) : (
                <Animated.View style={{ opacity: placeholderFade }}>
                  <T weight="regular" color={palette.subText} style={styles.searchInputText} numberOfLines={1}>
                    {SEARCH_PLACEHOLDERS[placeholderIdx]}
                  </T>
                </Animated.View>
              )}
            </View>
            <View style={styles.searchArrow}>
              <Ionicons name="arrow-forward" size={14} color={palette.subText} />
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <T weight="semiBold" color={palette.text} style={styles.sectionTitle}>
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
                        borderColor: active
                          ? isDark ? "rgba(255,45,85,0.35)" : "rgba(255,45,85,0.25)"
                          : palette.borderLight,
                        backgroundColor: active
                          ? isDark ? "rgba(255,45,85,0.10)" : "rgba(255,45,85,0.06)"
                          : palette.surface,
                      },
                    ]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon} size={15} color={cat.color} />
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
              <View style={styles.kpiHeader}>
                <T weight="medium" color={palette.subText} style={styles.kpiLabel}>
                  Open Gigs
                </T>
                <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? "rgba(52,199,89,0.16)" : "rgba(52,199,89,0.10)" }]}>
                  <Ionicons name="briefcase-outline" size={12} color="#34C759" />
                </View>
              </View>
              <T weight="semiBold" color={palette.text} style={styles.kpiValue}>
                {openGigs}
              </T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <T weight="medium" color={palette.subText} style={styles.kpiLabel}>
                  Active Contracts
                </T>
                <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? "rgba(42,99,246,0.16)" : "rgba(42,99,246,0.10)" }]}>
                  <Ionicons name="document-text-outline" size={12} color="#2A63F6" />
                </View>
              </View>
              <T weight="semiBold" color={palette.text} style={styles.kpiValue}>
                {activeContracts.length}
              </T>
            </SurfaceCard>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <T weight="semiBold" color={palette.text} style={styles.sectionTitle}>
                Active Gigs
              </T>
              <TouchableOpacity onPress={() => nav.push("/freelancer-stack/my-gigs")}> 
                <T weight="medium" color={palette.accent} style={styles.linkText}>
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
                    <SurfaceCard key={gig.id} style={styles.gigCard}>
                      {/* ── Top: status pill ── */}
                      <View style={[styles.statusPill, { backgroundColor: tone.bg, alignSelf: "flex-start" }]}>
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: tone.color }} />
                        <T weight="medium" color={tone.color} style={styles.statusText}>
                          {tone.label}
                        </T>
                      </View>

                      {/* ── Title + budget ── */}
                      <T weight="semiBold" color={palette.text} style={styles.gigTitle} numberOfLines={2}>
                        {gig.title}
                      </T>
                      <T weight="regular" color={palette.subText} style={styles.gigBudget} numberOfLines={1}>
                        {formatMoney(gig.budget_min, gig.budget_max)}
                      </T>

                      {/* ── Meta chips ── */}
                      {!hasAcceptedProposal ? (
                        <View style={styles.metaRow}>
                          <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                            <Ionicons name="document-text-outline" size={11} color={palette.subText} />
                            <T weight="regular" color={palette.subText} style={styles.metaChipText}>
                              {gig.proposals_count || 0} proposal{gig.proposals_count === 1 ? "" : "s"}
                            </T>
                          </View>
                          {(proposalSummary.byGigPending[gig.id] || 0) > 0 ? (
                            <View style={[styles.metaChip, { backgroundColor: "rgba(255,149,0,0.10)" }]}>
                              <Ionicons name="time-outline" size={11} color="#FF9500" />
                              <T weight="regular" color="#FF9500" style={styles.metaChipText}>
                                {proposalSummary.byGigPending[gig.id]} pending
                              </T>
                            </View>
                          ) : null}
                          {timeline ? (
                            <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                              <Ionicons name="calendar-outline" size={11} color={palette.subText} />
                              <T weight="regular" color={palette.subText} style={styles.metaChipText}>
                                {timeline}
                              </T>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {/* ── Bottom: actions left + View Gig right ── */}
                      <View style={[styles.rowDivider, { backgroundColor: palette.borderLight }]} />
                      <View style={styles.gigBottomRow}>
                        {hasAcceptedProposal ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: palette.accentSoft }]}
                            activeOpacity={0.8}
                            onPress={() =>
                              nav.push(
                                `/freelancer-stack/contract-chat-thread?contractId=${linkedContract?.id}&title=${encodeURIComponent(
                                  `${gig.title} • Contract Chat`,
                                )}`,
                              )
                            }
                          >
                            <Ionicons name="chatbubble-outline" size={12} color={palette.accent} />
                            <T weight="medium" color={palette.accent} style={styles.actionBtnText}>
                              Chat
                            </T>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
                            activeOpacity={0.8}
                            onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)}
                          >
                            <Ionicons name="people-outline" size={12} color={palette.text} />
                            <T weight="medium" color={palette.text} style={styles.actionBtnText}>
                              Proposals
                            </T>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.viewGigBtn}
                          activeOpacity={0.7}
                          onPress={() =>
                            hasAcceptedProposal && linkedContract?.id
                              ? nav.push(`/freelancer-stack/contract-details?contractId=${linkedContract.id}`)
                              : nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)
                          }
                        >
                          <T weight="medium" color={palette.accent} style={styles.viewGigText}>
                            {hasAcceptedProposal ? "View Contract" : "View Gig"}
                          </T>
                          <Ionicons name="arrow-forward" size={13} color={palette.accent} />
                        </TouchableOpacity>
                      </View>
                    </SurfaceCard>
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
  /* ── Header ─────────────────────────────────────────────────── */
  header: {
    paddingHorizontal: SP._20,
    paddingBottom: SP._10,
  },
  pageTitle: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.4,
  },

  /* ── Scroll / Content ───────────────────────────────────────── */
  scrollContent: {
    paddingBottom: 110,
  },
  content: {
    paddingHorizontal: SP._20,
    paddingTop: SP._12,
    gap: SP._20,
  },

  /* ── Search ─────────────────────────────────────────────────── */
  searchBox: {
    height: 48,
    borderWidth: 1,
    borderRadius: R,
    paddingHorizontal: SP._14,
    flexDirection: "row",
    alignItems: "center",
    gap: SP._10,
  },
  searchInput: {
    flex: 1,
    justifyContent: "center",
  },
  searchInputText: {
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
    textAlignVertical: "center",
  },
  searchArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.08)",
  },

  /* ── Sections ───────────────────────────────────────────────── */
  section: {
    gap: SP._10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  linkText: {
    fontSize: 12,
    lineHeight: 16,
  },

  /* ── Error ──────────────────────────────────────────────────── */
  errorCard: {
    paddingVertical: SP._10,
    paddingHorizontal: SP._12,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
  },

  /* ── Categories ─────────────────────────────────────────────── */
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP._8,
  },
  categoryCell: {
    width: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: R,
    paddingVertical: SP._12,
    paddingHorizontal: SP._12,
    flexDirection: "row",
    alignItems: "center",
    gap: SP._10,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },

  /* ── KPI Stats ──────────────────────────────────────────────── */
  kpiRow: {
    flexDirection: "row",
    gap: SP._10,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: SP._14,
    paddingHorizontal: SP._14,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  kpiIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    marginTop: SP._8,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  /* ── Loading / Empty ────────────────────────────────────────── */
  centerWrap: {
    paddingVertical: SP._24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    paddingVertical: SP._24,
    alignItems: "center",
    gap: SP._6,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptySub: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: SP._16,
  },

  /* ── Gig Cards ──────────────────────────────────────────────── */
  stack: {
    gap: SP._10,
  },
  gigCard: {
    padding: SP._14,
  },
  gigTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.15,
  },
  gigBudget: {
    marginTop: SP._4,
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP._6,
    marginTop: SP._10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SP._8,
    paddingVertical: SP._4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 10,
    lineHeight: 13,
  },
  gigBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewGigBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewGigText: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: SP._10,
    paddingVertical: SP._4,
    flexDirection: "row",
    alignItems: "center",
    gap: SP._4,
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SP._12,
  },
  actionBtn: {
    paddingVertical: SP._8,
    paddingHorizontal: SP._12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
