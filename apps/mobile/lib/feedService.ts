/**
 * ============================================================
 * FEED SERVICE - API Client for Feed Posts
 * ============================================================
 *
 * This service provides a clean interface to the feed API.
 * Follows the same pattern as gigService.ts.
 *
 * Backend endpoints covered:
 * - POST   /api/feed             - Create a post
 * - GET    /api/feed             - List feed
 * - GET    /api/feed/:id         - Get single post
 * - DELETE /api/feed/:id         - Delete a post
 * - POST   /api/feed/:id/like    - Like a post
 * - DELETE /api/feed/:id/like    - Unlike a post
 * - POST   /api/feed/:id/comments - Add a comment
 * - GET    /api/feed/:id/comments - List comments
 * ============================================================
 */

import { supabase } from "./supabase";
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
// CONFIGURATION
// ============================================================

const API_BASE_URL = process.env.EXPO_PUBLIC_GIG_SERVICE_URL;

// ============================================================
// ERROR HANDLING
// ============================================================

export class FeedServiceError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "FeedServiceError";
  }
}

// ============================================================
// AUTH HELPERS
// ============================================================

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new FeedServiceError("Not authenticated", 401, "UNAUTHENTICATED");
  }
  return session.access_token;
}

// ============================================================
// API FETCH WRAPPER
// ============================================================

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new FeedServiceError("Gig service URL is not configured", 500, "CONFIG_ERROR");
  }

  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.statusText}`;
      let errorCode = "API_ERROR";

      try {
        const errorData = await response.json();
        const details = errorData.error?.details;

        if (Array.isArray(details) && details.length > 0) {
          const firstError = details[0];
          const field = firstError?.path?.join(".") || "field";
          errorMessage = `${firstError?.message || "Validation failed"} (${field})`;
          errorCode = "VALIDATION_ERROR";
        } else {
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
          errorCode = errorData.error?.code || errorData.code || errorCode;
        }
      } catch {
        // Response is not JSON
      }

      throw new FeedServiceError(errorMessage, response.status, errorCode);
    }

    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof FeedServiceError) {
      throw error;
    }
    throw new FeedServiceError(
      `Network request failed: ${error instanceof Error ? error.message : String(error)}`,
      503,
      "NETWORK_ERROR",
    );
  }
}

// ============================================================
// URL PARAMS HELPER
// ============================================================

function buildQueryString(params?: object): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

// ============================================================
// FEED SERVICE METHODS
// ============================================================

export const feedService = {
  // ------------------------------------------
  // POSTS
  // ------------------------------------------

  /**
   * Create a new feed post
   * POST /api/feed
   */
  createPost: async (data: FeedPostCreateInput): Promise<FeedPost> => {
    const response = await fetchWithAuth<{ data: FeedPost }>("/api/feed", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data!;
  },

  /**
   * List feed posts
   * GET /api/feed
   */
  getFeed: async (filters?: FeedFilters): Promise<PaginatedFeedPosts> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: FeedPost[]; next_cursor: string | null }>(
      `/api/feed${query}`,
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * Get a single post
   * GET /api/feed/:id
   */
  getPost: async (id: string): Promise<FeedPost> => {
    const response = await fetchWithAuth<{ data: FeedPost }>(`/api/feed/${id}`);
    if (!response.data) {
      throw new FeedServiceError("Post not found", 404, "NOT_FOUND");
    }
    return response.data;
  },

  /**
   * Delete a post
   * DELETE /api/feed/:id
   */
  deletePost: async (id: string): Promise<void> => {
    await fetchWithAuth(`/api/feed/${id}`, { method: "DELETE" });
  },

  // ------------------------------------------
  // LIKES
  // ------------------------------------------

  /**
   * Like a post
   * POST /api/feed/:id/like
   */
  likePost: async (id: string): Promise<{ liked: boolean }> => {
    const response = await fetchWithAuth<{ data: { liked: boolean } }>(`/api/feed/${id}/like`, {
      method: "POST",
    });
    return response.data!;
  },

  /**
   * Unlike a post
   * DELETE /api/feed/:id/like
   */
  unlikePost: async (id: string): Promise<{ liked: boolean }> => {
    const response = await fetchWithAuth<{ data: { liked: boolean } }>(`/api/feed/${id}/like`, {
      method: "DELETE",
    });
    return response.data!;
  },

  // ------------------------------------------
  // COMMENTS
  // ------------------------------------------

  /**
   * Add a comment to a post
   * POST /api/feed/:id/comments
   */
  addComment: async (postId: string, data: FeedCommentCreateInput): Promise<FeedComment> => {
    const response = await fetchWithAuth<{ data: FeedComment }>(`/api/feed/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data!;
  },

  /**
   * List comments for a post
   * GET /api/feed/:id/comments
   */
  getComments: async (postId: string, filters?: FeedCommentFilters): Promise<PaginatedFeedComments> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: FeedComment[]; next_cursor: string | null }>(
      `/api/feed/${postId}/comments${query}`,
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },
};

export default feedService;
