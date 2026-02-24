import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { FlowScreen, SurfaceCard, T, useFlowPalette } from "@/components/community/freelancerFlow/shared";

type GigStatus = "open" | "in_progress" | "completed";
type GigLevel = "entry" | "intermediate" | "expert";

type GigItem = {
  id: string;
  title: string;
  company: string;
  budget: string;
  timeline: string;
  status: GigStatus;
  level: GigLevel;
  remote: boolean;
};

const PROPOSAL_STATUS_KEY = "freelancer_proposal_status_v1";

const FILTERS: { label: string; value: "all" | GigStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Active", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

const DUMMY_GIGS: GigItem[] = [
  {
    id: "gig-1",
    title: "React Native UI Polish",
    company: "Nova Labs",
    budget: "₹25,000",
    timeline: "2 weeks",
    status: "open",
    level: "intermediate",
    remote: true,
  },
  {
    id: "gig-2",
    title: "Founder Community App QA",
    company: "TribeBase",
    budget: "₹18,000",
    timeline: "10 days",
    status: "open",
    level: "entry",
    remote: true,
  },
  {
    id: "gig-3",
    title: "Payments Integration (Node + Stripe)",
    company: "Helio Commerce",
    budget: "₹42,000",
    timeline: "3 weeks",
    status: "in_progress",
    level: "expert",
    remote: true,
  },
  {
    id: "gig-4",
    title: "Landing Page Performance Audit",
    company: "Raymond Studio",
    budget: "₹12,000",
    timeline: "1 week",
    status: "completed",
    level: "intermediate",
    remote: false,
  },
];

function statusLabel(status: GigStatus) {
  if (status === "in_progress") return "Active";
  if (status === "completed") return "Completed";
  return "Open";
}

function GigCard({ item, proposalPending }: { item: GigItem; proposalPending: boolean }) {
  const { palette } = useFlowPalette();
  const router = useRouter();

  const tone =
    item.status === "completed" ? palette.subText : item.status === "in_progress" ? "#F59E0B" : palette.accent;
  const toneBg =
    item.status === "completed"
      ? palette.borderLight
      : item.status === "in_progress"
        ? "rgba(245,158,11,0.15)"
        : palette.accentSoft;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={proposalPending}
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
              {item.level}
            </T>
          </View>
        </View>

        <T weight="medium" color={palette.text} style={styles.gigTitle} numberOfLines={1}>
          {item.title}
        </T>
        <T weight="regular" color={palette.subText} style={styles.gigCompany} numberOfLines={1}>
          {item.company}
        </T>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={13} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.metaText}>
              {item.budget}
            </T>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.metaText}>
              {item.timeline}
            </T>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name={item.remote ? "globe-outline" : "business-outline"} size={13} color={palette.subText} />
            <T weight="regular" color={palette.subText} style={styles.metaText}>
              {item.remote ? "Remote" : "On-site"}
            </T>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <T weight="regular" color={palette.subText} style={styles.footerHint}>
            {proposalPending ? "Proposal submitted" : "Updated recently"}
          </T>
          <View
            style={[
              styles.viewBtn,
              { backgroundColor: proposalPending ? palette.borderLight : palette.accent },
            ]}
          >
            <T
              weight="medium"
              color={proposalPending ? palette.subText : "#fff"}
              style={styles.viewBtnText}
            >
              {proposalPending ? "Pending Approval" : "View"}
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
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | GigStatus>("all");
  const [proposalStatusMap, setProposalStatusMap] = useState<Record<string, { status?: string }>>({});

  const loadProposalStatus = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PROPOSAL_STATUS_KEY);
      if (!raw) {
        setProposalStatusMap({});
        return;
      }
      const parsed = JSON.parse(raw);
      setProposalStatusMap(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setProposalStatusMap({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProposalStatus();
    }, [loadProposalStatus]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUMMY_GIGS.filter((gig) => {
      const filterMatch = activeFilter === "all" || gig.status === activeFilter;
      const searchMatch =
        !q ||
        gig.title.toLowerCase().includes(q) ||
        gig.company.toLowerCase().includes(q) ||
        gig.level.toLowerCase().includes(q);
      return filterMatch && searchMatch;
    });
  }, [activeFilter, query]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProposalStatus().finally(() => {
      setTimeout(() => setRefreshing(false), 500);
    });
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
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
                placeholder="Search by title, company, level"
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
                proposalPending={proposalStatusMap[gig.id]?.status === "pending"}
              />
            ))}
          </View>

          {filtered.length === 0 ? (
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
    paddingRight: 6,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  countText: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardsStack: {
    gap: 8,
  },
  gigCard: {
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  gigTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerHint: {
    fontSize: 10,
    lineHeight: 13,
  },
  viewBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewBtnText: {
    fontSize: 11,
    lineHeight: 14,
  },
  emptyCard: {
    marginTop: 8,
    borderRadius: 12,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 17,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
});
