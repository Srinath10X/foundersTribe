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
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import TribeCard from "@/components/TribeCard";
import CreateTribeModal from "@/components/CreateTribeModal";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Typography, Spacing, Layout } from "@/constants/DesignSystem";
import * as tribeApi from "@/lib/tribeApi";

type TabMode = "my" | "explore";

export default function TribesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token || "";

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
  ) => {
    await tribeApi.createTribe(token, {
      name,
      description: description || undefined,
      is_public: isPublic,
    });
    await loadTribes();
  };

  const handleJoin = async (tribeId: string) => {
    try {
      await tribeApi.joinTribe(token, tribeId);
      await loadTribes();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  /* ── Derive data ───────────────────────────────────────────── */

  const myTribeIds = new Set(myTribes.map((t) => t.id));
  const exploreTribes = publicTribes.filter((t) => !myTribeIds.has(t.id));
  const displayed =
    activeTab === "my"
      ? myTribes
      : searchResults !== null
        ? searchResults
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
                  fontWeight: "600",
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
    ...Typography.presets.h1,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: Layout.radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.xxs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Layout.radius.sm,
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
