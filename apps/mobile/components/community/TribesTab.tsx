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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import TribeCard from "../TribeCard";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Typography, Spacing, Layout } from "../../constants/DesignSystem";
import * as tribeApi from "../../lib/tribeApi";

type TabMode = "my" | "explore";

<<<<<<< frontend-new-p
type TribesTabProps = {
  mode?: TabMode;
  showSegmentedControl?: boolean;
};

export default function TribesTab({
  mode,
  showSegmentedControl = true,
}: TribesTabProps) {
=======
interface TribesTabProps {
  mode?: TabMode;
  showToggle?: boolean;
}

export default function TribesTab({ mode, showToggle = true }: TribesTabProps) {
>>>>>>> main
  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";

<<<<<<< frontend-new-p
  const [internalActiveTab, setInternalActiveTab] = useState<TabMode>("explore");
=======
  // If mode prop is provided, use it; otherwise use internal state
  const [internalActiveTab, setInternalActiveTab] = useState<TabMode>("explore");
  const activeTab = mode || internalActiveTab;

>>>>>>> main
  const [myTribes, setMyTribes] = useState<any[]>([]);
  const [publicTribes, setPublicTribes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    try {
      const [my, pub] = await Promise.all([
        tribeApi.getMyTribes(token),
        tribeApi.getPublicTribes(token),
      ]);
      setMyTribes(Array.isArray(my) ? my : []);
      setPublicTribes(Array.isArray(pub) ? pub : []);
    } catch (e: any) {
      console.error("Failed to load tribes:", e.message);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    loadTribes().finally(() => setLoading(false));
  }, [loadTribes]);

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
    [activeTab, myTribes, token],
  );

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleJoin = async (tribeId: string) => {
    try {
      await tribeApi.joinTribe(token, tribeId);
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
      ? (searchResults ?? myTribes)
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
<<<<<<< frontend-new-p
      {/* Segmented Control */}
      {showSegmentedControl && (
=======
      {/* Segmented Control - Only show if toggle is enabled and no fixed mode is set */}
      {showToggle && !mode && (
>>>>>>> main
        <View
          style={[styles.segmentedControl, { backgroundColor: theme.surface }]}
        >
          {(["explore", "my"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
<<<<<<< frontend-new-p
                activeTab === tab && { backgroundColor: theme.brand.primary },
              ]}
              onPress={() => setActiveTab(tab)}
=======
                internalActiveTab === tab && { backgroundColor: theme.brand.primary },
              ]}
              onPress={() => {
                setInternalActiveTab(tab);
                setSearchQuery("");
                setSearchResults(null);
              }}
>>>>>>> main
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.text.secondary },
<<<<<<< frontend-new-p
                  activeTab === tab && {
=======
                  internalActiveTab === tab && {
>>>>>>> main
                    color: theme.text.inverse,
                    fontWeight: "600",
                  },
                ]}
              >
                {tab === "my" ? "My Tribes" : "Explore"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
<<<<<<< frontend-new-p

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.text.muted}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder={
            activeTab === "my" ? "Search in my tribes..." : "Search tribes to join..."
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
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.text.muted}
            />
          </TouchableOpacity>
        )}
      </View>
=======
>>>>>>> main

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
                activeTab === "explore"
                  ? () => handleJoin(item.id)
                  : undefined
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
  tabText: { ...Typography.presets.body },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.presets.h3,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.presets.bodySmall,
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
    borderRadius: Layout.radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : Spacing.xxs,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...Typography.presets.body,
    paddingVertical: Spacing.xxs,
  },
});

