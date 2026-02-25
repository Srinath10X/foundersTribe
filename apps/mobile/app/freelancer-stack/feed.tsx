import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  Avatar,
  FlowScreen,
  SurfaceCard,
  T,
  useFlowNav,
  useFlowPalette,
} from "@/components/community/freelancerFlow/shared";
import { usePaginatedFeed, useToggleLike, useCreatePost } from "@/hooks/useFeed";
import { supabase } from "@/lib/supabase";
import type { FeedPost, FeedPostType } from "@/types/gig";

const STORAGE_BUCKET = "tribe-media";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = 14;
const LIST_PADDING = 14;
const IMAGE_GAP = 4;
const IMAGE_AREA_WIDTH = SCREEN_WIDTH - LIST_PADDING * 2 - CARD_PADDING * 2;

// ============================================================
// HELPERS
// ============================================================

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWk = Math.floor(diffDay / 7);
  return `${diffWk}w`;
}

function getTypeLabel(type: FeedPostType): { label: string; color: string; bg: string } | null {
  switch (type) {
    case "hiring":
      return { label: "Hiring", color: "#34C759", bg: "rgba(52,199,89,0.12)" };
    case "milestone":
      return { label: "Milestone", color: "#FF9500", bg: "rgba(255,149,0,0.12)" };
    case "showcase":
      return { label: "Showcase", color: "#007AFF", bg: "rgba(0,122,255,0.12)" };
    case "insight":
      return { label: "Insight", color: "#AF52DE", bg: "rgba(175,82,222,0.12)" };
    case "work_update":
      return { label: "Update", color: "#5AC8FA", bg: "rgba(90,200,250,0.12)" };
    default:
      return null;
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

/**
 * Resolve an avatar_url value to a displayable signed URL.
 * Handles: full https URL, Supabase storage path, or fallback folder scan.
 */
async function resolveAvatarUrl(
  candidate: string | null | undefined,
  userId: string,
): Promise<string | null> {
  // Already a full URL — use as-is
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  // Storage path — create a signed URL
  if (typeof candidate === "string" && candidate.trim()) {
    const { data: signedData, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (!error && signedData?.signedUrl) {
      return `${signedData.signedUrl}&t=${Date.now()}`;
    }
  }

  // Fallback — scan the user's profiles folder
  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 20 });
  if (!files?.length) return null;

  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const fullPath = `${folder}/${preferred.name}`;
  const { data: signedData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(fullPath, 60 * 60 * 24 * 30);
  return signedData?.signedUrl ? `${signedData.signedUrl}&t=${Date.now()}` : null;
}

/** Cache resolved avatar URLs so we don't re-sign on every render */
const avatarCache = new Map<string, string | null>();

function useResolvedAvatar(
  avatarUrl: string | null | undefined,
  userId: string | undefined,
): string | null {
  const cacheKey = userId || "";
  const [resolved, setResolved] = useState<string | null>(
    avatarCache.get(cacheKey) ?? null,
  );

  useEffect(() => {
    if (!userId) return;

    // Already cached
    if (avatarCache.has(cacheKey)) {
      setResolved(avatarCache.get(cacheKey) ?? null);
      return;
    }

    let cancelled = false;
    resolveAvatarUrl(avatarUrl, userId).then((url) => {
      if (cancelled) return;
      avatarCache.set(cacheKey, url);
      setResolved(url);
    });

    return () => {
      cancelled = true;
    };
  }, [avatarUrl, userId, cacheKey]);

  return resolved;
}

// ============================================================
// COMPOSE BAR (inline, top of feed)
// ============================================================

function ComposeBar({
  palette,
  onPost,
  isPending,
}: {
  palette: any;
  onPost: (content: string) => void;
  isPending: boolean;
}) {
  const [text, setText] = useState("");

  const handlePost = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onPost(trimmed);
    setText("");
  };

  return (
    <SurfaceCard style={styles.composeCard}>
      <TextInput
        style={[styles.composeInput, { color: palette.text, borderColor: palette.borderLight }]}
        placeholder="Share a work update..."
        placeholderTextColor={palette.mutedText}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={5000}
      />
      <View style={styles.composeActions}>
        <TouchableOpacity
          style={[
            styles.postBtn,
            { backgroundColor: text.trim() ? palette.accent : palette.borderLight },
          ]}
          activeOpacity={0.7}
          onPress={handlePost}
          disabled={!text.trim() || isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <T weight="medium" color="#fff" style={styles.postBtnText}>
              Post
            </T>
          )}
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

// ============================================================
// POST CARD
// ============================================================

function PostCard({
  item,
  palette,
  onToggleLike,
  onPressAuthor,
}: {
  item: FeedPost;
  palette: any;
  onToggleLike: (postId: string, isLiked: boolean) => void;
  onPressAuthor: (authorId: string) => void;
}) {
  const typeLabel = getTypeLabel(item.post_type);
  const authorName = item.author?.full_name || "Unknown";
  const authorHandle = item.author?.handle ? `@${item.author.handle}` : "";
  const images = item.images || [];

  // Resolve avatar: storage path → signed URL
  const resolvedAvatar = useResolvedAvatar(
    item.author?.avatar_url,
    item.author?.id || item.author_id,
  );
  const initials = getInitials(item.author?.full_name);

  return (
    <SurfaceCard style={styles.postCard}>
      {/* Author header */}
      <TouchableOpacity
        style={styles.authorRow}
        activeOpacity={0.7}
        onPress={() => onPressAuthor(item.author?.id || item.author_id)}
      >
        {resolvedAvatar ? (
          <Avatar source={{ uri: resolvedAvatar }} size={44} />
        ) : (
          <View
            style={[
              styles.initialsCircle,
              { backgroundColor: palette.accentSoft },
            ]}
          >
            <T weight="medium" color={palette.accent} style={styles.initialsText}>
              {initials}
            </T>
          </View>
        )}
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <T weight="medium" color={palette.text} style={styles.authorName} numberOfLines={1}>
              {authorName}
            </T>
          </View>
          {authorHandle ? (
            <T weight="regular" color={palette.subText} style={styles.authorHandle} numberOfLines={1}>
              {authorHandle}
            </T>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <T weight="regular" color={palette.mutedText} style={styles.timeText}>
            {timeAgo(item.created_at)}
          </T>
          {typeLabel && (
            <View style={[styles.typePill, { backgroundColor: typeLabel.bg }]}>
              <T weight="medium" color={typeLabel.color} style={styles.typeText}>
                {typeLabel.label}
              </T>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Content */}
      <T weight="regular" color={palette.text} style={styles.postContent}>
        {item.content}
      </T>

      {/* Images */}
      {images.length === 1 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: images[0] }}
            style={styles.postImageSingle}
            contentFit="cover"
            transition={200}
          />
        </View>
      )}
      {images.length === 2 && (
        <View style={styles.imageContainer}>
          <View style={styles.imageRow}>
            {images.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={[styles.postImageHalf, idx === 0 ? styles.imageRoundLeft : styles.imageRoundRight]}
                contentFit="cover"
                transition={200}
              />
            ))}
          </View>
        </View>
      )}
      {images.length === 3 && (
        <View style={styles.imageContainer}>
          <View style={styles.imageRow}>
            <Image
              source={{ uri: images[0] }}
              style={[styles.postImageTwoThirds, styles.imageRoundLeft]}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageColStack}>
              <Image
                source={{ uri: images[1] }}
                style={[styles.postImageStackItem, { borderTopRightRadius: 10 }]}
                contentFit="cover"
                transition={200}
              />
              <Image
                source={{ uri: images[2] }}
                style={[styles.postImageStackItem, { borderBottomRightRadius: 10 }]}
                contentFit="cover"
                transition={200}
              />
            </View>
          </View>
        </View>
      )}
      {images.length >= 4 && (
        <View style={styles.imageContainer}>
          <View style={styles.imageRow}>
            <Image
              source={{ uri: images[0] }}
              style={[styles.postImageQuadrant, { borderTopLeftRadius: 10 }]}
              contentFit="cover"
              transition={200}
            />
            <Image
              source={{ uri: images[1] }}
              style={[styles.postImageQuadrant, { borderTopRightRadius: 10 }]}
              contentFit="cover"
              transition={200}
            />
          </View>
          <View style={styles.imageRow}>
            <Image
              source={{ uri: images[2] }}
              style={[styles.postImageQuadrant, { borderBottomLeftRadius: 10 }]}
              contentFit="cover"
              transition={200}
            />
            <Image
              source={{ uri: images[3] }}
              style={[styles.postImageQuadrant, { borderBottomRightRadius: 10 }]}
              contentFit="cover"
              transition={200}
            />
          </View>
        </View>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <T key={tag} weight="regular" color={palette.accent} style={styles.tagText}>
              #{tag}
            </T>
          ))}
        </View>
      )}

      {/* Engagement stats */}
      <View style={[styles.statsRow, { borderTopColor: palette.borderLight }]}>
        <T weight="regular" color={palette.subText} style={styles.statText}>
          {formatCount(item.likes_count)} likes
        </T>
        <T weight="regular" color={palette.subText} style={styles.statText}>
          {formatCount(item.comments_count)} comments
        </T>
      </View>

      {/* Action buttons */}
      <View style={[styles.actionsRow, { borderTopColor: palette.borderLight }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => onToggleLike(item.id, item.is_liked)}
        >
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={18}
            color={item.is_liked ? "#FF2D55" : palette.subText}
          />
          <T
            weight="regular"
            color={item.is_liked ? "#FF2D55" : palette.subText}
            style={styles.actionText}
          >
            Like
          </T>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={17} color={palette.subText} />
          <T weight="regular" color={palette.subText} style={styles.actionText}>
            Comment
          </T>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="paper-plane-outline" size={17} color={palette.subText} />
          <T weight="regular" color={palette.subText} style={styles.actionText}>
            Share
          </T>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function FeedScreen() {
  const { palette } = useFlowPalette();
  const insets = useSafeAreaInsets();
  const nav = useFlowNav();

  const { data, loading, loadingMore, hasMore, loadMore, refresh, refreshing } =
    usePaginatedFeed();

  const toggleLike = useToggleLike();
  const createPost = useCreatePost();

  const handleToggleLike = useCallback(
    (postId: string, isLiked: boolean) => {
      toggleLike.mutate({ postId, isLiked });
    },
    [toggleLike],
  );

  const handleCreatePost = useCallback(
    (content: string) => {
      createPost.mutate({ content });
    },
    [createPost],
  );

  const handlePressAuthor = useCallback(
    (authorId: string) => {
      nav.push(`/freelancer-stack/freelancer-profile?id=${authorId}`);
    },
    [nav],
  );

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => (
      <PostCard
        item={item}
        palette={palette}
        onToggleLike={handleToggleLike}
        onPressAuthor={handlePressAuthor}
      />
    ),
    [palette, handleToggleLike, handlePressAuthor],
  );

  const renderHeader = useCallback(
    () => (
      <ComposeBar palette={palette} onPost={handleCreatePost} isPending={createPost.isPending} />
    ),
    [palette, handleCreatePost, createPost.isPending],
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
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <T weight="regular" color={palette.subText} style={styles.emptyText}>
            Loading feed...
          </T>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={48} color={palette.mutedText} />
        <T weight="medium" color={palette.text} style={styles.emptyTitle}>
          No posts yet
        </T>
        <T weight="regular" color={palette.subText} style={styles.emptyText}>
          Be the first to share a work update!
        </T>
      </View>
    );
  }, [loading, palette]);

  return (
    <FlowScreen scroll={false}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: palette.borderLight,
            backgroundColor: palette.bg,
          },
        ]}
      >
        <T weight="medium" color={palette.text} style={styles.pageTitle}>
          Feed
        </T>
        <T weight="regular" color={palette.subText} style={styles.pageSubtitle}>
          Updates from professionals in your network
        </T>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
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
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </FlowScreen>
  );
}

// ============================================================
// STYLES
// ============================================================

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
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120,
  },

  // Compose
  composeCard: {
    padding: 14,
    marginBottom: 10,
  },
  composeInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: "top",
  },
  composeActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  postBtn: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  postBtnText: {
    fontSize: 13,
    lineHeight: 17,
  },

  // Post card
  postCard: {
    padding: 14,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  authorName: {
    fontSize: 14,
    lineHeight: 18,
  },
  authorHandle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  initialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 16,
    lineHeight: 20,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontSize: 10,
    lineHeight: 13,
  },
  postContent: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
  },

  // Images
  imageContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
    gap: IMAGE_GAP,
  },
  imageRow: {
    flexDirection: "row",
    gap: IMAGE_GAP,
  },
  postImageSingle: {
    width: IMAGE_AREA_WIDTH,
    height: 220,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  postImageHalf: {
    width: (IMAGE_AREA_WIDTH - IMAGE_GAP) / 2,
    height: 180,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  imageRoundLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  imageRoundRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  postImageTwoThirds: {
    width: (IMAGE_AREA_WIDTH - IMAGE_GAP) * 0.6,
    height: 200,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  imageColStack: {
    flex: 1,
    gap: IMAGE_GAP,
  },
  postImageStackItem: {
    flex: 1,
    width: "100%" as const,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  postImageQuadrant: {
    width: (IMAGE_AREA_WIDTH - IMAGE_GAP) / 2,
    height: (200 - IMAGE_GAP) / 2,
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statText: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Empty / Loading states
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
