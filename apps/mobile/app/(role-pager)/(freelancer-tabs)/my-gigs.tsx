import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useAuth } from "@/context/AuthContext";
import { useContracts } from "@/hooks/useGig";
import { formatTimeline, parseGigDescription } from "@/lib/gigContent";
import type { ContractStatus } from "@/types/gig";

type StatusFilter = "all" | "active" | "completed";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

function statusMeta(status?: ContractStatus) {
  switch (status) {
    case "active":
      return { label: "Active", tone: "#34C759", bg: "rgba(52,199,89,0.12)" };
    case "completed":
      return { label: "Completed", tone: "#0A84FF", bg: "rgba(10,132,255,0.12)" };
    case "cancelled":
      return { label: "Cancelled", tone: "#FF3B30", bg: "rgba(255,59,48,0.12)" };
    case "disputed":
      return { label: "Disputed", tone: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
    default:
      return { label: "Unknown", tone: "#8E8E93", bg: "rgba(142,142,147,0.12)" };
  }
}

function formatMoney(min?: number | null, max?: number | null) {
  const lo = Number(min || 0);
  const hi = Number(max || 0);
  if (lo <= 0 && hi <= 0) return "Not set";
  if (lo > 0 && hi > 0) return `INR ${lo.toLocaleString()} - INR ${hi.toLocaleString()}`;
  return `INR ${Math.max(lo, hi).toLocaleString()}`;
}

function formatUpdated(input?: string | null) {
  if (!input) return "Recently updated";
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return "Recently updated";
  return `Updated ${new Date(ts).toLocaleDateString()}`;
}

export default function FreelancerMyGigsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { session } = useAuth();

  const currentUserId = session?.user?.id || "";
  const { data, isLoading, refetch, isRefetching } = useContracts({ limit: 200 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const contracts = useMemo(
    () =>
      (data?.items ?? [])
        .filter((contract) => !currentUserId || contract.freelancer_id === currentUserId)
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime(),
        ),
    [currentUserId, data?.items],
  );

  const summary = useMemo(() => {
    const active = contracts.filter((x) => x.status === "active").length;
    const completed = contracts.filter((x) => x.status === "completed").length;
    return { total: contracts.length, active, completed };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      if (statusFilter !== "all" && contract.status !== statusFilter) return false;
      if (!query) return true;
      const title = (contract.gig?.title || "").toLowerCase();
      const founder = (contract.founder?.full_name || contract.founder?.handle || "").toLowerCase();
      const overview = parseGigDescription(contract.gig?.description || "").projectOverview.toLowerCase();
      return title.includes(query) || founder.includes(query) || overview.includes(query);
    });
  }, [contracts, search, statusFilter]);

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
          onPress={nav.back}
        >
          <Ionicons name="arrow-back" size={16} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.pageTitle}>
            My Gigs
          </T>
          <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
            Gigs you have worked on
          </T>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={palette.accent} />
        }
      >
        <View style={styles.content}>
          <View style={styles.kpiRow}>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Total</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>{summary.total}</T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Active</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>{summary.active}</T>
            </SurfaceCard>
            <SurfaceCard style={styles.kpiCard}>
              <T weight="regular" color={palette.subText} style={styles.kpiLabel}>Completed</T>
              <T weight="medium" color={palette.text} style={styles.kpiValue}>{summary.completed}</T>
            </SurfaceCard>
          </View>

          <View style={[styles.searchWrap, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
            <Ionicons name="search" size={15} color={palette.subText} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by gig title or founder"
              placeholderTextColor={palette.subText}
              style={[styles.searchInput, { color: palette.text }]}
            />
          </View>

          <View style={styles.filtersRow}>
            {statusFilters.map((item) => {
              const active = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.86}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active ? palette.accent : palette.borderLight,
                      backgroundColor: active ? palette.accentSoft : palette.surface,
                    },
                  ]}
                  onPress={() => setStatusFilter(item.key)}
                >
                  <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.filterText}>
                    {item.label}
                  </T>
                </TouchableOpacity>
              );
            })}
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.emptyCard}>
              <T weight="regular" color={palette.subText} style={styles.emptyText}>Loading your gigs...</T>
            </SurfaceCard>
          ) : filteredContracts.length === 0 ? (
            <SurfaceCard style={styles.emptyCard}>
              <T weight="regular" color={palette.subText} style={styles.emptyText}>
                No worked gigs found for the selected filter.
              </T>
            </SurfaceCard>
          ) : (
            <View style={styles.stack}>
              {filteredContracts.map((contract) => {
                const status = statusMeta(contract.status);
                const parsed = parseGigDescription(contract.gig?.description || "");
                return (
                  <TouchableOpacity
                    key={contract.id}
                    activeOpacity={0.86}
                    onPress={() =>
                      nav.push(`/(role-pager)/(freelancer-tabs)/contract-details?id=${encodeURIComponent(contract.id)}`)
                    }
                  >
                    <SurfaceCard style={styles.gigCard}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T weight="medium" color={palette.text} style={styles.gigTitle} numberOfLines={1}>
                            {contract.gig?.title || "Gig"}
                          </T>
                          <T weight="regular" color={palette.subText} style={styles.gigMeta} numberOfLines={1}>
                            {contract.founder?.full_name || contract.founder?.handle || "Founder"}
                          </T>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                          <T weight="medium" color={status.tone} style={styles.statusText}>
                            {status.label}
                          </T>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <T weight="regular" color={palette.subText} style={styles.metaText}>
                          {formatMoney(contract.gig?.budget_min, contract.gig?.budget_max)}
                        </T>
                        <T weight="regular" color={palette.subText} style={styles.metaText}>
                          {formatTimeline(parsed.timelineValue, parsed.timelineUnit)}
                        </T>
                      </View>

                      <T weight="regular" color={palette.subText} style={styles.overview} numberOfLines={2}>
                        {parsed.projectOverview || "No project overview available."}
                      </T>

                      <T weight="regular" color={palette.subText} style={styles.updated}>
                        {formatUpdated(contract.updated_at || contract.created_at)}
                      </T>
                    </SurfaceCard>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 10,
    paddingBottom: 120,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 12,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 10,
    lineHeight: 13,
  },
  emptyCard: {
    padding: 14,
  },
  emptyText: {
    fontSize: 11,
    lineHeight: 15,
  },
  stack: {
    gap: 8,
  },
  gigCard: {
    padding: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gigTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  gigMeta: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 9,
    lineHeight: 12,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 10,
    lineHeight: 13,
  },
  overview: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 15,
  },
  updated: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 13,
  },
});
