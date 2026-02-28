/**
 * ============================================================
 * FOUNDERS MATCHING - Type definitions
 * ============================================================
 */

export interface FounderCandidate {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    photo_url: string | null;
    bio: string | null;
    role: string | null;
    user_type: "founder" | "freelancer" | "both" | null;
    location: string | null;
    country: string | null;
    timezone: string | null;
    startup_stage: string | null;
    experience_level: string | null;
    skills: string[];
    looking_for: string | null;
    // Extended fields
    linkedin_url: string | null;
    portfolio_url: string | null;
    business_ideas: string[];
    previous_works: PreviousWork[];
}

export interface PreviousWork {
    company: string;
    role: string;
    duration?: string;
    description?: string;
}

export type SwipeDirection = "right" | "left";

export interface SwipePayload {
    swipedUserId: string;
    direction: SwipeDirection;
}

export interface SwipeResponse {
    matched: boolean;
    matchId?: string;
}

export interface MatchInfo {
    matchId: string | null;
    matchedUser: FounderCandidate;
}
