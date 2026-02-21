import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, memo } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { Badge, FlowScreen, FlowTopBar, SurfaceCard, T, useFlowNav, useFlowPalette, PrimaryButton } from "@/components/community/freelancerFlow/shared";
import { gigService, Gig, GigFilters } from "@/lib/gigService";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "Active", value: "in_progress" },
  { label: "Completed", value: "completed" }
] as const;

// Memoize the Gig item to avoid unnecessary re-renders in FlatList
const GigItem = memo(({ gig, palette, nav, router }: { gig: Gig, palette: any, nav: any, router: any }) => {
  const isUrgent = gig.status === "open" && gig.deadline && (new Date(gig.deadline).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;

  // Format the deadline to relative time
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const diff = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Due today";
    return `Due in ${diff}d`;
  };

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.cardHead}>
        {isUrgent ? <Badge label="Urgent" tone="danger" /> : <View />}
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={18} color={palette.subText} />
        </TouchableOpacity>
      </View>

      <T weight="bold" color={palette.text} style={styles.title}>{gig.title}</T>
      <View style={styles.metaRow}>
        <Ionicons name="business-outline" size={14} color={palette.subText} />
        <T weight="medium" color={palette.subText} style={styles.meta}>
          {gig.client_company || gig.client_name || "A Client"}
        </T>
        <T weight="medium" color={palette.subText} style={styles.meta}>• {formatTime(gig.deadline)}</T>
      </View>

      <View style={styles.tags}>
        {/* Placeholder for tags if added to schema, currently using static mock or status */}
        <View style={[styles.tag, { backgroundColor: palette.border }]}>
          <T weight="medium" color={palette.subText} style={styles.tagText}>{gig.status.toUpperCase()}</T>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.bottom}>
        <View>
          <T weight="semiBold" color={palette.subText} style={styles.label}>BUDGET</T>
          <T weight="bold" color={palette.accent} style={styles.price}>₹{gig.budget?.toLocaleString() || "..."}</T>
        </View>
        <TouchableOpacity style={[styles.btn, { backgroundColor: palette.accent }]} onPress={() => router.push(`/talent-stack/gig-details?id=${gig.id}`)}>
          <T weight="bold" color="#fff" style={styles.btnText}>View Details</T>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
});

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
      // Note: searchQuery would typically be passed to backend if supported by gigService

      const data = await gigService.getGigs(filters);

      // Client-side search filtering (fallback if not handled by API)
      const filteredData = searchQuery
        ? data.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : data;

      setGigs(filteredData || []);
    } catch (err: any) {
      console.error("Gigs fetch error:", err);
      setError(err.message || "Failed to load gigs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGigs();
  }, [activeFilter]);

  // Debounce search client-side
  useEffect(() => {
    const handler = setTimeout(() => {
      loadGigs();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    loadGigs(true);
  }, [activeFilter, searchQuery]);

  // Header components layout
  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
        <Ionicons name="search" size={16} color={palette.subText} />
        <TextInput
          placeholder="Search gigs"
          placeholderTextColor={palette.subText}
          style={[styles.input, { color: palette.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={palette.subText} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.value}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? palette.accent : palette.surface,
                    borderColor: isActive ? palette.accent : palette.borderLight
                  }
                ]}
                onPress={() => setActiveFilter(item.value)}
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
          }}
          contentContainerStyle={styles.filterListContainer}
        />
      </View>

      {error && (
        <SurfaceCard style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={32} color="#FF3B30" />
          <T weight="medium" color={palette.text} style={styles.errorText}>{error}</T>
          <PrimaryButton label="Retry" onPress={() => loadGigs()} style={styles.retryBtn} />
        </SurfaceCard>
      )}
    </View>
  );

  const ListEmptyComponent = () => {
    if (loading) return null; // Let the main loading handler show
    if (error) return null; // Error handled in header

    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="briefcase-outline" size={48} color={palette.border} />
        <T weight="bold" color={palette.text} style={styles.emptyTitle}>No Gigs Found</T>
        <T color={palette.subText} style={styles.emptySubtitle}>Try adjusting your filters or search terms.</T>
        {(searchQuery || activeFilter) && (
          <PrimaryButton
            label="Clear Filters"
            onPress={() => {
              setSearchQuery("");
              setActiveFilter("");
            }}
            style={styles.emptyBtn}
          />
        )}
      </SurfaceCard>
    );
  };

  return (
    <FlowScreen>
      <FlowTopBar title="Browse Gigs" showLeft={false} right="options-outline" onRightPress={() => { }} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <T color={palette.subText} style={{ marginTop: 8 }}>Loading gigs...</T>
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <GigItem gig={item} palette={palette} nav={nav} router={router} />}
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
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12 },
  headerContainer: { marginBottom: 12 },
  filterRow: { marginTop: 12, marginBottom: 8 },
  filterListContainer: { gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  search: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  input: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 15 },
  card: { padding: 16, marginBottom: 12, borderRadius: 16 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, marginTop: 12, lineHeight: 24 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  meta: { fontSize: 13 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 11, textTransform: "uppercase" },
  divider: { height: 1, marginVertical: 16 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 11, letterSpacing: 0.8 },
  price: { fontSize: 20, marginTop: 4 },
  btn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { fontSize: 14 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorCard: { padding: 24, alignItems: "center", borderRadius: 12, marginTop: 12 },
  errorText: { marginTop: 12, marginBottom: 16, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  emptyCard: { padding: 40, alignItems: "center", borderRadius: 16, marginTop: 24 },
  emptyTitle: { fontSize: 18, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: "center", marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});
