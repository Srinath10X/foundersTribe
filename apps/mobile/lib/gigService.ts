import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_GIG_SERVICE_URL;

export interface GigFounder {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    handle: string | null;
}

export interface GigTag {
    tag_id: string;
    tags: { id: string; slug: string; label: string };
}

export interface Gig {
    id: string;
    founder_id: string;
    title: string;
    description: string;
    budget_type: "fixed" | "hourly";
    budget_min: number;
    budget_max: number;
    experience_level: "junior" | "mid" | "senior";
    startup_stage?: "idea" | "mvp" | "revenue" | "funded";
    is_remote: boolean;
    location_text?: string;
    status: "draft" | "open" | "in_progress" | "completed" | "cancelled";
    proposals_count: number;
    published_at?: string;
    created_at: string;
    updated_at: string;
    // Joined fields from GET /gigs/:id
    founder?: GigFounder;
    gig_tags?: GigTag[];
    // Legacy / UI convenience
    budget?: number;
    deadline?: string;
    progress?: number;
}

export interface FreelancerStats {
    earnings_mtd: number;
    active_projects: number;
    earnings_growth_pct?: number;
}

export interface Contract {
    id: string;
    gig_id: string;
    proposal_id: string;
    founder_id: string;
    freelancer_id: string;
    status: "active" | "completed" | "cancelled" | "disputed";
    freelancer_marked_complete: boolean;
    founder_approved: boolean;
    started_at: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ContractMessage {
    id: string;
    contract_id: string;
    sender_id: string;
    recipient_id: string | null;
    message_type: "text" | "file" | "system";
    body: string | null;
    file_url: string | null;
    metadata: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
    updated_at?: string;
}

export interface GigFilters {
    status?: "draft" | "open" | "in_progress" | "completed" | "cancelled";
    budget_type?: "fixed" | "hourly";
    experience_level?: "junior" | "mid" | "senior";
    startup_stage?: "idea" | "mvp" | "revenue" | "funded";
    tag?: string;
    budget_min?: string;
    budget_max?: string;
    limit?: number;
    cursor?: string;
}

export interface PaginatedGigs {
    items: Gig[];
    next_cursor: string | null;
}

export interface ContractFilters {
    status?: "active" | "completed" | "cancelled" | "disputed";
    limit?: number;
    cursor?: string;
}

export interface MessageListParams {
    limit?: number;
    cursor?: string;
}

class GigServiceError extends Error {
    constructor(public message: string, public status?: number) {
        super(message);
        this.name = 'GigServiceError';
    }
}

/**
 * Helper to get the auth token from Supabase session
 */
async function getAuthToken(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        throw new GigServiceError("Not authenticated", 401);
    }
    return session.access_token;
}

/**
 * Standardized fetch wrapper with auth header and error handling
 */
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!API_BASE_URL) {
        throw new GigServiceError("Gig service URL is not configured", 500);
    }

    const token = await getAuthToken();

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let errorMessage = `API Error: ${response.statusText}`;
            try {
                const errorData = await response.json();
                const details = errorData.error?.details;
                if (Array.isArray(details) && details.length > 0) {
                    // Zod validation error — show the first field error
                    const firstError = details[0];
                    const field = firstError?.path?.join(".") || "field";
                    errorMessage = `${firstError?.message || "Validation failed"} (${field})`;
                } else {
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                }
            } catch (e) {
                // Response is not JSON
            }
            throw new GigServiceError(errorMessage, response.status);
        }

        // Check if response has content before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }

        return {} as T;
    } catch (error) {
        if (error instanceof GigServiceError) {
            throw error;
        }
        throw new GigServiceError(`Network request failed: ${error instanceof Error ? error.message : String(error)}`, 503);
    }
}

// --- LOCAL DUMMY STATE ---
let dummyGigs: Gig[] = [];

export const gigService = {
    /**
     * Fetch freelancer dashboard stats
     */
    getStats: async (): Promise<FreelancerStats> => {
        try {
            // In a real implementation this would call an endpoint like /api/freelancer/stats
            // If endpoint doesn't exist yet, we can mock it based on their actual gigs
            const stats = await fetchWithAuth<any>("/api/gigs/stats");
            return {
                earnings_mtd: stats.earnings_mtd || stats.data?.earnings_mtd || 0,
                active_projects: stats.active_projects || stats.data?.active_projects || 0,
                earnings_growth_pct: stats.earnings_growth_pct || stats.data?.earnings_growth_pct || 0,
            };
        } catch (error) {
            console.error("Failed to fetch gig stats. Using fallback/mock.", error);
            // Fallback for development if endpoint is missing to prevent breaking UI
            return {
                earnings_mtd: 8450,
                active_projects: 4,
                earnings_growth_pct: 12,
            };
        }
    },

    /**
     * Fetch a list of gigs with optional filters
     */
    getGigs: async (filters?: GigFilters): Promise<PaginatedGigs> => {
        // Dummy implementation
        let items = [...dummyGigs];
        if (filters?.status) items = items.filter(g => g.status === filters.status);
        if (filters?.experience_level) items = items.filter(g => g.experience_level === filters.experience_level);
        return { items, next_cursor: null };
    },

    /**
     * Fetch only the current user's gigs (calls /api/gigs/me)
     */
    getMyGigs: async (filters?: GigFilters): Promise<PaginatedGigs> => {
        let items = [...dummyGigs];
        if (filters?.status) items = items.filter(g => g.status === filters.status);
        // sort by newest
        items = items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { items, next_cursor: null };
    },

    /**
     * Fetch a single gig by ID
     */
    getGig: async (id: string): Promise<Gig> => {
        const gig = dummyGigs.find(g => g.id === id);
        if (!gig) throw new Error("Gig not found");
        return gig;
    },

    /**
     * Create a new gig
     */
    createGig: async (gigData: Partial<Gig>): Promise<Gig> => {
        const newGig: Gig = {
            id: Math.random().toString(36).substring(7),
            founder_id: "dummy-user",
            ...gigData,
            proposals_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as Gig;
        dummyGigs.push(newGig);
        return newGig;
    },

    /**
     * Update an existing gig
     */
    updateGig: async (id: string, gigData: Partial<Gig>): Promise<Gig> => {
        const idx = dummyGigs.findIndex(g => g.id === id);
        if (idx === -1) throw new Error("Gig not found");
        dummyGigs[idx] = { ...dummyGigs[idx], ...gigData, updated_at: new Date().toISOString() };
        return dummyGigs[idx];
    },

    /**
     * Delete a gig
     */
    deleteGig: async (id: string): Promise<void> => {
        await fetchWithAuth<void>(`/api/gigs/${id}`, {
            method: "DELETE",
        });
    },

    /**
     * Fetch contracts for the current authenticated user.
     */
    getContracts: async (filters?: ContractFilters): Promise<{ items: Contract[]; next_cursor: string | null }> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append("status", filters.status);
        if (filters?.limit) params.append("limit", filters.limit.toString());
        if (filters?.cursor) params.append("cursor", filters.cursor);
        const query = params.toString();

        const response = await fetchWithAuth<any>(`/api/contracts${query ? `?${query}` : ""}`);
        return {
            items: response.items || response.data || [],
            next_cursor: response.next_cursor ?? null,
        };
    },

    /**
     * Fetch contract messages.
     */
    getContractMessages: async (
        contractId: string,
        params?: MessageListParams,
    ): Promise<{ items: ContractMessage[]; next_cursor: string | null }> => {
        const q = new URLSearchParams();
        if (params?.limit) q.append("limit", params.limit.toString());
        if (params?.cursor) q.append("cursor", params.cursor);
        const query = q.toString();

        const response = await fetchWithAuth<any>(
            `/api/contracts/${contractId}/messages${query ? `?${query}` : ""}`,
        );

        return {
            items: response.items || response.data || [],
            next_cursor: response.next_cursor ?? null,
        };
    },

    /**
     * Send a contract message.
     */
    sendContractMessage: async (
        contractId: string,
        payload: {
            recipient_id?: string;
            message_type: "text" | "file" | "system";
            body?: string;
            file_url?: string;
            metadata?: Record<string, unknown>;
        },
    ): Promise<ContractMessage> => {
        const response = await fetchWithAuth<any>(`/api/contracts/${contractId}/messages`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        return response.data || response;
    },

    /**
     * Mark unread messages as read for a contract.
     */
    markContractMessagesRead: async (contractId: string): Promise<void> => {
        await fetchWithAuth(`/api/contracts/${contractId}/messages/read`, {
            method: "POST",
        });
    },
};
