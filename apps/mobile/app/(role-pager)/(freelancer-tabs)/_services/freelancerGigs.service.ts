// ─────────────────────────────────────────────────────────────────────────────
// Freelancer Tabs — Gig Service
// Dual-mode: mock data (USE_MOCK=true) or real API (USE_MOCK=false).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import { USE_MOCK, API_BASE_URL, mockDelay } from "./config";
import type {
  ApiErrorPayload,
  CursorPaginationParams,
  CreateGigPayload,
  CreateProposalPayload,
  DisplayGig,
  FreelancerStats,
  GigFilters,
  GigWithFounderAndTags,
  PaginatedResponse,
  Proposal,
  UpdateGigPayload,
} from "./types";
import {
  MOCK_GIGS,
  MOCK_PROPOSALS,
  MOCK_STATS,
  mockCursorPaginate,
} from "./mockData";

// ======================== Error ========================

export class FreelancerServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "FreelancerServiceError";
  }
}

// ======================== Auth ========================

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new FreelancerServiceError(
      "Not authenticated",
      "AUTH_REQUIRED",
      401,
    );
  }
  return session.access_token;
}

// ======================== Fetch Helper ========================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorPayload: ApiErrorPayload | undefined;
    try {
      errorPayload = (await response.json()) as ApiErrorPayload;
    } catch {
      // response body is not JSON
    }

    throw new FreelancerServiceError(
      errorPayload?.error?.message ?? `API Error: ${response.statusText}`,
      errorPayload?.error?.code ?? "UNKNOWN",
      response.status,
      errorPayload?.error?.details ?? null,
    );
  }

  // 204 No Content
  if (response.status === 204) return {} as T;

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }

  return {} as T;
}

// ======================== Display Adapter ========================

export function toDisplayGig(gig: GigWithFounderAndTags): DisplayGig {
  return {
    ...gig,
    budget: Math.round((gig.budget_min + gig.budget_max) / 2),
    client_name: gig.founder?.display_name ?? "A Founder",
    client_company: gig.founder?.company_name ?? "",
    deadline: null,
    progress: 0,
  };
}

// ======================== URL Params Builder ========================

function buildGigQueryString(filters?: GigFilters): string {
  if (!filters) return "";

  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.tag) params.append("tag", filters.tag);
  if (filters.budget_type) params.append("budget_type", filters.budget_type);
  if (filters.budget_min != null)
    params.append("budget_min", String(filters.budget_min));
  if (filters.budget_max != null)
    params.append("budget_max", String(filters.budget_max));
  if (filters.experience_level)
    params.append("experience_level", filters.experience_level);
  if (filters.startup_stage)
    params.append("startup_stage", filters.startup_stage);
  if (filters.cursor) params.append("cursor", filters.cursor);
  if (filters.limit) params.append("limit", String(filters.limit));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function buildPaginationQueryString(params?: CursorPaginationParams): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.cursor) qs.append("cursor", params.cursor);
  if (params.limit) qs.append("limit", String(params.limit));
  const str = qs.toString();
  return str ? `?${str}` : "";
}

// ======================== Service ========================

export const freelancerGigsService = {
  /**
   * Fetch freelancer dashboard stats.
   */
  getStats: async (): Promise<FreelancerStats> => {
    if (USE_MOCK) {
      await mockDelay();
      return { ...MOCK_STATS };
    }

    const response = await fetchApi<{ data: FreelancerStats }>(
      "/api/gigs/stats",
    );
    return response.data;
  },

  /**
   * Browse/search gigs with optional filters and cursor pagination.
   * Returns DisplayGig[] (backend Gig + derived UI fields).
   */
  getGigs: async (
    filters?: GigFilters,
  ): Promise<PaginatedResponse<DisplayGig>> => {
    if (USE_MOCK) {
      await mockDelay();

      let source = [...MOCK_GIGS];

      // Apply filters
      if (filters?.status) {
        source = source.filter((g) => g.status === filters.status);
      }
      if (filters?.experience_level) {
        source = source.filter(
          (g) => g.experience_level === filters.experience_level,
        );
      }
      if (filters?.budget_type) {
        source = source.filter((g) => g.budget_type === filters.budget_type);
      }
      if (filters?.startup_stage) {
        source = source.filter(
          (g) => g.startup_stage === filters.startup_stage,
        );
      }
      if (filters?.tag) {
        const tagSlug = filters.tag.toLowerCase();
        source = source.filter((g) =>
          g.tags.some((t) => t.slug === tagSlug || t.label.toLowerCase() === tagSlug),
        );
      }
      if (filters?.budget_min != null) {
        source = source.filter((g) => g.budget_max >= filters.budget_min!);
      }
      if (filters?.budget_max != null) {
        source = source.filter((g) => g.budget_min <= filters.budget_max!);
      }

      const paginated = mockCursorPaginate(
        source,
        filters?.cursor,
        filters?.limit,
      );

      return {
        items: paginated.items.map(toDisplayGig),
        next_cursor: paginated.next_cursor,
      };
    }

    // Real API
    const qs = buildGigQueryString(filters);
    const response = await fetchApi<PaginatedResponse<GigWithFounderAndTags>>(
      `/api/gigs${qs}`,
    );
    return {
      items: response.items.map(toDisplayGig),
      next_cursor: response.next_cursor,
    };
  },

  /**
   * Get a single gig by ID.
   */
  getGig: async (id: string): Promise<DisplayGig> => {
    if (USE_MOCK) {
      await mockDelay();
      const gig = MOCK_GIGS.find((g) => g.id === id);
      if (!gig) {
        throw new FreelancerServiceError("Gig not found", "NOT_FOUND", 404);
      }
      return toDisplayGig(gig);
    }

    const response = await fetchApi<{ data: GigWithFounderAndTags }>(
      `/api/gigs/${id}`,
    );
    return toDisplayGig(response.data);
  },

  /**
   * Create a new gig.
   */
  createGig: async (payload: CreateGigPayload): Promise<DisplayGig> => {
    if (USE_MOCK) {
      await mockDelay();
      const now = new Date().toISOString();
      const newGig: GigWithFounderAndTags = {
        id: `gig-mock-${Date.now()}`,
        founder_id: "mock-founder-id",
        title: payload.title,
        description: payload.description,
        budget_type: payload.budget_type,
        budget_min: payload.budget_min,
        budget_max: payload.budget_max,
        experience_level: payload.experience_level,
        startup_stage: payload.startup_stage ?? null,
        status: payload.status ?? "draft",
        proposals_count: 0,
        location_text: payload.location_text ?? null,
        is_remote: payload.is_remote ?? true,
        published_at: null,
        created_at: now,
        updated_at: now,
        tags: [],
        founder: {
          id: "mock-founder-id",
          display_name: "You",
          avatar_url: null,
          company_name: null,
        },
      };
      return toDisplayGig(newGig);
    }

    const response = await fetchApi<{ data: GigWithFounderAndTags }>(
      "/api/gigs",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return toDisplayGig(response.data);
  },

  /**
   * Update an existing gig (owner only).
   */
  updateGig: async (
    id: string,
    payload: UpdateGigPayload,
  ): Promise<DisplayGig> => {
    if (USE_MOCK) {
      await mockDelay();
      const existing = MOCK_GIGS.find((g) => g.id === id);
      if (!existing) {
        throw new FreelancerServiceError("Gig not found", "NOT_FOUND", 404);
      }
      const updated: GigWithFounderAndTags = {
        ...existing,
        ...payload,
        startup_stage: payload.startup_stage ?? existing.startup_stage,
        updated_at: new Date().toISOString(),
      };
      return toDisplayGig(updated);
    }

    const response = await fetchApi<{ data: GigWithFounderAndTags }>(
      `/api/gigs/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return toDisplayGig(response.data);
  },

  /**
   * Delete a gig (owner only).
   */
  deleteGig: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      await mockDelay();
      const exists = MOCK_GIGS.some((g) => g.id === id);
      if (!exists) {
        throw new FreelancerServiceError("Gig not found", "NOT_FOUND", 404);
      }
      return;
    }

    await fetchApi<Record<string, never>>(`/api/gigs/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * List proposals submitted by the current freelancer.
   */
  getMyProposals: async (
    params?: CursorPaginationParams,
  ): Promise<PaginatedResponse<Proposal>> => {
    if (USE_MOCK) {
      await mockDelay();
      return mockCursorPaginate(
        MOCK_PROPOSALS,
        params?.cursor,
        params?.limit,
      );
    }

    const qs = buildPaginationQueryString(params);
    return fetchApi<PaginatedResponse<Proposal>>(`/api/proposals/me${qs}`);
  },

  /**
   * Submit a proposal for a gig.
   */
  submitProposal: async (
    gigId: string,
    payload: CreateProposalPayload,
  ): Promise<Proposal> => {
    if (USE_MOCK) {
      await mockDelay();
      const now = new Date().toISOString();
      return {
        id: `proposal-mock-${Date.now()}`,
        gig_id: gigId,
        freelancer_id: "mock-freelancer-001",
        cover_letter: payload.cover_letter,
        proposed_amount: payload.proposed_amount,
        estimated_days: payload.estimated_days ?? null,
        status: "pending",
        created_at: now,
        updated_at: now,
      };
    }

    const response = await fetchApi<{ data: Proposal }>(
      `/api/gigs/${gigId}/proposals`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return response.data;
  },
};
