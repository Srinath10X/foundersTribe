import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, memo } from "react";
import { StyleSheet, TouchableOpacity, View, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import {
  FlowScreen,
  FlowTopBar,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { SearchBar } from "@/components/freelancer/SearchBar";
import { GigCard } from "@/components/freelancer/GigCard";
import { EmptyState } from "@/components/freelancer/EmptyState";
import { LoadingState } from "@/components/freelancer/LoadingState";
import { SP, RADIUS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { gigService, Gig, GigFilters } from "@/lib/gigService";

// ─── Temporary Dummy Data ──────────────────────────────────────
const DUMMY_BROWSE_GIGS: Gig[] = [
  {
    id: "bg-1",
    title: "Full-Stack Web App for Logistics Platform",
    description: "Next.js + Node.js logistics tracking platform.",
    budget: 120000,
    status: "open",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "SwiftRoute Logistics",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bg-2",
    title: "Mobile App UI Design — Health & Wellness",
    description: "Figma designs for a meditation and wellness app.",
    budget: 35000,
    status: "open",
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "MindSync Wellness",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bg-3",
    title: "DevOps & CI/CD Pipeline Setup",
    description: "Docker, GitHub Actions, AWS ECS deployment pipeline.",
    budget: 55000,
    status: "in_progress",
    client_company: "CloudNine Tech",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bg-4",
    title: "Data Visualization Dashboard — D3.js",
    description: "Interactive charts and graphs for financial data.",
    budget: 40000,
    status: "open",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "FinSight Analytics",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bg-5",
    title: "E-Commerce Store — Shopify Custom Theme",
    description: "Custom Shopify theme with Liquid templating.",
    budget: 28000,
    status: "completed",
    client_company: "CraftBrew Co.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bg-6",
    title: "AI Chatbot Integration — OpenAI + WhatsApp",
    description: "Customer support chatbot with natural language processing.",
    budget: 75000,
    status: "open",
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    client_company: "TalkBot AI",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "Active", value: "in_progress" },
  { label: "Completed", value: "completed" },
] as const;

export default function BrowseGigsScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const router = useRouter();

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<typeof STATUS_FILTERS[number]["value"]>("");

  const loadGigs = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const filters: GigFilters = {};
      if (activeFilter) filters.status = activeFilter as any;

      const data = await gigService.getGigs(filters);

      const raw = data && data.length > 0 ? data : DUMMY_BROWSE_GIGS;
      const filteredData = searchQuery
        ? raw.filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : activeFilter
          ? raw.filter((g) => g.status === activeFilter)
          : raw;

      setGigs(filteredData || []);
    } catch (err: any) {
      console.error("Gigs fetch error (using dummy):", err);
      const raw = DUMMY_BROWSE_GIGS;
      const filteredData = searchQuery
        ? raw.filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : activeFilter
          ? raw.filter((g) => g.status === activeFilter)
          : raw;
      setGigs(filteredData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGigs();
  }, [activeFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadGigs();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    loadGigs(true);
  }, [activeFilter, searchQuery]);

  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholders={[
          "Search for gigs...",
          "Find React Native projects...",
          "Discover UI/UX work...",
          "Explore backend roles...",
        ]}
      />

      {/* Filters */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((item) => {
          const isActive = activeFilter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? palette.accent : 'transparent',
                  borderColor: isActive ? palette.accent : palette.borderLight,
                },
              ]}
              onPress={() => setActiveFilter(item.value)}
              activeOpacity={0.8}
            >
              <T
                weight={isActive ? "bold" : "medium"}
                color={isActive ? "#fff" : palette.subText}
                style={styles.filterText}
              >
                {item.label}
              </T>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error inline */}
      {error && (
        <EmptyState
          icon="alert-circle-outline"
          title="Connection Error"
          subtitle={error}
          ctaLabel="Retry"
          onCtaPress={() => loadGigs()}
        />
      )}
    </View>
  );

  const ListEmptyComponent = () => {
    if (loading || error) return null;
    return (
      <EmptyState
        icon="briefcase-outline"
        title="No Gigs Found"
        subtitle="Try adjusting your filters or search terms to find more opportunities."
        ctaLabel={searchQuery || activeFilter ? "Clear Filters" : undefined}
        onCtaPress={
          searchQuery || activeFilter
            ? () => {
              setSearchQuery("");
              setActiveFilter("");
            }
            : undefined
        }
      />
    );
  };

  const getStatusTone = (status: string) => {
    if (status === "open") return "progress" as const;
    if (status === "completed") return "success" as const;
    if (status === "in_progress") return "progress" as const;
    return "neutral" as const;
  };

  return (
    <FlowScreen scroll={false}>
      <FlowTopBar title="Browse Gigs" showLeft={false} right="options-outline" onRightPress={() => { }} />

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <View style={styles.headerContainer}>
            <SearchBar value="" onChangeText={() => { }} />
            <View style={styles.filterRow}>
              {STATUS_FILTERS.map((item) => (
                <View
                  key={item.value}
                  style={[styles.filterPill, { borderColor: palette.borderLight }]}
                />
              ))}
            </View>
          </View>
          <LoadingState rows={3} />
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GigCard
              title={item.title}
              company={item.client_company || item.client_name || "A Client"}
              status={item.status.toUpperCase()}
              statusTone={getStatusTone(item.status)}
              budget={item.budget}
              deadline={item.deadline}
              isUrgent={
                item.status === "open" &&
                !!item.deadline &&
                new Date(item.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
              }
              tags={[item.status.toUpperCase()]}
              onPress={() => router.push(`/talent-stack/gig-details?id=${item.id}`)}
              onBookmark={() => { }}
              style={styles.gigCardSpacing}
            />
          )}
          contentContainerStyle={styles.listContent}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={ListEmptyComponent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
          }
        />
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SP._32,
    paddingTop: SP._12,
  },
  loadingWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SP._12,
  },
  headerContainer: {
    marginBottom: SP._16,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP._8,
    marginTop: SP._16,
  },
  filterPill: {
    paddingHorizontal: SP._16,
    paddingVertical: SP._8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
  },
  gigCardSpacing: {
    marginBottom: SP._12,
  },
});
