/**
 * ============================================================
 * REACT QUERY HOOKS - Data fetching hooks for Feed
 * ============================================================
 *
 * Query Key Convention:
 * - ["feed", filters?]           - feed list
 * - ["feed", "infinite", filters?] - infinite scroll feed
 * - ["feed", id]                 - single post
 * - ["feed", id, "comments"]     - comments for a post
 * ============================================================
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import feedService, { FeedServiceError } from "@/lib/feedService";
import type {
  FeedPost,
  FeedPostCreateInput,
  FeedFilters,
  PaginatedFeedPosts,
  FeedComment,
  FeedCommentCreateInput,
  FeedCommentFilters,
  PaginatedFeedComments,
} from "@/types/gig";

// ============================================================
// QUERY KEYS
// ============================================================

export const feedQueryKeys = {
  all: ["feed"] as const,
  list: (filters?: FeedFilters) => ["feed", "list", filters] as const,
  infinite: (filters?: Omit<FeedFilters, "cursor">) => ["feed", "infinite", filters] as const,
  detail: (id: string) => ["feed", id] as const,
  comments: (postId: string, filters?: FeedCommentFilters) =>
    ["feed", postId, "comments", filters] as const,
};

// ============================================================
// FEED HOOKS
// ============================================================

/**
 * Fetch feed posts with optional filters
 */
export function useFeed(filters?: FeedFilters, enabled = true) {
  return useQuery<PaginatedFeedPosts, FeedServiceError>({
    queryKey: feedQueryKeys.list(filters),
    queryFn: () => feedService.getFeed(filters),
    enabled,
  });
}

/**
 * Infinite scroll feed
 */
export function useInfiniteFeed(filters?: Omit<FeedFilters, "cursor">) {
  return useInfiniteQuery<PaginatedFeedPosts, FeedServiceError>({
    queryKey: feedQueryKeys.infinite(filters),
    queryFn: ({ pageParam }) =>
      feedService.getFeed({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

/**
 * Flattened paginated feed for easy consumption
 */
export function usePaginatedFeed(filters?: Omit<FeedFilters, "cursor">) {
  const query = useInfiniteFeed(filters);

  const allItems = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    data: allItems,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.error,
    hasMore: query.hasNextPage ?? false,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refresh: () => query.refetch(),
    refreshing: query.isRefetching && !query.isFetchingNextPage,
  };
}

/**
 * Fetch a single post
 */
export function useFeedPost(id: string | null | undefined, enabled = true) {
  return useQuery<FeedPost, FeedServiceError>({
    queryKey: feedQueryKeys.detail(id!),
    queryFn: () => feedService.getPost(id!),
    enabled: enabled && !!id,
  });
}

// ============================================================
// POST MUTATIONS
// ============================================================

/**
 * Create a new feed post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation<FeedPost, FeedServiceError, FeedPostCreateInput>({
    mutationFn: (data) => feedService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKeys.all });
    },
  });
}

/**
 * Delete a feed post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation<void, FeedServiceError, string>({
    mutationFn: (id) => feedService.deletePost(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: feedQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: feedQueryKeys.all });
    },
  });
}

// ============================================================
// LIKE MUTATIONS
// ============================================================

/**
 * Toggle like on a post (optimistic update)
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation<
    { liked: boolean },
    FeedServiceError,
    { postId: string; isLiked: boolean }
  >({
    mutationFn: ({ postId, isLiked }) =>
      isLiked ? feedService.unlikePost(postId) : feedService.likePost(postId),
    onMutate: async ({ postId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedQueryKeys.all });

      // Optimistically update infinite feed pages
      queryClient.setQueriesData<{ pages: { items: FeedPost[]; next_cursor: string | null }[] }>(
        { queryKey: ["feed", "infinite"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      is_liked: !isLiked,
                      likes_count: p.likes_count + (isLiked ? -1 : 1),
                    }
                  : p,
              ),
            })),
          };
        },
      );
    },
    onError: () => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: feedQueryKeys.all });
    },
  });
}

// ============================================================
// COMMENT HOOKS
// ============================================================

/**
 * Fetch comments for a post
 */
export function useFeedComments(
  postId: string | null | undefined,
  filters?: FeedCommentFilters,
  enabled = true,
) {
  return useQuery<PaginatedFeedComments, FeedServiceError>({
    queryKey: feedQueryKeys.comments(postId!, filters),
    queryFn: () => feedService.getComments(postId!, filters),
    enabled: enabled && !!postId,
  });
}

/**
 * Add a comment to a post
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation<
    FeedComment,
    FeedServiceError,
    { postId: string; data: FeedCommentCreateInput }
  >({
    mutationFn: ({ postId, data }) => feedService.addComment(postId, data),
    onSuccess: (_data, { postId }) => {
      // Refetch comments
      queryClient.invalidateQueries({ queryKey: feedQueryKeys.comments(postId) });
      // Update comment count in feed
      queryClient.invalidateQueries({ queryKey: feedQueryKeys.all });
    },
  });
}
