/**
 * Founder Match Service API Client
 * Typed fetch wrapper for founder-match-service endpoints.
 *
 * Backend response shapes:
 *   Success  → { data: T }
 *   Fail     → { status: "fail", message: "...", errors: [...] }
 *   Error    → { status: "error", message: "..." }
 */

const BASE_URL =
    process.env.EXPO_PUBLIC_FOUNDER_MATCH_API_URL || "http://192.168.1.4:3004";

/* ------------------------------------------------------------------ */
/*  Generic request helper                                            */
/* ------------------------------------------------------------------ */

type RequestOptions = {
    method?: string;
    body?: any;
    token?: string;
};

async function request<T = any>(
    path: string,
    opts: RequestOptions = {},
): Promise<T> {
    const { method = "GET", body, token } = opts;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${BASE_URL}${path}`;
    console.log(`[founderMatchApi] ${method} ${url}`);

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // 204 No Content
    if (res.status === 204) return null as T;

    const json = await res.json();

    if (!res.ok) {
        const msg =
            json?.error?.message || json?.message || `API error ${res.status}`;
        const zodErrors = json?.errors
            ? ` → ${json.errors.map((e: any) => `${e.path?.join(".")}: ${e.message}`).join(", ")}`
            : "";
        throw new Error(msg + zodErrors);
    }

    return json.data ?? json;
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type FounderRole = "tech" | "business" | "design" | "growth";
export type LookingFor = "tech" | "business" | "either";
export type FounderStage = "idea" | "mvp" | "revenue";
export type Commitment = "full_time" | "part_time" | "exploring";
export type SwipeType = "pass" | "interested" | "super";

export interface FounderProfilePayload {
    role: FounderRole;
    looking_for: LookingFor;
    stage: FounderStage;
    commitment: Commitment;
    industry_tags: string[];
    skills: string[];
    pitch_short: string;
    location?: string;
    projects_built?: number;
    verified?: boolean;
}

export interface CandidateProfile {
    userId: string;
    role: FounderRole;
    stage: FounderStage;
    commitment: Commitment;
    industryTags: string[];
    pitch: string;
    lastActiveAt: string;
    profileCompletionPct: number;
    verified: boolean;
    projectsBuilt: number;
    topSkills: string[];
    compatibility: number;
    compatibilityBreakdown: {
        roleComplement: number;
        industryOverlap: number;
        commitmentAlignment: number;
        stageAlignment: number;
        skillComplement: number;
    };
}

export interface MatchItem {
    matchId: string;
    otherUserId: string;
    compatibility: number;
    compatibilityBreakdown: any;
    status: string;
    lastMessageAt: string | null;
    timeAgo: string;
    role: FounderRole;
    stage: FounderStage;
    commitment: Commitment;
    industryTags: string[];
    pitch: string;
    lastActiveAt: string;
    topSkills: string[];
}

export interface SwipeResult {
    swipe: any;
    match: {
        id: string;
        compatibility_score: number;
    } | null;
}

/* ------------------------------------------------------------------ */
/*  Founder Profile                                                   */
/* ------------------------------------------------------------------ */

/** Create or update the authenticated user's founder profile */
export const upsertFounderProfile = (
    token: string,
    body: FounderProfilePayload,
) => request<any>("/api/founders/me/profile", { method: "POST", body, token });

/** Get another founder's public profile (with optional compatibility) */
export const getPublicProfile = (
    token: string,
    userId: string,
    includeCompatibility = true,
) =>
    request<any>(
        `/api/founders/${userId}/public-profile?includeCompatibility=${includeCompatibility}`,
        { token },
    );

/* ------------------------------------------------------------------ */
/*  Swipe Engine                                                      */
/* ------------------------------------------------------------------ */

/** Fetch the next swipe candidate */
export const getNextCandidate = (
    token: string,
    filters?: {
        role?: FounderRole;
        stage?: FounderStage;
        commitment?: Commitment;
        industry?: string;
    },
) => {
    const params = new URLSearchParams();
    if (filters?.role) params.set("role", filters.role);
    if (filters?.stage) params.set("stage", filters.stage);
    if (filters?.commitment) params.set("commitment", filters.commitment);
    if (filters?.industry) params.set("industry", filters.industry);
    const qs = params.toString();
    return request<CandidateProfile>(
        `/api/swipes/next${qs ? `?${qs}` : ""}`,
        { token },
    );
};

/** Record a swipe action */
export const recordSwipe = (
    token: string,
    targetUserId: string,
    type: SwipeType,
) =>
    request<SwipeResult>("/api/swipes", {
        method: "POST",
        body: { targetUserId, type },
        token,
    });

/* ------------------------------------------------------------------ */
/*  Matches                                                           */
/* ------------------------------------------------------------------ */

/** List active matches */
export const getMatches = (
    token: string,
    sort: "recent" | "compatibility" | "activity" = "recent",
    cursor?: string,
    limit = 20,
) => {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request<MatchItem[]>(`/api/matches?${params.toString()}`, { token });
};

/** Unmatch from a match */
export const unmatch = (token: string, matchId: string) =>
    request<any>(`/api/matches/${matchId}/unmatch`, { method: "POST", token });

/* ------------------------------------------------------------------ */
/*  Moderation                                                        */
/* ------------------------------------------------------------------ */

export const blockUser = (
    token: string,
    blockedId: string,
    reason?: string,
) =>
    request<any>("/api/moderation/block", {
        method: "POST",
        body: { blockedId, reason },
        token,
    });

export const reportUser = (
    token: string,
    reportedId: string,
    reason: string,
    matchId?: string,
) =>
    request<any>("/api/moderation/report", {
        method: "POST",
        body: { reportedId, reason, matchId },
        token,
    });
