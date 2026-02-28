/**
 * ============================================================
 * FOUNDERS MATCHING HOOKS - TanStack Query hooks
 * ============================================================
 */

import { useQuery, useMutation } from "@tanstack/react-query";
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

function asString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function toTitleCase(value: string): string {
    return value
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function normalizeRole(rawRole: unknown, rawUserType: unknown): string | null {
    const role = asString(rawRole);
    if (role) return role;

    const userType = asString(rawUserType)?.toLowerCase();
    if (userType === "both") return "Founder & Freelancer";
    if (userType === "founder") return "Founder";
    if (userType === "freelancer") return "Freelancer";
    return null;
}

function normalizeSkills(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw
            .map((item) => asString(item))
            .filter((item): item is string => Boolean(item));
    }
    if (typeof raw === "string") {
        return raw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

function normalizeBusinessIdeas(rawIdeas: unknown, rawIdea: unknown): string[] {
    if (Array.isArray(rawIdeas)) {
        const ideas = rawIdeas
            .map((item) => {
                if (typeof item === "string") return item.trim();
                if (item && typeof item === "object" && "idea" in item) {
                    return asString((item as { idea?: unknown }).idea) ?? "";
                }
                return "";
            })
            .filter(Boolean);
        if (ideas.length > 0) return ideas;
    }

    const singleIdea = asString(rawIdea);
    return singleIdea ? [singleIdea] : [];
}

function normalizePreviousWorks(raw: unknown): any[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

// ─── Fetch real founders from Supabase ──────────────────────
async function fetchFounderCandidates(currentUserId: string): Promise<FounderCandidate[]> {
    // Pull full profile shape so card can render richer backend details.
    let { data, error } = await supabase
        .from("profiles")
        .select("*")
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

    // Prefer founder-side candidates if user_type/role is present.
    const founderOnly = (data as any[]).filter((p: any) => {
        const raw = asString(p.user_type)?.toLowerCase() || asString(p.role)?.toLowerCase();
        if (!raw) return true;
        return raw.includes("founder") || raw === "both";
    });
    const sourceRows = founderOnly.length > 0 ? founderOnly : (data as any[]);

    // Resolve avatars in parallel
    const candidates: FounderCandidate[] = await Promise.all(
        sourceRows.map(async (p: any) => {
            const rawAvatar = p.photo_url || p.avatar_url || null;
            const resolvedAvatar = await resolveAvatarUrl(rawAvatar, p.id);
            const businessIdeas = normalizeBusinessIdeas(p.business_ideas, p.business_idea);

            const location = asString(p.location)
                || [asString(p.city), asString(p.state), asString(p.country)].filter(Boolean).join(", ")
                || null;

            const displayName = asString(p.display_name)
                || [asString(p.first_name), asString(p.last_name)].filter(Boolean).join(" ")
                || "Founder";

            return {
                id: p.id,
                display_name: displayName,
                username: asString(p.username) ?? "",
                avatar_url: resolvedAvatar,
                photo_url: resolvedAvatar,
                bio: asString(p.bio),
                role: normalizeRole(p.role, p.user_type),
                user_type: (asString(p.user_type)?.toLowerCase() as FounderCandidate["user_type"]) ?? null,
                location,
                country: asString(p.country),
                timezone: asString(p.timezone),
                startup_stage: asString(p.startup_stage) ? toTitleCase(String(p.startup_stage)) : null,
                experience_level: asString(p.experience_level)
                    ? toTitleCase(String(p.experience_level))
                    : null,
                skills: normalizeSkills(p.skills),
                looking_for: asString(p.looking_for) || businessIdeas[0] || null,
                linkedin_url: asString(p.linkedin_url),
                portfolio_url: asString(p.portfolio_url),
                business_ideas: businessIdeas,
                previous_works: normalizePreviousWorks(p.previous_works),
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
    const { session } = useAuth();
    const currentUserId = session?.user?.id ?? "";

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
