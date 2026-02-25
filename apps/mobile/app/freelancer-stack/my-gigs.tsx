import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Badge,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { formatTimeline, parseGigDescription } from "@/lib/gigContent";
import { useContracts, useDeleteGig, useMyGigs } from "@/hooks/useGig";
import type { Gig, GigStatus } from "@/types/gig";

type StatusFilter = "all" | GigStatus ;
type SortKey = "recent" | "proposals" | "budget";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "draft", label: "Draft" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "proposals", label: "Most Proposals" },
  { key: "budget", label: "Highest Budget" },
];

function sortGigs(items: Gig[], sortBy: SortKey) {
  const clone = [...items];
  if (sortBy === "proposals") {
    return clone.sort((a, b) => (b.proposals_count || 0) - (a.proposals_count || 0));
  }
  if (sortBy === "budget") {
    return clone.sort((a, b) => Number(b.budget_max || 0) - Number(a.budget_max || 0));
  }
  return clone.sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at).getTime() -
      new Date(a.updated_at || a.created_at).getTime(),
  );
}

function formatDateLabel(input?: string) {
  if (!input) return "Updated recently";
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return "Updated recently";

  const diff = Date.now() - ts;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / dayMs);

  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;

  return `Updated ${new Date(ts).toLocaleDateString()}`;
}

function getStatusTone(status: GigStatus) {
  if (status === "open") return "success" as const;
  if (status === "in_progress") return "progress" as const;
  if (status === "completed") return "success" as const;
  if (status === "draft") return "neutral" as const;
  return "neutral" as const;
}

export default function MyGigsScreen() {
  const { palette } = useFlowPalette();
  const insets = useSafeAreaInsets();
  const nav = useFlowNav();
  const router = useRouter();

  const {
    data: gigsData,
    isLoading: loadingGigs,
    error: gigsError,
    refetch: refetchGigs,
  } = useMyGigs({ limit: 200 });
  const {
    data: contractsData,
    isLoading: loadingContracts,
    refetch: refetchContracts,
  } = useContracts({ limit: 200 });
  const deleteGigMutation = useDeleteGig();

  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [showFilters, setShowFilters] = useState(false);

  const gigs = useMemo(() => gigsData?.items ?? [], [gigsData?.items]);
  const contracts = useMemo(() => contractsData?.items ?? [], [contractsData?.items]);

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
      if (currentTs > existingTs) map[contract.gig_id] = contract;
    });
    return map;
  }, [contracts]);

  const acceptedGigIds = useMemo(() => new Set(Object.keys(contractByGigId)), [contractByGigId]);

  const statusCounts = useMemo(() => {
    return {
      all: gigs.length,
      open: gigs.filter((g) => g.status === "open").length,
      in_progress: gigs.filter((g) => g.status === "in_progress").length,
      completed: gigs.filter((g) => g.status === "completed").length,
      draft: gigs.filter((g) => g.status === "draft").length,
    };
  }, [acceptedGigIds.size, gigs]);

  const activeCount = statusCounts.open + statusCounts.in_progress;
  const completedCount = statusCounts.completed;
  const totalBudget = gigs.reduce((sum, gig) => sum + Number(gig.budget_max || gig.budget || 0), 0);
  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (sortBy !== "recent" ? 1 : 0);

  const filteredGigs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const byStatus = gigs.filter((gig) => {
      if (statusFilter === "all") return true;
      return gig.status === statusFilter;
    });

    const bySearch = byStatus.filter((gig) => {
      if (!query) return true;
      const parsed = parseGigDescription(gig.description);
      return (
        gig.title.toLowerCase().includes(query) ||
        (parsed.projectOverview || "").toLowerCase().includes(query) ||
        (gig.location_text || "").toLowerCase().includes(query) ||
        (gig.gig_tags || []).some((tag) => tag?.tags?.label?.toLowerCase().includes(query))
      );
    });

    return sortGigs(bySearch, sortBy);
  }, [acceptedGigIds, gigs, searchQuery, sortBy, statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchGigs(), refetchContracts()]);
    setRefreshing(false);
  }, [refetchContracts, refetchGigs]);

  const handleDelete = (gigId: string, gigTitle: string) => {
    Alert.alert(
      "Delete Gig",
      `Are you sure you want to delete '${gigTitle}'? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(gigId);
              await deleteGigMutation.mutateAsync(gigId);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete gig.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderKpis = () => (
    <View style={styles.kpiRow}>
      <SurfaceCard style={styles.kpiCard}>
        <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
          Active
        </T>
        <T weight="medium" color={palette.text} style={styles.kpiValue}>
          {activeCount}
        </T>
      </SurfaceCard>
      <SurfaceCard style={styles.kpiCard}>
        <T weight="regular" color={palette.subText} style={styles.kpiLabel}>
          Completed
        </T>
        <T weight="medium" color={palette.text} style={styles.kpiValue}>
          {completedCount}
        </T>
      </SurfaceCard>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsWrap}>
      <View
        style={[
          styles.searchBox,
          { borderColor: palette.borderLight, backgroundColor: palette.surface },
        ]}
      >
        <Ionicons name="search" size={15} color={palette.subText} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by title, overview, location, skills"
          placeholderTextColor={palette.subText}
          style={[styles.searchInput, { color: palette.text }]}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={palette.subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => setShowFilters((prev) => !prev)}
        activeOpacity={0.8}
        style={[
          styles.filterMenuBtn,
          { borderColor: palette.borderLight, backgroundColor: palette.surface },
        ]}
      >
        <View style={styles.filterMenuLeft}>
          <Ionicons name="options-outline" size={14} color={palette.subText} />
          <T weight="medium" color={palette.text} style={styles.filterMenuTitle}>
            Filters
          </T>
          {activeFilterCount > 0 ? (
            <View style={[styles.filterCountBadge, { backgroundColor: palette.accentSoft }]}>
              <T weight="medium" color={palette.accent} style={styles.filterCountText}>
                {activeFilterCount}
              </T>
            </View>
          ) : null}
        </View>
        <Ionicons
          name={showFilters ? "chevron-up" : "chevron-down"}
          size={15}
          color={palette.subText}
        />
      </TouchableOpacity>

      {showFilters ? (
        <SurfaceCard style={styles.filterMenuCard}>
          <View style={styles.filterMenuSection}>
            <T weight="medium" color={palette.subText} style={styles.filterSectionTitle}>
              Status
            </T>
            <View style={styles.filterRow}>
              {statusFilters.map((item) => {
                const active = statusFilter === item.key;
                const count = statusCounts[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setStatusFilter(item.key)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: active ? palette.accent : palette.borderLight,
                        backgroundColor: active ? palette.accentSoft : palette.surface,
                      },
                    ]}
                  >
                    <T
                      weight="regular"
                      color={active ? palette.accent : palette.subText}
                      style={styles.filterText}
                    >
                      {item.label} ({count})
                    </T>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.filterMenuSection}>
            <T weight="medium" color={palette.subText} style={styles.filterSectionTitle}>
              Sort
            </T>
            <View style={styles.sortRow}>
              {sortOptions.map((item) => {
                const active = sortBy === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setSortBy(item.key)}
                    style={[
                      styles.sortChip,
                      {
                        borderWidth: active ? 1 : 0,
                        borderColor: active ? palette.accent : "transparent",
                        backgroundColor: active ? palette.accentSoft : palette.surface,
                      },
                    ]}
                  >
                    <T
                      weight="regular"
                      color={active ? palette.accent : palette.subText}
                      style={styles.sortText}
                    >
                      {item.label}
                    </T>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      <View style={styles.resultRow}>
        <T weight="regular" color={palette.subText} style={styles.resultText}>
          {filteredGigs.length} result{filteredGigs.length === 1 ? "" : "s"}
        </T>
        <T weight="regular" color={palette.subText} style={styles.resultText}>
          Total listed budget: INR {totalBudget.toLocaleString()}
        </T>
      </View>
    </View>
  );

  const renderItem = ({ item: gig }: { item: Gig }) => {
    const isDeleting = deletingId === gig.id;
    const linkedContract = contractByGigId[gig.id];
    const hasAcceptedProposal = Boolean(linkedContract);
    const parsedContent = parseGigDescription(gig.description);

    const timelineLabel = formatTimeline(parsedContent.timelineValue, parsedContent.timelineUnit);
    const budgetValue = Number(gig.budget_max ?? gig.budget ?? 0);
    const budgetDisplay = `INR ${budgetValue.toLocaleString()}`;
    const updatedLabel = formatDateLabel(gig.updated_at || gig.created_at);
    const deliverableCount = parsedContent.deliverables.length;
    const questionCount = parsedContent.screeningQuestions.length;
    const skillLabels = (gig.gig_tags || [])
      .map((entry) => entry.tags?.label)
      .filter((label): label is string => Boolean(label));

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
      >
        <SurfaceCard style={[styles.card, isDeleting ? { opacity: 0.55 } : null]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight="medium" color={palette.text} style={styles.cardTitle} numberOfLines={2}>
                {gig.title}
              </T>
              <T weight="regular" color={palette.subText} style={styles.updatedText}>
                {updatedLabel}
              </T>
            </View>
            <Badge label={gig.status.replace("_", " ").toUpperCase()} tone={getStatusTone(gig.status)} />
          </View>

          {hasAcceptedProposal ? (
            <View style={[styles.lockPill, { backgroundColor: palette.borderLight }]}> 
              <Ionicons name="lock-closed-outline" size={11} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.lockText}>
                Proposal accepted. Editing disabled.
              </T>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="wallet-outline" size={13} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.metaText}>
                {budgetDisplay}
              </T>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={13} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.metaText}>
                {timelineLabel}
              </T>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="chatbox-ellipses-outline" size={13} color={palette.subText} />
              <T weight="regular" color={palette.subText} style={styles.metaText}>
                {hasAcceptedProposal ? "Contract active" : `${gig.proposals_count || 0} proposals`}
              </T>
            </View>
          </View>

          {parsedContent.projectOverview ? (
            <T weight="regular" color={palette.subText} style={styles.overviewText} numberOfLines={2}>
              {parsedContent.projectOverview}
            </T>
          ) : null}

          <View style={styles.detailsRow}>
            <View style={styles.detailPill}>
              <T weight="regular" color={palette.subText} style={styles.detailText}>
                {deliverableCount} deliverable{deliverableCount === 1 ? "" : "s"}
              </T>
            </View>
            {questionCount > 0 ? (
              <View style={styles.detailPill}>
                <T weight="regular" color={palette.subText} style={styles.detailText}>
                  {questionCount} screening question{questionCount === 1 ? "" : "s"}
                </T>
              </View>
            ) : null}
          </View>

          {skillLabels.length > 0 ? (
            <View style={styles.skillsRow}>
              {skillLabels.slice(0, 3).map((skill) => (
                <View key={skill} style={[styles.skillPill, { backgroundColor: palette.borderLight }]}>
                  <T weight="regular" color={palette.subText} style={styles.skillText}>
                    {skill}
                  </T>
                </View>
              ))}
              {skillLabels.length > 3 ? (
                <View style={[styles.skillPill, { backgroundColor: palette.borderLight }]}>
                  <T weight="regular" color={palette.subText} style={styles.skillText}>
                    +{skillLabels.length - 3}
                  </T>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: palette.borderLight }]} />

          <View style={styles.actionsRow}>
            <View style={styles.leftActions}>
              {!hasAcceptedProposal ? (
                <TouchableOpacity
                  onPress={() => router.push(`/freelancer-stack/post-gig?id=${gig.id}`)}
                  style={styles.actionBtn}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pencil" size={14} color={palette.accent} />
                  <T weight="regular" color={palette.accent} style={styles.actionText}>
                    Edit
                  </T>
                </TouchableOpacity>
              ) : null}

              {!hasAcceptedProposal ? (
                <TouchableOpacity
                  onPress={() => handleDelete(gig.id, gig.title)}
                  style={styles.actionBtn}
                  disabled={isDeleting}
                  activeOpacity={0.75}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                  )}
                  <T weight="regular" color="#FF3B30" style={styles.actionText}>
                    Delete
                  </T>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.rightActions}>
              {hasAcceptedProposal ? (
                <TouchableOpacity
                  onPress={() => {
                    if (!linkedContract?.id) return;
                    nav.push(
                      `/freelancer-stack/contract-chat-thread?contractId=${linkedContract.id}&title=${encodeURIComponent(
                        `${gig.title} • Contract Chat`,
                      )}`,
                    );
                  }}
                  style={[styles.primaryMiniBtn, { backgroundColor: palette.accentSoft }]}
                  activeOpacity={0.8}
                  disabled={!linkedContract?.id}
                >
                  <T weight="medium" color={palette.accent} style={styles.proposalsText}>
                    Chat
                  </T>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => nav.push(`/freelancer-stack/gig-proposals?gigId=${gig.id}`)}
                  style={[styles.primaryMiniBtn, { backgroundColor: palette.accentSoft }]}
                  activeOpacity={0.8}
                >
                  <T weight="medium" color={palette.accent} style={styles.proposalsText}>
                    Proposals
                  </T>
                </TouchableOpacity>
              )}

              {hasAcceptedProposal ? (
                <TouchableOpacity
                  onPress={() => {
                    if (!linkedContract?.id) return;
                    nav.push(`/freelancer-stack/contract-details?contractId=${linkedContract.id}`);
                  }}
                  style={[styles.primaryMiniBtn, { backgroundColor: palette.accentSoft }]}
                  activeOpacity={0.8}
                  disabled={!linkedContract?.id}
                >
                  <T weight="medium" color={palette.accent} style={styles.proposalsText}>
                    Contract
                  </T>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
                  style={[styles.primaryMiniBtn, { backgroundColor: palette.border }]}
                  activeOpacity={0.8}
                >
                  <T weight="medium" color={palette.text} style={styles.proposalsText}>
                    View
                  </T>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  if (loadingGigs && !refreshing) {
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
            My Gigs
          </T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
            Track status, manage proposals, and handle active contracts
          </T>
        </View>
        <View style={styles.loadingWrap}>
          <LoadingState rows={5} />
        </View>
      </FlowScreen>
    );
  }

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
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <T weight="medium" color={palette.text} style={styles.pageTitle}>
              My Gigs
            </T>
            <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
              Track status, manage proposals, and handle active contracts
            </T>
          </View>
          <TouchableOpacity
            style={[styles.newGigBtn, { backgroundColor: palette.accentSoft }]}
            onPress={() => nav.push("/freelancer-stack/post-gig")}
          >
            <Ionicons name="add" size={14} color={palette.accent} />
            <T weight="medium" color={palette.accent} style={styles.newGigText}>
              New Gig
            </T>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredGigs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            {renderControls()}
            {gigsError ? (
              <SurfaceCard style={styles.errorCard}>
                <T weight="regular" color={palette.accent} style={styles.errorText}>
                  Failed to load some gig data. Pull to refresh.
                </T>
              </SurfaceCard>
            ) : null}
            {loadingContracts ? (
              <View style={styles.contractLoadingRow}>
                <ActivityIndicator size="small" color={palette.accent} />
                <T weight="regular" color={palette.subText} style={styles.contractLoadingText}>
                  Syncing contract locks...
                </T>
              </View>
            ) : null}
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title={searchQuery || statusFilter !== "all" ? "No matching gigs" : "No gigs yet"}
            subtitle={
              searchQuery || statusFilter !== "all"
                ? "Try a different search or filter."
                : "Post your first gig to start finding top talent."
            }
            ctaLabel="Post a Gig"
            onCtaPress={() => nav.push("/freelancer-stack/post-gig")}
          />
        }
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  newGigBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newGigText: {
    fontSize: 11,
    lineHeight: 14,
  },
  loadingWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 11,
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 23,
  },
  controlsWrap: {
    gap: 8,
    marginBottom: 8,
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
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  filterMenuBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterMenuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterMenuTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontSize: 10,
    lineHeight: 13,
  },
  filterMenuCard: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  filterMenuSection: {
    gap: 7,
  },
  filterSectionTitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 11,
    lineHeight: 14,
  },
  sortRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  sortChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortText: {
    fontSize: 11,
    lineHeight: 14,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  resultText: {
    fontSize: 11,
    lineHeight: 14,
  },
  lockNotice: {
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  lockNoticeHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lockNoticeTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  lockNoticeText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
  errorCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 14,
  },
  contractLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  contractLoadingText: {
    fontSize: 11,
    lineHeight: 14,
  },
  card: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  updatedText: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
  },
  lockPill: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lockText: {
    fontSize: 10,
    lineHeight: 13,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  overviewText: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  detailPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  detailText: {
    fontSize: 10,
    lineHeight: 13,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  skillPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillText: {
    fontSize: 10,
    lineHeight: 13,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    lineHeight: 14,
  },
  primaryMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  proposalsText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
