import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import TribeCard from "@/components/TribeCard";
import CreateTribeModal from "@/components/CreateTribeModal";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";
import { supabase } from "@/lib/supabase";

type TabMode = "my" | "explore";

export default function TribesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const userId = session?.user?.id || "";

  const [activeTab, setActiveTab] = useState<TabMode>("my");
  const [myTribes, setMyTribes] = useState<any[]>([]);
  const [publicTribes, setPublicTribes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  const tribesCacheKey = `tribes:screen-cache:v1:${userId || "anon"}`;

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

  useFocusEffect(
    useCallback(() => {
      loadTribes();
    }, [loadTribes]),
  );

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
      .channel(`tribes-screen-realtime:${userId}:${Date.now()}`)
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

      setSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await tribeApi.searchTribes(token, text.trim());
          setSearchResults(Array.isArray(results) ? results : []);
        } catch (e: any) {
          console.error("Search failed:", e.message);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 500);
    },
    [token],
  );

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleCreate = async (
    name: string,
    description: string,
    isPublic: boolean,
    avatarUrl?: string,
    coverUrl?: string,
  ) => {
    try {
      await tribeApi.createTribe(token, {
        name,
        description: description || undefined,
        avatar_url: avatarUrl || undefined,
        cover_url: coverUrl || undefined,
        is_public: isPublic,
      });
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      const coverFieldIssue =
        msg.includes("cover_url") || msg.includes("column") || msg.includes("schema");
      if (!coverFieldIssue) throw e;
      await tribeApi.createTribe(token, {
        name,
        description: description || undefined,
        avatar_url: avatarUrl || undefined,
        is_public: isPublic,
      });
    }
    await loadTribes();
  };

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

  /* ── Derive data ───────────────────────────────────────────── */

  const myTribeIds = new Set(myTribes.map((t) => t.id));
  const exploreTribes = publicTribes.filter((t) => !myTribeIds.has(t.id));
  const filteredExploreSearch =
    searchResults?.filter((t) => !myTribeIds.has(t.id)) ?? null;
  const displayed =
    activeTab === "my"
      ? myTribes
      : filteredExploreSearch !== null
        ? filteredExploreSearch
        : exploreTribes;

  /* ── Empty state ───────────────────────────────────────────── */

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === "my" ? "shield-outline" : "compass-outline"}
        size={52}
        color={theme.text.muted}
      />
      <Text style={[styles.emptyTitle, { color: theme.text.secondary }]}>
        {activeTab === "my"
          ? "No tribes yet"
          : "Nothing to explore"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.text.tertiary }]}>
        {activeTab === "my"
          ? "Create a tribe or join one from Explore"
          : "All public tribes have been joined!"}
      </Text>
    </View>
  );

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Tribes
        </Text>
      </View>

      {/* Segmented Control */}
      <View
        style={[styles.segmentedControl, { backgroundColor: theme.surface }]}
      >
        {(["my", "explore"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && { backgroundColor: theme.brand.primary },
            ]}
            onPress={() => {
              setActiveTab(tab);
              setSearchQuery("");
              setSearchResults(null);
            }}
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

      {/* Search Bar (Explore tab only) */}
      {activeTab === "explore" && (
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
            placeholder="Search tribes..."
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
      )}

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
              onPress={() =>
                router.push(`/tribe/${item.id}` as any)
              }
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

      {/* Create Modal */}
      <CreateTribeModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme.brand.primary },
          Layout.shadows.lg,
        ]}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={theme.text.inverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    marginVertical: Spacing.xs,
    marginLeft: Spacing.xs,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontFamily: "Poppins_600SemiBold",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: Layout.radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.xxs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Layout.radius.sm,
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
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
    borderRadius: Layout.radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : Spacing.xxs,
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
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
