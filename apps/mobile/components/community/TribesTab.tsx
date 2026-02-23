import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import TribeCard from "../TribeCard";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Spacing } from "../../constants/DesignSystem";
import * as tribeApi from "../../lib/tribeApi";
import { supabase } from "../../lib/supabase";

type TabMode = "my" | "explore";

type TribesTabProps = {
  mode?: TabMode;
  showSegmentedControl?: boolean;
};

export default function TribesTab({
  mode,
  showSegmentedControl = true,
}: TribesTabProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const userId = session?.user?.id || "";

  const [internalActiveTab, setInternalActiveTab] =
    useState<TabMode>("explore");
  const [myTribes, setMyTribes] = useState<any[]>([]);
  const [publicTribes, setPublicTribes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  const tribesCacheKey = `tribes:tab-cache:v1:${userId || "anon"}`;
  const activeTab = mode ?? internalActiveTab;

  const setActiveTab = (tab: TabMode) => {
    if (mode === undefined) {
      setInternalActiveTab(tab);
    }
    setSearchQuery("");
    setSearchResults(null);
  };

  /* ── Fetch data ────────────────────────────────────────────── */

  const loadTribes = useCallback(async () => {
    if (!token) return;
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const [my, pub] = await Promise.all([
        tribeApi.getMyTribes(token),
        tribeApi.getPublicTribes(token),
      ]);
      setMyTribes(Array.isArray(my) ? my : []);
      setPublicTribes(Array.isArray(pub) ? pub : []);
    } catch (e: any) {
      console.error("Failed to load tribes:", e.message);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(tribesCacheKey);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        if (cancelled) return;
        if (Array.isArray(parsed?.myTribes)) setMyTribes(parsed.myTribes);
        if (Array.isArray(parsed?.publicTribes)) setPublicTribes(parsed.publicTribes);
        setLoading(false);
      } catch {
        // ignore cache failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tribesCacheKey, userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          tribesCacheKey,
          JSON.stringify({
            myTribes,
            publicTribes,
            updatedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // ignore cache failures
      }
    })();
  }, [myTribes, publicTribes, tribesCacheKey, userId]);

  useEffect(() => {
    setLoading(true);
    loadTribes().finally(() => setLoading(false));
  }, [loadTribes]);

  // Keep tabs synced while user navigates around the app.
  useFocusEffect(
    useCallback(() => {
      loadTribes();
    }, [loadTribes]),
  );

  // Near-realtime refresh so my/explore stays current.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      loadTribes();
    }, 10000);
    return () => clearInterval(id);
  }, [loadTribes, token]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`tribes-realtime:${userId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tribe_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadTribes();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tribes",
        },
        () => {
          loadTribes();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTribes, userId]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    setSearchQuery("");
    setSearchResults(null);
    setSearching(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "my") return;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const localMatches = myTribes.filter((tribe) => {
      const name = String(tribe?.name ?? "").toLowerCase();
      const description = String(tribe?.description ?? "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
    setSearchResults(localMatches);
  }, [activeTab, myTribes, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchQuery("");
    setSearchResults(null);
    await loadTribes();
    setRefreshing(false);
  };

  /* ── Search ───────────────────────────────────────────────── */

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);

      if (!text.trim()) {
        setSearchResults(null);
        setSearching(false);
        return;
      }

      if (activeTab === "my") {
        setSearching(false);
        const normalized = text.trim().toLowerCase();
        const localMatches = myTribes.filter((tribe) => {
          const name = String(tribe?.name ?? "").toLowerCase();
          const description = String(tribe?.description ?? "").toLowerCase();
          return name.includes(normalized) || description.includes(normalized);
        });
        setSearchResults(localMatches);
        return;
      }

      setSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await tribeApi.searchTribes(token, text.trim());
          const filtered = Array.isArray(results)
            ? results.filter((t) => !myTribes.some((mine) => mine.id === t.id))
            : [];
          setSearchResults(filtered);
        } catch (e: any) {
          console.error("Search failed:", e.message);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
    },
    [activeTab, myTribes, token]
  );

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleJoin = async (tribeId: string) => {
    try {
      const joined = publicTribes.find((t) => t.id === tribeId);
      await tribeApi.joinTribe(token, tribeId);
      if (joined) {
        setMyTribes((prev) =>
          prev.some((t) => t.id === tribeId) ? prev : [joined, ...prev],
        );
        setPublicTribes((prev) => prev.filter((t) => t.id !== tribeId));
        setSearchResults((prev) =>
          prev === null ? prev : prev.filter((t) => t.id !== tribeId),
        );
      }
      await loadTribes();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  useEffect(() => {
    if (activeTab !== "explore") return;
    const myIds = new Set(myTribes.map((t) => t.id));
    setSearchResults((prev) => {
      if (prev === null) return prev;
      const filtered = prev.filter((tribe) => !myIds.has(tribe.id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [activeTab, myTribes]);

  /* ── Derive data ───────────────────────────────────────────── */

  const myTribeIds = new Set(myTribes.map((t) => t.id));
  const exploreTribes = publicTribes.filter((t) => !myTribeIds.has(t.id));
  const hasSearch = searchQuery.trim().length > 0;
  const displayed =
    activeTab === "my"
      ? searchResults ?? myTribes
      : searchResults !== null
      ? searchResults
      : exploreTribes;

  /* ── Empty state ───────────────────────────────────────────── */

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={
          hasSearch
            ? "search-outline"
            : activeTab === "my"
            ? "shield-outline"
            : "compass-outline"
        }
        size={52}
        color={theme.text.muted}
      />
      <Text style={[styles.emptyTitle, { color: theme.text.secondary }]}>
        {hasSearch
          ? "No matches found"
          : activeTab === "my"
          ? "No tribes yet"
          : "Nothing to explore"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        {hasSearch
          ? "Try a different keyword."
          : activeTab === "my"
          ? "Join a tribe from Explore or create your own."
          : "All public tribes have been joined."}
      </Text>
    </View>
  );

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      {showSegmentedControl && (
        <View
          style={[styles.segmentedControl, { backgroundColor: theme.surface }]}
        >
          {(["explore", "my"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && { backgroundColor: theme.brand.primary },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.text.secondary },
                  activeTab === tab && {
                    color: theme.text.inverse,
                    ...styles.tabTextActive,
                  },
                ]}
              >
                {tab === "my" ? "My Tribes" : "Explore"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          {activeTab === "explore" ? "Discover Groups" : "My Tribes"}
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.borderLight },
        ]}
      >
        <Ionicons name="search-outline" size={20} color={theme.text.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder={
            activeTab === "my"
              ? "Search your groups..."
              : "Search tribes..."
          }
          placeholderTextColor={theme.text.muted}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching && (
          <ActivityIndicator size="small" color={theme.brand.primary} />
        )}
        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              setSearchResults(null);
            }}
          >
            <Ionicons name="close-circle" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          renderItem={({ item }) => (
            <TribeCard
              tribe={item}
              onPress={() => router.push(`/tribe/${item.id}` as any)}
              variant={activeTab === "explore" ? "explore" : "default"}
              onJoin={
                activeTab === "explore" ? () => handleJoin(item.id) : undefined
              }
            />
          )}
          keyExtractor={(item, index) =>
            item?.id ? String(item.id) : `tribe-${index}`
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 30, // Much more rounded pill shape
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.xxs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26, // Rounded inner active button
  },
  sectionHeader: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
    fontFamily: "Poppins_500Medium",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 130,
    paddingTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
    fontFamily: "Poppins_500Medium",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : Spacing.xs,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: "Poppins_400Regular",
    paddingVertical: Spacing.xxs,
  },
  tabText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontFamily: "Poppins_400Regular",
  },
  tabTextActive: {
    fontFamily: "Poppins_600SemiBold",
  },
});
