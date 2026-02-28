/**
 * ============================================================
 * FOUNDERS MATCHING SERVICE - API Client
 * ============================================================
 *
 * Consumes the existing founders-matching-service.
 * Follows the same pattern as gigService.ts.
 *
 * Backend endpoints:
 *   GET  /api/founders/candidates
 *   POST /api/founders/swipe
 * ============================================================
 */

import { supabase } from "./supabase";
import type {
    FounderCandidate,
    SwipePayload,
    SwipeResponse,
} from "@/types/founders";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL = process.env.EXPO_PUBLIC_FOUNDERS_MATCHING_URL;

if (!API_BASE_URL) {
    console.warn(
        "EXPO_PUBLIC_FOUNDERS_MATCHING_URL is not set. Founders matching will fail."
    );
}

// ============================================================
// ERROR HANDLING
// ============================================================

export class FoundersMatchingError extends Error {
    constructor(
        public message: string,
        public status?: number,
        public code?: string
    ) {
        super(message);
        this.name = "FoundersMatchingError";
    }
}

// ============================================================
// AUTH HELPER
// ============================================================

async function getAuthToken(): Promise<string> {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();
    if (error || !session) {
        throw new FoundersMatchingError(
            "Not authenticated",
            401,
            "UNAUTHENTICATED"
        );
    }
    return session.access_token;
}

// ============================================================
// FETCH WRAPPER
// ============================================================

async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    if (!API_BASE_URL) {
        throw new FoundersMatchingError(
            "Founders matching URL is not configured",
            500,
            "CONFIG_ERROR"
        );
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
                errorMessage =
                    errorData.error?.message || errorData.message || errorMessage;
                errorCode = errorData.error?.code || errorData.code || errorCode;
            } catch {
                // not JSON
            }

            throw new FoundersMatchingError(errorMessage, response.status, errorCode);
        }

        const contentType = response.headers.get("content-type");
        if (
            response.status === 204 ||
            !contentType ||
            !contentType.includes("application/json")
        ) {
            return {} as T;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof FoundersMatchingError) throw error;
        throw new FoundersMatchingError(
            `Network request failed: ${error instanceof Error ? error.message : String(error)}`,
            503,
            "NETWORK_ERROR"
        );
    }
}

// ============================================================
// SERVICE METHODS
// ============================================================

export const foundersMatchingService = {
    /**
     * Fetch next candidate. We wrap it in an array to match the UI expectation.
     * GET /api/swipes/next
     */
    getCandidates: async (): Promise<FounderCandidate[]> => {
        try {
            const response = await fetchWithAuth<{
                data: any;
            }>("/api/swipes/next");

            // Backend returns a single candidate or null
            if (response.data && response.data.userId) {
                const c = response.data;
                let profileInfo: any = {};

                // The API doesn't return basic profile info, fetch from supabase
                try {
                    const { data } = await supabase
                        .from('profiles')
                        .select('display_name, username, avatar_url, photo_url, location, looking_for, bio')
                        .eq('id', c.userId)
                        .single();
                    if (data) {
                        profileInfo = data;
                    }
                } catch (e) {
                    console.warn(`Failed to fetch profile info for ${c.userId}`, e);
                }

                // Map the backend candidate model to the UI FounderCandidate model
                const candidate: FounderCandidate = {
                    id: c.userId,
                    display_name: profileInfo.display_name || "Founder",
                    username: profileInfo.username || "",
                    avatar_url: profileInfo.avatar_url || null,
                    photo_url: profileInfo.photo_url || null,
                    bio: c.pitch || profileInfo.bio || null,
                    role: c.role || null,
                    location: profileInfo.location || null,
                    skills: c.topSkills || [],
                    looking_for: profileInfo.looking_for || null,
                };
                return [candidate];
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch next candidate from API:", error);
            throw error;
        }
    },

    /**
     * Record a swipe.
     * POST /api/swipes
     */
    swipe: async (payload: SwipePayload): Promise<SwipeResponse> => {
        // Map frontend payload to backend expected format
        const body = {
            targetUserId: payload.swipedUserId,
            // Map "right" to "interested" and "left" to "pass"
            type: payload.direction === "right" ? "interested" : "pass"
        };

        const response = await fetchWithAuth<any>("/api/swipes", {
            method: "POST",
            body: JSON.stringify(body),
        });

        // Backend returns `{ swipe: {...}, match: {...} | null }` inside data
        const matchData = response.data?.match;
        return {
            matched: !!matchData,
            matchId: matchData?.id
        };
    },
};

export default foundersMatchingService;
