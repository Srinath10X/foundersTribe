import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, ScrollView, FlatList, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FlowScreen,
  Avatar,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { SearchBar } from "@/components/freelancer/SearchBar";
import { SectionHeader } from "@/components/freelancer/SectionHeader";
import { CategoryCard } from "@/components/freelancer/CategoryCard";
import { SP, RADIUS, SHADOWS, SCREEN_PADDING } from "@/components/freelancer/designTokens";
import { useMyGigs } from "@/hooks/useGig";
import type { Gig } from "@/types/gig";
import { searchAll, SearchAccount } from "@/lib/searchService";


const popularCategories = [
  { id: 1, title: "Graphic Designer", icon: "color-palette" as const, color: "#FF7A00", bg: "rgba(255,122,0,0.12)" },
  { id: 2, title: "Profile Maker", icon: "person" as const, color: "#007AFF", bg: "rgba(0,122,255,0.12)" },
  { id: 3, title: "Reel Editor", icon: "videocam" as const, color: "#FF2D55", bg: "rgba(255,45,85,0.12)" },
  { id: 4, title: "Financial Pro", icon: "briefcase" as const, color: "#34C759", bg: "rgba(52,199,89,0.12)" },
];

export default function FounderDashboardScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchAccount[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: gigsData, isLoading: gigsLoading } = useMyGigs({ limit: 3 });
  const activeGigs = useMemo(
    () => (gigsData?.items ?? []).filter((g) => g.status === "open" || g.status === "in_progress"),
    [gigsData]
  );

  const isSearching = searchText.trim().length > 0;

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchAll(query);
      setSearchResults(results.accounts);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, handleSearch]);

  const renderFreelancer = ({ item }: { item: SearchAccount }) => (
    <TouchableOpacity
      style={[styles.freelancerCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
      onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${item.id}`)}
      activeOpacity={0.8}
    >
      <Avatar source={item.avatar_url ? { uri: item.avatar_url } : undefined} size={50} />
      <View style={styles.freelancerInfo}>
        <T weight="bold" color={palette.text} style={styles.freelancerName}>
          {item.display_name}
        </T>
        <T weight="medium" color={palette.subText} style={styles.freelancerBio} numberOfLines={1}>
          {item.bio}
        </T>
        {item.skills && item.skills.length > 0 && (
          <View style={styles.skillsRow}>
            {item.skills.slice(0, 3).map((skill, index) => (
              <View key={index} style={[styles.skillTag, { backgroundColor: palette.accentSoft }]}>
                <T weight="medium" color={palette.accent} style={styles.skillText}>{skill}</T>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.freelancerRight}>
        {item.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F4C430" />
            <T weight="semiBold" color={palette.text} style={styles.ratingText}>{item.rating}</T>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={palette.subText} />
      </View>
    </TouchableOpacity>
  );

  return (
    <FlowScreen scroll={false}>
      {isSearching ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ─── Search Header ─── */}
          <View style={[styles.header, { paddingTop: insets.top + SP._32 }]}>
            <View>
              <T weight="bold" color={palette.text} style={styles.headerMain}>
                Search Results
              </T>
              <T weight="medium" color={palette.subText} style={styles.searchQuery}>
                "{searchText}"
              </T>
            </View>
          </View>

          {/* ─── Search Bar ─── */}
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholders={[
                "Find your Reels editor...",
                "Find your Graphic designer...",
                "Find your Marketing manager...",
                "Find your Financial manager...",
              ]}
            />
          </View>

          {/* ─── Search Results ─── */}
          {searching ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={palette.accent} />
            </View>
          ) : searchResults.length > 0 ? (
            <View style={styles.resultsSection}>
              <T weight="semiBold" color={palette.subText} style={styles.resultsCount}>
                {searchResults.length} freelancer{searchResults.length !== 1 ? "s" : ""} found
              </T>
              {searchResults.map((freelancer) => (
                <View key={freelancer.id}>
                  {renderFreelancer({ item: freelancer })}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color={palette.subText} />
              <T weight="semiBold" color={palette.text} style={styles.noResultsText}>
                No freelancers found
              </T>
              <T weight="medium" color={palette.subText} style={styles.noResultsSubtext}>
                Try searching for different skills or roles
              </T>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ─── Header ─── */}
          <View style={[styles.header, { paddingTop: insets.top + SP._32 }]}>
            <View>
              <T weight="bold" color={palette.text} style={styles.headerMain}>
                Find Your
              </T>
              <T weight="bold" color={palette.accent} style={styles.headerHighlight}>
                Freelancer
              </T>
            </View>
          </View>

          {/* ─── Search ─── */}
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholders={[
                "Find your Reels editor...",
                "Find your Graphic designer...",
                "Find your Marketing manager...",
                "Find your Financial manager...",
              ]}
            />
          </View>

          {/* ─── Most Popular ─── */}
          <View style={styles.section}>
            <SectionHeader title="Most Popular" />
            <View style={styles.categoriesGrid}>
              {popularCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  title={cat.title}
                  icon={cat.icon}
                  color={cat.color}
                  bgColor={cat.bg}
                  onPress={() => { }}
                />
              ))}
            </View>
          </View>

          {/* ─── Active Gigs ─── */}
          <View style={styles.section}>
            <SectionHeader
              title="Active Gigs"
              actionLabel="See All"
              onAction={() => nav.push("/freelancer-stack/my-gigs")}
            />

            {gigsLoading ? (
              <View style={{ paddingVertical: SP._20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={palette.accent} />
              </View>
            ) : activeGigs.length === 0 ? (
              <View style={{ paddingVertical: SP._20, alignItems: "center" }}>
                <T weight="medium" color={palette.subText} style={{ fontSize: 14 }}>No active gigs yet</T>
              </View>
            ) : (
              activeGigs.map((gig) => (
                <TouchableOpacity
                  key={gig.id}
                  activeOpacity={1}
                  style={styles.gigCardWrapper}
                  onPress={() => nav.push(`/freelancer-stack/gig-details?id=${gig.id}`)}
                >
                  <View
                    style={[
                      styles.gigCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.borderLight,
                      },
                    ]}
                  >
                    <View style={styles.gigTop}>
                      <View style={styles.gigInfo}>
                        <T weight="bold" color={palette.text} style={styles.gigTitle}>
                          {gig.title}
                        </T>
                        <T weight="medium" color={palette.subText} style={styles.gigSub}>
                          ₹{Number(gig.budget_min).toLocaleString()} – ₹{Number(gig.budget_max).toLocaleString()}
                        </T>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              gig.status === "open"
                                ? "rgba(52,199,89,0.12)"
                                : "rgba(42,99,246,0.12)",
                          },
                        ]}
                      >
                        <T
                          weight="bold"
                          color={gig.status === "open" ? "#34C759" : "#2A63F6"}
                          style={styles.statusText}
                        >
                          {gig.status === "open" ? "HIRING" : "IN PROGRESS"}
                        </T>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: palette.borderLight }]} />

                    <View style={styles.gigBottom}>
                      <T weight="semiBold" color={palette.subText} style={styles.gigMetric}>
                        {gig.proposals_count} proposal{gig.proposals_count !== 1 ? "s" : ""}
                      </T>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: SP._64,
  },
  header: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SP._16,
  },
  headerMain: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headerHighlight: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  searchQuery: {
    fontSize: 16,
    marginTop: 4,
  },
  searchWrap: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: SP._24,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: SP._40,
  },
  resultsSection: {
    paddingHorizontal: SCREEN_PADDING,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: SP._16,
  },
  freelancerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SP._16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SP._12,
    ...SHADOWS.card,
  },
  freelancerInfo: {
    flex: 1,
    marginLeft: SP._12,
    marginRight: SP._8,
  },
  freelancerName: {
    fontSize: 16,
  },
  freelancerBio: {
    fontSize: 13,
    marginTop: 2,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: SP._8,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 11,
  },
  freelancerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
  },
  noResults: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: SP._64,
    paddingHorizontal: SCREEN_PADDING,
  },
  noResultsText: {
    fontSize: 18,
    marginTop: SP._16,
  },
  noResultsSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: SP._32,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SP._16,
  },
  gigCardWrapper: {
    marginBottom: SP._12,
  },
  gigCard: {
    padding: SP._16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  gigTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  gigInfo: {
    flex: 1,
    paddingRight: SP._16,
  },
  gigTitle: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  gigSub: {
    fontSize: 13,
    marginTop: SP._8,
    opacity: 0.7,
  },
  statusBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    marginVertical: SP._16,
    borderRadius: 1,
  },
  gigBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 20,
  },
  gigMetric: {
    fontSize: 14,
  },
});
