/**
 * ============================================================
 * GIG SERVICE - API Client for Gig Marketplace
 * ============================================================
 * 
 * This service provides a clean interface to the gig marketplace API.
 * All methods use proper authentication and error handling.
 * 
 * Architecture:
 * - Types are defined in @/types/gig
 * - This service handles all API communication
 * - Hooks (in @/hooks) should be used for data fetching in components
 * 
 * Backend endpoints covered:
 * - /api/gigs            - CRUD for gigs
 * - /api/gigs/:id/proposals - Proposals on a gig
 * - /api/proposals       - Freelancer's own proposals
 * - /api/contracts       - Contracts between founders and freelancers
 * - /api/contracts/:id/messages - Contract messaging
 * - /api/contracts/:id/rate - Ratings
 * - /api/notifications   - User notifications
 * - /api/users/me        - User profile
 * ============================================================
 */

import { supabase } from "./supabase";
import type {
  Gig,
  GigCreateInput,
  GigUpdateInput,
  GigFilters,
  PaginatedGigs,
  FreelancerStats,
  Contract,
  ContractFilters,
  ContractMessage,
  MessageCreateInput,
  MessageListParams,
  PaginatedContracts,
  PaginatedMessages,
  Proposal,
  ProposalCreateInput,
  ProposalFilters,
  PaginatedProposals,
  Rating,
  RatingCreateInput,
  Notification,
  NotificationFilters,
  PaginatedNotifications,
  UserProfile,
  UserProfileUpsertInput,
} from "@/types/gig";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL = process.env.EXPO_PUBLIC_GIG_SERVICE_URL;

if (!API_BASE_URL) {
  console.warn("EXPO_PUBLIC_GIG_SERVICE_URL is not set. API calls will fail.");
}

// ============================================================
// ERROR HANDLING
// ============================================================

export class GigServiceError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "GigServiceError";
  }
}

// ============================================================
// AUTH HELPERS
// ============================================================

async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new GigServiceError("Not authenticated", 401, "UNAUTHENTICATED");
  }
  return session.access_token;
}

// ============================================================
// API FETCH WRAPPER
// ============================================================

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new GigServiceError("Gig service URL is not configured", 500, "CONFIG_ERROR");
  }

  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      let errorMessage = `API Error: ${response.statusText}`;
      let errorCode = "API_ERROR";

      try {
        const errorData = await response.json();
        const details = errorData.error?.details;
        
        if (Array.isArray(details) && details.length > 0) {
          // Zod validation error
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

      throw new GigServiceError(errorMessage, response.status, errorCode);
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof GigServiceError) {
      throw error;
    }
    throw new GigServiceError(
      `Network request failed: ${error instanceof Error ? error.message : String(error)}`,
      503,
      "NETWORK_ERROR"
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
// GIG SERVICE METHODS
// ============================================================

export const gigService = {
  // ------------------------------------------
  // GIGS
  // ------------------------------------------

  /**
   * Fetch a list of gigs with optional filters
   * GET /api/gigs
   */
  getGigs: async (filters?: GigFilters): Promise<PaginatedGigs> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: Gig[]; next_cursor: string | null }>(
      `/api/gigs${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * Fetch only the current user's gigs (founder)
   * GET /api/gigs/me
   */
  getMyGigs: async (filters?: GigFilters): Promise<PaginatedGigs> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: Gig[]; next_cursor: string | null }>(
      `/api/gigs/me${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * Fetch a single gig by ID
   * GET /api/gigs/:id
   */
  getGig: async (id: string): Promise<Gig> => {
    const response = await fetchWithAuth<{ data: Gig }>(`/api/gigs/${id}`);
    if (!response.data) {
      throw new GigServiceError("Gig not found", 404, "NOT_FOUND");
    }
    return response.data;
  },

  /**
   * Create a new gig
   * POST /api/gigs
   */
  createGig: async (gigData: GigCreateInput): Promise<Gig> => {
    const response = await fetchWithAuth<{ data: Gig }>("/api/gigs", {
      method: "POST",
      body: JSON.stringify(gigData),
    });
    return response.data!;
  },

  /**
   * Update an existing gig
   * PATCH /api/gigs/:id
   */
  updateGig: async (id: string, gigData: GigUpdateInput): Promise<Gig> => {
    const response = await fetchWithAuth<{ data: Gig }>(`/api/gigs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(gigData),
    });
    return response.data!;
  },

  /**
   * Delete a gig
   * DELETE /api/gigs/:id
   */
  deleteGig: async (id: string): Promise<void> => {
    await fetchWithAuth(`/api/gigs/${id}`, {
      method: "DELETE",
    });
  },

  // ------------------------------------------
  // STATS
  // ------------------------------------------

  /**
   * Fetch freelancer dashboard stats
   * GET /api/gigs/stats
   */
  getStats: async (): Promise<FreelancerStats> => {
    try {
      const response = await fetchWithAuth<any>("/api/gigs/stats");
      return {
        earnings_mtd: response.earnings_mtd ?? response.data?.earnings_mtd ?? 0,
        active_projects: response.active_projects ?? response.data?.active_projects ?? 0,
        earnings_growth_pct: response.earnings_growth_pct ?? response.data?.earnings_growth_pct ?? 0,
        total_earnings: response.total_earnings ?? response.data?.total_earnings,
        completed_projects: response.completed_projects ?? response.data?.completed_projects,
        rating: response.rating ?? response.data?.rating,
      };
    } catch (error) {
      // Return safe defaults if endpoint fails
      console.warn("Failed to fetch stats, using defaults:", error);
      return {
        earnings_mtd: 0,
        active_projects: 0,
        earnings_growth_pct: 0,
      };
    }
  },

  // ------------------------------------------
  // PROPOSALS
  // ------------------------------------------

  /**
   * Submit a proposal for a gig
   * POST /api/gigs/:gigId/proposals
   */
  submitProposal: async (gigId: string, data: ProposalCreateInput): Promise<Proposal> => {
    const response = await fetchWithAuth<{ data: Proposal }>(
      `/api/gigs/${gigId}/proposals`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data!;
  },

  /**
   * List proposals for a specific gig (founder/owner view)
   * GET /api/gigs/:gigId/proposals
   */
  getGigProposals: async (gigId: string, filters?: ProposalFilters): Promise<PaginatedProposals> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: Proposal[]; next_cursor: string | null }>(
      `/api/gigs/${gigId}/proposals${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * List current user's own proposals (freelancer view)
   * GET /api/proposals/me
   */
  getMyProposals: async (filters?: ProposalFilters): Promise<PaginatedProposals> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: Proposal[]; next_cursor: string | null }>(
      `/api/proposals/me${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * Accept a proposal (founder action - creates a contract)
   * POST /api/proposals/:proposalId/accept
   * Returns { contract_id: string }
   */
  acceptProposal: async (proposalId: string): Promise<{ contract_id: string }> => {
    const response = await fetchWithAuth<{ data?: { contract_id?: string }; contract_id?: string }>(
      `/api/proposals/${proposalId}/accept`,
      { method: "POST" }
    );
    const contractId = response?.data?.contract_id || response?.contract_id;
    if (!contractId) {
      throw new GigServiceError("Accept succeeded but contract id is missing", 500, "INVALID_RESPONSE");
    }
    return { contract_id: contractId };
  },

  /**
   * Reject a proposal (founder action)
   * POST /api/proposals/:proposalId/reject
   */
  rejectProposal: async (proposalId: string): Promise<void> => {
    await fetchWithAuth(`/api/proposals/${proposalId}/reject`, {
      method: "POST",
    });
  },

  // ------------------------------------------
  // CONTRACTS
  // ------------------------------------------

  /**
   * Fetch contracts for the current user
   * GET /api/contracts
   */
  getContracts: async (filters?: ContractFilters): Promise<PaginatedContracts> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: Contract[]; next_cursor: string | null }>(
      `/api/contracts${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * Fetch a single contract by ID
   * GET /api/contracts/:id
   */
  getContract: async (id: string): Promise<Contract> => {
    const response = await fetchWithAuth<{ data: Contract }>(`/api/contracts/${id}`);
    if (!response.data) {
      throw new GigServiceError("Contract not found", 404, "NOT_FOUND");
    }
    return response.data;
  },

  /**
   * Mark contract as complete (freelancer action)
   * POST /api/contracts/:id/complete
   */
  completeContract: async (id: string): Promise<Contract> => {
    const response = await fetchWithAuth<{ data: Contract }>(
      `/api/contracts/${id}/complete`,
      { method: "POST" }
    );
    return response.data!;
  },

  /**
   * Approve a completed contract (founder action)
   * POST /api/contracts/:id/approve
   */
  approveContract: async (id: string): Promise<Contract> => {
    const response = await fetchWithAuth<{ data: Contract }>(
      `/api/contracts/${id}/approve`,
      { method: "POST" }
    );
    return response.data!;
  },

  // ------------------------------------------
  // MESSAGES
  // ------------------------------------------

  /**
   * Fetch contract messages
   * GET /api/contracts/:contractId/messages
   */
  getContractMessages: async (
    contractId: string,
    params?: MessageListParams
  ): Promise<PaginatedMessages> => {
    const query = buildQueryString(params);
    const response = await fetchWithAuth<{ items: ContractMessage[]; next_cursor: string | null }>(
      `/api/contracts/${contractId}/messages${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  /**
   * Send a contract message
   * POST /api/contracts/:contractId/messages
   */
  sendContractMessage: async (
    contractId: string,
    payload: MessageCreateInput
  ): Promise<ContractMessage> => {
    const response = await fetchWithAuth<{ data: ContractMessage }>(
      `/api/contracts/${contractId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data!;
  },

  /**
   * Mark unread messages as read
   * POST /api/contracts/:contractId/messages/read
   */
  markContractMessagesRead: async (contractId: string): Promise<void> => {
    await fetchWithAuth(`/api/contracts/${contractId}/messages/read`, {
      method: "POST",
    });
  },

  // ------------------------------------------
  // RATINGS
  // ------------------------------------------

  /**
   * Submit a rating for a contract
   * POST /api/contracts/:contractId/rate
   */
  submitRating: async (contractId: string, data: RatingCreateInput): Promise<Rating> => {
    const response = await fetchWithAuth<{ data: Rating }>(
      `/api/contracts/${contractId}/rate`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data!;
  },

  // ------------------------------------------
  // NOTIFICATIONS
  // ------------------------------------------

  /**
   * List user notifications
   * GET /api/notifications
   */
  getNotifications: async (filters?: NotificationFilters): Promise<PaginatedNotifications> => {
    const query = buildQueryString(filters);
    const response = await fetchWithAuth<{ items: Notification[]; next_cursor: string | null }>(
      `/api/notifications${query}`
    );
    return {
      items: response.items || [],
      next_cursor: response.next_cursor ?? null,
    };
  },

  // ------------------------------------------
  // USER PROFILE
  // ------------------------------------------

  /**
   * Get current user's profile
   * GET /api/users/me
   */
  getMyProfile: async (): Promise<UserProfile> => {
    const response = await fetchWithAuth<{ data: UserProfile }>("/api/users/me");
    if (!response.data) {
      throw new GigServiceError("Profile not found", 404, "NOT_FOUND");
    }
    return response.data;
  },

  /**
   * Update/upsert current user's profile
   * PUT /api/users/me
   */
  updateMyProfile: async (data: UserProfileUpsertInput): Promise<UserProfile> => {
    const response = await fetchWithAuth<{ data: UserProfile }>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data!;
  },
};

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default gigService;

// Re-export common domain types for legacy imports that still reference this module.
export type { Gig, ContractMessage };
