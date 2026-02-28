import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FlowScreen,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { usePaginatedFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/types/gig";

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 2;
const GRID_GAP = 6; // slightly more gap for a better look
const PADDING_H = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - PADDING_H * 2;
const CELL_SIZE =
  (AVAILABLE_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Bento grid: max 2 columns with alternating featured rows.
// Pattern repeats:
//   large-left  -> 3 posts (left tall + 2 right stacked)
//   row         -> 2 posts
//   large-right -> 3 posts (right tall + 2 left stacked)
//   row         -> 2 posts

// Placeholder phrases for animated search bar
const SEARCH_PHRASES = [
  "Search posts…",
  "Find design work…",
  "Discover showcases…",
  "Browse milestones…",
  "Explore portfolios…",
];

// ============================================================
// ANIMATED SEARCH BAR
// ============================================================

function AnimatedSearchBar({
  palette,
  onChangeText,
  value,
}: {
  palette: any;
  onChangeText: (text: string) => void;
  value: string;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value.length > 0) return; // Don't animate when user is typing

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setPhraseIndex((prev) => (prev + 1) % SEARCH_PHRASES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim, value]);

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: palette.surface,
          borderColor: palette.borderLight,
        },
      ]}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={palette.mutedText}
        style={styles.searchIcon}
      />
      <View style={styles.searchInputWrap}>
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="transparent" // Make native placeholder invisible just in case
        />
        {value.length === 0 && (
          <Animated.View
            style={[styles.searchPlaceholderOverlay, { opacity: fadeAnim }]}
            pointerEvents="none"
          >
            <T
              weight="regular"
              color={palette.mutedText}
              style={styles.searchPlaceholderText}
            >
              {SEARCH_PHRASES[phraseIndex]}
            </T>
          </Animated.View>
        )}
      </View>
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={18} color={palette.mutedText} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================
// GRID CELL
// ============================================================

function GridCell({
  item,
  onPress,
  palette,
  size,
  height,
}: {
  item: FeedPost;
  onPress: () => void;
  palette: any;
  size: number;
  height?: number;
}) {
  const hasImages = item.images && item.images.length > 0;
  const hasMultipleImages = item.images && item.images.length > 1;

  // Generate a deterministic gradient based on post ID
  const hash = item.id.charCodeAt(0) + item.id.charCodeAt(item.id.length - 1);
  const gradients: [string, string][] = [
    ["#667eea", "#764ba2"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
    ["#43e97b", "#38f9d7"],
    ["#fa709a", "#fee140"],
    ["#a18cd1", "#fbc2eb"],
    ["#ffecd2", "#fcb69f"],
    ["#89f7fe", "#66a6ff"],
  ];
  const gradientPair = gradients[hash % gradients.length];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.gridCell, { width: size, height: height ?? size }]}
    >
      {hasImages ? (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.cellImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={gradientPair}
          style={styles.cellGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <T
            weight="medium"
            color="rgba(255,255,255,0.9)"
            style={styles.cellTextPreview}
            numberOfLines={3}
          >
            {item.content}
          </T>
        </LinearGradient>
      )}

      {/* Multi-image indicator */}
      {hasMultipleImages && (
        <View style={styles.multiImageBadge}>
          <Ionicons name="copy-outline" size={14} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================
// BENTO GRID LOGIC
// ============================================================

type ChunkType = "large-left" | "large-right" | "row" | "incomplete";

interface BentoChunk {
  id: string;
  type: ChunkType;
  items: FeedPost[];
}

function createBentoChunks(data: FeedPost[]): BentoChunk[] {
  const chunks: BentoChunk[] = [];
  let i = 0;
  let chunkIndex = 0;

  while (i < data.length) {
    const remaining = data.length - i;

    let type: ChunkType = "row";
    const patternPos = chunkIndex % 4;
    const isFeatured = patternPos === 0 || patternPos === 2;

    if (isFeatured && remaining >= 3) {
      type = patternPos === 0 ? "large-left" : "large-right";
    } else if (remaining < 2) {
      type = "incomplete";
    }

    const size = type === "incomplete" ? 1 : type === "row" ? 2 : 3;
    chunks.push({
      id: `chunk_${i}`,
      type,
      items: data.slice(i, i + size),
    });

    i += size;
    chunkIndex++;
  }

  return chunks;
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function FeedScreen() {
  const { palette } = useFlowPalette();
  const insets = useSafeAreaInsets();
  const nav = useFlowNav();

  const [searchQuery, setSearchQuery] = useState("");

  const { data, loading, loadingMore, hasMore, loadMore, refresh, refreshing } =
    usePaginatedFeed();

  // Filter data
  const filteredData = searchQuery.trim()
    ? data.filter(
        (post) =>
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (post.tags &&
            post.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )) ||
          (post.author?.full_name &&
            post.author.full_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
    : data;

  const bentoChunks = createBentoChunks(filteredData);

  const handlePressPost = useCallback(
    (postId: string) => {
      nav.push(`/freelancer-stack/post-detail?id=${postId}`);
    },
    [nav]
  );

  const renderBentoChunk = useCallback(
    ({ item: chunk }: { item: BentoChunk }) => {
      const { type, items } = chunk;

      // Handle incomplete chunks (less than 2 items at the end)
      if (type === "incomplete" || type === "row") {
        return (
          <View style={[styles.gridRow, { marginBottom: GRID_GAP }]}>
            {items.map((post) => (
              <GridCell
                key={post.id}
                item={post}
                onPress={() => handlePressPost(post.id)}
                palette={palette}
                size={CELL_SIZE}
              />
            ))}
            {/* Fill remaining space if < 2 items */}
            {items.length < 2 &&
              Array.from({ length: 2 - items.length }).map((_, idx) => (
                <View
                  key={`empty_${idx}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                />
              ))}
          </View>
        );
      }

      // Large Left: | L | s |
      //             |   | s |
      if (type === "large-left") {
        const largeSize = CELL_SIZE * 2 + GRID_GAP;
        return (
          <View style={[styles.gridRow, { marginBottom: GRID_GAP }]}>
            <GridCell
              item={items[0]}
              onPress={() => handlePressPost(items[0].id)}
              palette={palette}
              size={CELL_SIZE}
              height={largeSize}
            />
            <View style={styles.stackedCol}>
              <GridCell
                item={items[1]}
                onPress={() => handlePressPost(items[1].id)}
                palette={palette}
                size={CELL_SIZE}
              />
              <GridCell
                item={items[2]}
                onPress={() => handlePressPost(items[2].id)}
                palette={palette}
                size={CELL_SIZE}
              />
            </View>
          </View>
        );
      }

      // Large Right: | s | L |
      //              | s |   |
      if (type === "large-right") {
        const largeSize = CELL_SIZE * 2 + GRID_GAP;
        return (
          <View style={[styles.gridRow, { marginBottom: GRID_GAP }]}>
            <View style={styles.stackedCol}>
              <GridCell
                item={items[0]}
                onPress={() => handlePressPost(items[0].id)}
                palette={palette}
                size={CELL_SIZE}
              />
              <GridCell
                item={items[1]}
                onPress={() => handlePressPost(items[1].id)}
                palette={palette}
                size={CELL_SIZE}
              />
            </View>
            <GridCell
              item={items[2]}
              onPress={() => handlePressPost(items[2].id)}
              palette={palette}
              size={CELL_SIZE}
              height={largeSize}
            />
          </View>
        );
      }

      return null;
    },
    [palette, handlePressPost]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={palette.accent} />
      </View>
    );
  }, [loadingMore, palette.accent]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      // Skeleton bento
      const largeSize = CELL_SIZE * 2 + GRID_GAP;
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.gridRow, { marginBottom: GRID_GAP }]}>
            <View
              style={[
                styles.skeletonCell,
                {
                  width: CELL_SIZE,
                  height: largeSize,
                  backgroundColor: palette.surface,
                },
              ]}
            />
            <View style={styles.stackedCol}>
              <View
                style={[
                  styles.skeletonCell,
                  {
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: palette.surface,
                  },
                ]}
              />
              <View
                style={[
                  styles.skeletonCell,
                  {
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: palette.surface,
                  },
                ]}
              />
            </View>
          </View>
          <View style={[styles.gridRow, { marginBottom: GRID_GAP }]}>
            <View
              style={[
                styles.skeletonCell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: palette.surface,
                },
              ]}
            />
            <View
              style={[
                styles.skeletonCell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: palette.surface,
                },
              ]}
            />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.emptyStateContainer}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: palette.accentSoft },
          ]}
        >
          <Ionicons name="images-outline" size={40} color={palette.accent} />
        </View>
        <T weight="medium" color={palette.text} style={styles.emptyTitle}>
          No posts yet
        </T>
        <T weight="regular" color={palette.subText} style={styles.emptyText}>
          Be the first to share your work!
        </T>
      </View>
    );
  }, [loading, palette]);

  return (
    <FlowScreen scroll={false}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: palette.bg,
            borderBottomColor: palette.borderLight,
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <T weight="semiBold" color={palette.text} style={styles.pageTitle}>
            Explore
          </T>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: palette.accent }]}
            activeOpacity={0.85}
            onPress={() => nav.push("/freelancer-stack/feed")}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <AnimatedSearchBar
          palette={palette}
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
      </View>

      {/* Bento grid */}
      <FlatList
        data={bentoChunks}
        keyExtractor={(item) => item.id}
        renderItem={renderBentoChunk}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.accent}
          />
        }
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.gridContent}
      />
    </FlowScreen>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20, // Increased spacing between title and search bar
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Search bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24, // More rounded search bar
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48, // Taller search bar
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInputWrap: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  searchInput: {
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
    height: 48,
  },
  searchPlaceholderOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  searchPlaceholderText: {
    fontSize: 14,
    lineHeight: 18,
  },

  // Grid
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  stackedCol: {
    gap: GRID_GAP,
  },
  gridCell: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    position: "relative",
  },
  cellImage: {
    width: "100%",
    height: "100%",
  },
  cellGradient: {
    width: "100%",
    height: "100%",
    padding: 8,
    justifyContent: "flex-end",
  },
  cellTextPreview: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Overlays on cells
  multiImageBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    padding: 3,
  },
  // Footer / Loading
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },

  // Empty / Loading state
  emptyContainer: {
    paddingTop: 4,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  skeletonCell: {
    borderRadius: 0,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
