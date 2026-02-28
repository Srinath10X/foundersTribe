/**
 * ============================================================
 * FOUNDERS MATCHING HOOKS - TanStack Query hooks
 * ============================================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { FoundersMatchingError } from "@/lib/foundersMatchingService";
import type {
    FounderCandidate,
    SwipePayload,
    SwipeResponse,
} from "@/types/founders";

const STORAGE_BUCKET = "tribe-media";

// ─── Avatar resolver (same pattern as useInfiniteUsers) ─────
async function resolveAvatarUrl(raw: string | null, userId: string): Promise<string | null> {
    if (!raw) {
        // Check profiles/{userId}/ folder directly
        try {
            const folder = `profiles/${userId}`;
            const { data: files } = await supabase.storage
                .from(STORAGE_BUCKET)
                .list(folder, { limit: 5 });

            if (Array.isArray(files) && files.length > 0) {
                const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
                if (preferred?.name) {
                    const { data } = await supabase.storage
                        .from(STORAGE_BUCKET)
                        .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 7);
                    if (data?.signedUrl) return data.signedUrl;
                }
            }
        } catch { /* fall through */ }
        return null;
    }

    // Already a full URL
    if (/^https?:\/\//i.test(raw)) return raw;

    // Storage path → signed URL
    try {
        const { data } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(raw.trim(), 60 * 60 * 24 * 7);
        if (data?.signedUrl) return data.signedUrl;
    } catch { /* fall through */ }

    return null;
}

// ─── Fetch real founders from Supabase ──────────────────────
async function fetchFounderCandidates(currentUserId: string): Promise<FounderCandidate[]> {
    // First try with user_type filter
    let { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, photo_url, avatar_url, bio, role, location, skills, looking_for, user_type, linkedin_url, business_ideas, previous_works")
        .in("user_type", ["founder", "both"])
        .neq("id", currentUserId)
        .order("updated_at", { ascending: false })
        .limit(50);

    // If columns don't exist, fall back to basic columns only
    if (error) {
        console.warn("[founders] full query failed, trying basic columns:", error.message);
        const fallback = await supabase
            .from("profiles")
            .select("id, display_name, username, photo_url, avatar_url, bio")
            .neq("id", currentUserId)
            .order("updated_at", { ascending: false })
            .limit(50);

        if (fallback.error) {
            console.error("[founders] basic query also failed:", fallback.error.message);
            throw fallback.error;
        }
        data = (fallback.data as any[]) ?? [];
        error = null;
    }

    if (!data || data.length === 0) return [];

    // Resolve avatars in parallel
    const candidates: FounderCandidate[] = await Promise.all(
        data.map(async (p: any) => {
            const rawAvatar = p.photo_url || p.avatar_url || null;
            const resolvedAvatar = await resolveAvatarUrl(rawAvatar, p.id);

            // Normalize previous_works — can be JSON string or array
            let previousWorks: any[] = [];
            if (Array.isArray(p.previous_works)) {
                previousWorks = p.previous_works;
            } else if (typeof p.previous_works === "string") {
                try { previousWorks = JSON.parse(p.previous_works); } catch { /* ignore */ }
            }

            // Normalize business_ideas — can be JSON string or array
            let businessIdeas: string[] = [];
            if (Array.isArray(p.business_ideas)) {
                businessIdeas = p.business_ideas.map((b: any) =>
                    typeof b === "string" ? b : b?.idea ?? ""
                ).filter(Boolean);
            } else if (typeof p.business_idea === "string" && p.business_idea.trim()) {
                businessIdeas = [p.business_idea.trim()];
            }

            return {
                id: p.id,
                display_name: p.display_name ?? "Founder",
                username: p.username ?? "",
                avatar_url: resolvedAvatar,
                photo_url: resolvedAvatar,
                bio: p.bio ?? null,
                role: p.role ?? null,
                location: p.location ?? null,
                skills: Array.isArray(p.skills) ? p.skills : [],
                looking_for: p.looking_for ?? null,
                linkedin_url: p.linkedin_url ?? null,
                business_ideas: businessIdeas,
                previous_works: previousWorks,
            } satisfies FounderCandidate;
        })
    );

    return candidates;
}

// ─── Query Keys ─────────────────────────────────────────────
export const foundersKeys = {
    candidates: ["founders", "candidates"] as const,
};

// ─── Hooks ──────────────────────────────────────────────────

/**
 * Fetch founder candidates — real users from Supabase with user_type "founder" or "both".
 */
export function useCandidates(enabled = true) {
    const { session } = useAuth();
    const currentUserId = session?.user?.id ?? "";

    return useQuery<FounderCandidate[], Error>({
        queryKey: [...foundersKeys.candidates, currentUserId],
        queryFn: () => fetchFounderCandidates(currentUserId),
        enabled: enabled && !!currentUserId,
        staleTime: 5 * 60_000, // 5 min
    });
}

/**
 * Perform a swipe action with optimistic removal + rollback.
 */
export function useSwipe() {
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const currentUserId = session?.user?.id ?? "";
    const queryKey = [...foundersKeys.candidates, currentUserId];

    return useMutation<SwipeResponse, FoundersMatchingError, SwipePayload>({
        mutationFn: async (payload) => {
            // Record swipe in Supabase if the table exists; silently skip if not
            try {
                await supabase.from("founder_swipes").insert({
                    swiper_id: currentUserId,
                    swiped_id: payload.swipedUserId,
                    direction: payload.direction,
                });
            } catch { /* table may not exist yet */ }

            // Check for a mutual right-swipe (match)
            if (payload.direction === "right") {
                try {
                    const { data } = await supabase
                        .from("founder_swipes")
                        .select("id")
                        .eq("swiper_id", payload.swipedUserId)
                        .eq("swiped_id", currentUserId)
                        .eq("direction", "right")
                        .limit(1)
                        .single();

                    if (data?.id) {
                        return { matched: true, matchId: data.id };
                    }
                } catch { /* no match */ }
            }

            return { matched: false };
        },

        // No optimistic cache mutation — index is managed locally in the UI
        onError: () => { },
    });
}
