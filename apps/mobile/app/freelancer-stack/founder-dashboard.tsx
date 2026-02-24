import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { useMyGigs } from "@/hooks/useGig";
import { SearchAccount, searchAll } from "@/lib/searchService";

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

  const { data: gigsData, isLoading: gigsLoading } = useMyGigs({ limit: 4 });
  const activeGigs = useMemo(
    () => (gigsData?.items ?? []).filter((g) => g.status === "open" || g.status === "in_progress"),
    [gigsData],
  );

  const isSearching = searchText.trim().length > 0;

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchAll(query);
      setSearchResults(results.accounts ?? []);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchText);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchText, handleSearch]);

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}>
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Freelancer Dashboard
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Find, shortlist, and manage talent
        </T>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={[styles.searchBox, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}>
            <Ionicons name="search" size={15} color={palette.subText} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search freelancers by name, bio, skills"
              placeholderTextColor={palette.subText}
              style={[styles.searchInput, { color: palette.text }]}
            />
            {searchText.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={16} color={palette.subText} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isSearching ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                  Search Results
                </T>
                {!searching ? (
                  <T weight="regular" color={palette.subText} style={styles.sectionMeta}>
                    {searchResults.length} found
                  </T>
                ) : null}
              </View>

              {searching ? (
                <View style={styles.centerWrap}>
                  <ActivityIndicator size="small" color={palette.accent} />
                </View>
              ) : searchResults.length === 0 ? (
                <SurfaceCard style={styles.emptyCard}>
                  <Ionicons name="search" size={22} color={palette.subText} />
                  <T weight="medium" color={palette.text} style={styles.emptyTitle}>
                    No freelancers found
                  </T>
                  <T weight="regular" color={palette.subText} style={styles.emptySub}>
                    Try different keywords or broader roles.
                  </T>
                </SurfaceCard>
              ) : (
                <View style={styles.stack}>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.86}
                      onPress={() => nav.push(`/freelancer-stack/freelancer-profile?id=${item.id}`)}
                    >
                      <SurfaceCard style={styles.freelancerCard}>
                        <Avatar source={item.avatar_url ? { uri: item.avatar_url } : undefined} size={42} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T weight="medium" color={palette.text} style={styles.freelancerName} numberOfLines={1}>
                            {item.display_name}
                          </T>
                          <T weight="regular" color={palette.subText} style={styles.freelancerBio} numberOfLines={1}>
                            {item.bio || "Freelancer"}
                          </T>
                        </View>
                        <View style={styles.freelancerRight}>
                          {item.rating ? (
                            <View style={styles.ratingRow}>
                              <Ionicons name="star" size={12} color="#F4C430" />
                              <T weight="regular" color={palette.subText} style={styles.ratingText}>
                                {item.rating}
                              </T>
                            </View>
                          ) : null}
                          <Ionicons name="chevron-forward" size={15} color={palette.subText} />
                        </View>
                      </SurfaceCard>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <T weight="medium" color={palette.text} style={styles.sectionTitle}>
                    Popular Categories
                  </T>
                </View>
                <View style={styles.categoriesGrid}>
                  {popularCategories.map((cat) => (
                    <TouchableOpacity key={cat.id} activeOpacity={0.86} style={[styles.categoryCell, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}> 
                      <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}> 
                        <Ionicons name={cat.icon} size={14} color={cat.color} />
                      </View>
                      <T weight="medium" color={palette.text} style={styles.categoryTitle} numberOfLines={1}>
                        {cat.title}
                      </T>
                    </TouchableOpacity>
                  ))}
                </View>
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

                {gigsLoading ? (
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
                    {activeGigs.map((gig) => {
                      const hiring = gig.status === "open";
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
                                  ₹{Number(gig.budget_min).toLocaleString()} - ₹{Number(gig.budget_max).toLocaleString()}
                                </T>
                              </View>
                              <View style={[styles.statusPill, { backgroundColor: hiring ? "rgba(52,199,89,0.12)" : "rgba(42,99,246,0.12)" }]}> 
                                <T weight="medium" color={hiring ? "#34C759" : "#2A63F6"} style={styles.statusText}>
                                  {hiring ? "Hiring" : "In progress"}
                                </T>
                              </View>
                            </View>
                            <View style={[styles.rowDivider, { backgroundColor: palette.borderLight }]} />
                            <T weight="regular" color={palette.subText} style={styles.gigMeta}>
                              {gig.proposals_count} proposal{gig.proposals_count !== 1 ? "s" : ""}
                            </T>
                          </SurfaceCard>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
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
    fontSize: 20,
    lineHeight: 26,
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
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
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
  rowDivider: {
    height: 1,
    marginVertical: 10,
  },
  gigMeta: {
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
