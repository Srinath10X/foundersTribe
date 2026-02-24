import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useGigs, useMyProposals } from "@/hooks/useGig";
import type { Gig, GigStatus } from "@/types/gig";

const FILTERS: { label: string; value: "all" | GigStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Active", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

function statusLabel(status: GigStatus) {
  if (status === "in_progress" || status === "completed" || status === "cancelled") return "Closed";
  return "Open";
}

function levelFromExperience(level?: string | null) {
  if (!level) return "mid";
  if (level === "junior") return "entry";
  if (level === "senior") return "expert";
  return "intermediate";
}

function timelineFromGig(gig: Gig) {
  if (gig.published_at) {
    const d = new Date(gig.published_at);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return "Flexible";
}

function budgetFromGig(gig: Gig) {
  return `₹${Number(gig.budget_min || 0).toLocaleString()} - ₹${Number(gig.budget_max || 0).toLocaleString()}`;
}

function GigCard({ item, proposalSubmitted }: { item: Gig; proposalSubmitted: boolean }) {
  const { palette } = useFlowPalette();
  const router = useRouter();
  const isClosed = item.status !== "open";

  const tone =
    isClosed ? palette.subText : palette.accent;
  const toneBg =
    isClosed ? palette.borderLight : palette.accentSoft;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push(`/(role-pager)/(freelancer-tabs)/gig-details?id=${item.id}` as any)}
    >
      <SurfaceCard style={styles.gigCard}>
        <View style={styles.gigTop}>
          <View style={[styles.statusPill, { backgroundColor: toneBg }]}>
            <T weight="medium" color={tone} style={styles.statusPillText}>
              {statusLabel(item.status)}
            </T>
          </View>
          <View style={[styles.levelPill, { backgroundColor: palette.borderLight }]}>
            <T weight="regular" color={palette.subText} style={styles.levelText}>
              {levelFromExperience(item.experience_level)}
            </T>
          </View>
        </View>

        <T weight="medium" color={palette.text} style={styles.gigTitle} numberOfLines={1}>
          {item.title}
        </T>
        <T weight="regular" color={palette.subText} style={styles.gigCompany} numberOfLines={1}>
          {item.founder?.full_name || "Founder"}
        </T>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={13} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.metaText}>
              {budgetFromGig(item)}
            </T>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.metaText}>
              {timelineFromGig(item)}
            </T>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name={item.is_remote ? "globe-outline" : "business-outline"} size={13} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.metaText}>
              {item.is_remote ? "Remote" : item.location_text || "On-site"}
            </T>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <T weight="regular" color={palette.subText} style={styles.footerHint}>
            {proposalSubmitted ? "Proposal submitted" : isClosed ? "No longer accepting proposals" : `${item.proposals_count || 0} proposals`}
          </T>
          <View
            style={[
              styles.viewBtn,
              { backgroundColor: proposalSubmitted || isClosed ? palette.borderLight : palette.accent },
            ]}
          >
            <T
              weight="medium"
              color={proposalSubmitted || isClosed ? palette.subText : "#fff"}
              style={styles.viewBtnText}
            >
              {proposalSubmitted ? "Already Submitted" : isClosed ? "Closed" : "View"}
            </T>
          </View>
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

export default function BrowseGigsScreen() {
  const { palette } = useFlowPalette();
  const tabBarHeight = useBottomTabBarHeight();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | GigStatus>("all");

  const { data: gigsData, isLoading, refetch, isRefetching } = useGigs({
    status: activeFilter === "all" ? undefined : activeFilter,
    limit: 50,
  });
  const { data: myProposalsData, refetch: refetchProposals } = useMyProposals({ limit: 100 });

  const proposalSubmittedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    (myProposalsData?.items || []).forEach((p) => {
      if (p.gig_id) {
        map[p.gig_id] = true;
      }
    });
    return map;
  }, [myProposalsData?.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = gigsData?.items || [];
    if (!q) return items;

    return items.filter((gig) => {
      return (
        gig.title.toLowerCase().includes(q) ||
        (gig.description || "").toLowerCase().includes(q) ||
        (gig.founder?.full_name || "").toLowerCase().includes(q) ||
        (gig.experience_level || "").toLowerCase().includes(q)
      );
    });
  }, [gigsData?.items, query]);

  const onRefresh = () => {
    Promise.allSettled([refetch(), refetchProposals()]);
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Browse Gigs
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Discover projects that match your skills
        </T>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        <View style={styles.content}>
          <LinearGradient
            colors={[palette.accentSoft, palette.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.searchWrap, { borderColor: palette.borderLight }]}
          >
            <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
              <Ionicons name="search" size={15} color={palette.subText} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by title, founder, skill"
                placeholderTextColor={palette.subText}
                style={[styles.input, { color: palette.text }]}
              />
              {query.length > 0 ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={15} color={palette.subText} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((item) => {
                const active = activeFilter === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.86}
                    onPress={() => setActiveFilter(item.value)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: active ? palette.accent : palette.surface,
                        borderColor: active ? palette.accent : palette.borderLight,
                      },
                    ]}
                  >
                    <T weight="medium" color={active ? "#fff" : palette.subText} style={styles.filterText}>
                      {item.label}
                    </T>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </LinearGradient>

          <View style={styles.sectionHead}>
            <T weight="medium" color={palette.text} style={styles.sectionTitle}>
              Available Gigs
            </T>
            <T weight="regular" color={palette.subText} style={styles.countText}>
              {filtered.length} results
            </T>
          </View>

          <View style={styles.cardsStack}>
            {filtered.map((gig) => (
              <GigCard
                key={gig.id}
                item={gig}
                proposalSubmitted={!!proposalSubmittedMap[gig.id]}
              />
            ))}
          </View>

          {!isLoading && filtered.length === 0 ? (
            <SurfaceCard style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={30} color={palette.subText} />
              <T weight="medium" color={palette.text} style={styles.emptyTitle}>
                No gigs found
              </T>
              <T weight="regular" color={palette.subText} style={styles.emptySubtitle}>
                Try a different search or filter.
              </T>
            </SurfaceCard>
          ) : null}

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
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  searchWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  search: {
    borderWidth: 1,
    borderRadius: 11,
    height: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  filterRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 11,
    lineHeight: 14,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  countText: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardsStack: {
    gap: 8,
  },
  gigCard: {
    padding: 12,
  },
  gigTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    lineHeight: 13,
  },
  levelPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  levelText: {
    fontSize: 10,
    lineHeight: 13,
    textTransform: "capitalize",
  },
  gigTitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  gigCompany: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  metaRow: {
    marginTop: 9,
    gap: 5,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(127,127,127,0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  footerHint: {
    flex: 1,
    fontSize: 10,
    lineHeight: 13,
  },
  viewBtn: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewBtnText: {
    fontSize: 10,
    lineHeight: 13,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 22,
    alignItems: "center",
    marginTop: 2,
  },
  emptyTitle: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 17,
  },
  emptySubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
});
