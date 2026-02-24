import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_GIG_SERVICE_URL;

export interface Gig {
    id: string;
    title: string;
    description: string;
    budget: number;
    budget_type?: "fixed" | "hourly";
    budget_min?: number;
    budget_max?: number;
    experience_level?: "junior" | "mid" | "senior";
    startup_stage?: "idea" | "mvp" | "revenue" | "funded";
    is_remote?: boolean;
    location_text?: string;
    deadline?: string;
    status: "draft" | "open" | "in_progress" | "completed" | "cancelled";
    client_id?: string;
    freelancer_id?: string;
    created_at: string;
    updated_at: string;
    // Additional fields for UI display
    client_name?: string;
    client_company?: string;
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

export interface FreelancerDashboardData {
    stats: FreelancerStats;
    activeJobs: Gig[];
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
    freelancer_id?: string;
    client_id?: string;
    limit?: number;
    offset?: number;
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
                errorMessage = errorData.error?.message || errorData.message || errorMessage;
                if (errorData.error?.details) {
                    errorMessage += ` - ${JSON.stringify(errorData.error.details)}`;
                }
            } catch {
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

export const gigService = {
    /**
     * Fetch freelancer dashboard stats
     */
    getStats: async (): Promise<FreelancerStats> => {
        const stats = await fetchWithAuth<any>("/api/gigs/stats");
        return {
            earnings_mtd: stats.earnings_mtd || stats.data?.earnings_mtd || 0,
            active_projects: stats.active_projects || stats.data?.active_projects || 0,
            earnings_growth_pct: stats.earnings_growth_pct || stats.data?.earnings_growth_pct || 0,
        };
    },

    /**
     * Fetch a list of gigs with optional filters
     */
    getGigs: async (filters?: GigFilters): Promise<Gig[]> => {
        let url = "/api/gigs";
        if (filters) {
            const params = new URLSearchParams();
            if (filters.status) params.append("status", filters.status);
            if (filters.freelancer_id) params.append("freelancer_id", filters.freelancer_id);
            if (filters.client_id) params.append("client_id", filters.client_id);
            if (filters.limit) params.append("limit", filters.limit.toString());
            if (filters.offset) params.append("offset", filters.offset.toString());

            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;
        }

        const response = await fetchWithAuth<any>(url);
        return response.items || response.data || response || [];
    },

    /**
     * Fetch a single gig by ID
     */
    getGig: async (id: string): Promise<Gig> => {
        const response = await fetchWithAuth<any>(`/api/gigs/${id}`);
        return response.data || response;
    },

    /**
     * Create a new gig
     */
    createGig: async (gigData: Partial<Gig>): Promise<Gig> => {
        const response = await fetchWithAuth<any>("/api/gigs", {
            method: "POST",
            body: JSON.stringify(gigData),
        });
        return response.data || response;
    },

    /**
     * Update an existing gig
     */
    updateGig: async (id: string, gigData: Partial<Gig>): Promise<Gig> => {
        const response = await fetchWithAuth<any>(`/api/gigs/${id}`, {
            method: "PATCH",
            body: JSON.stringify(gigData),
        });
        return response.data || response;
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

    /**
     * Freelancer dashboard payload:
     * - stats from /api/gigs/stats
     * - active jobs from /api/contracts?status=active plus /api/gigs/:id
     */
    getFreelancerDashboardData: async (limit = 3): Promise<FreelancerDashboardData> => {
        const [statsResult, contractsResult] = await Promise.allSettled([
            gigService.getStats(),
            gigService.getContracts({ status: "active", limit }),
        ]);

        const stats: FreelancerStats =
            statsResult.status === "fulfilled"
                ? statsResult.value
                : { earnings_mtd: 0, active_projects: 0, earnings_growth_pct: 0 };

        const contracts =
            contractsResult.status === "fulfilled"
                ? contractsResult.value.items || []
                : [];

        const gigIds = Array.from(
            new Set(
                contracts
                    .map((c: any) => c.gig_id)
                    .filter((id: unknown) => typeof id === "string" && !!id),
            ),
        );

        const gigDetailResults = await Promise.all(
            gigIds.map(async (gigId) => {
                try {
                    return await gigService.getGig(gigId);
                } catch {
                    return null;
                }
            }),
        );

        const gigMap = new Map<string, Gig>();
        gigDetailResults.filter(Boolean).forEach((gig) => {
            if (gig?.id) gigMap.set(gig.id, gig);
        });

        const activeJobs: Gig[] = contracts
            .map((contract: any) => {
                const gig = gigMap.get(contract.gig_id);
                if (!gig) return null;

                const progress =
                    contract.status === "completed"
                        ? 100
                        : contract.freelancer_marked_complete
                            ? 90
                            : 55;

                return {
                    ...gig,
                    status: gig.status || "in_progress",
                    progress,
                };
            })
            .filter(Boolean) as Gig[];

        return { stats, activeJobs };
    },
};
