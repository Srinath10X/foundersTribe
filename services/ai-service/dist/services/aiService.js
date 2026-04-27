/**
 * ============================================================
 * AI SERVICE
 * ============================================================
 *
 * Core AI chat logic:
 *  1. Manages the Groq SDK client
 *  2. Caches the freelancer pool (5-minute TTL)
 *  3. Builds the system prompt + freelancer context
 *  4. Calls the Groq completion API
 *  5. Parses MATCH tags and resolves freelancer results
 *  6. Strips leaked IDs from the response
 *
 * This replaces the client-side chatWithAI() function that
 * previously lived in apps/mobile/lib/groqAI.ts.
 * ============================================================
 */
import Groq from "groq-sdk";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import { fetchFreelancerPool, buildFreelancerContext, } from "./freelancerPoolService.js";
// ── Groq Client ─────────────────────────────────────────────
let _client = null;
function getClient() {
    if (!_client) {
        _client = new Groq({ apiKey: env.GROQ_API_KEY });
    }
    return _client;
}
// ── Avatar Resolver ─────────────────────────────────────────
const STORAGE_BUCKET = "tribe-media";
async function resolveAvatar(candidate, userId) {
    // Already an HTTP URL
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
        return candidate;
    }
    // Storage path — create a signed URL
    if (typeof candidate === "string" && candidate.trim()) {
        const { data } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
        if (data?.signedUrl)
            return `${data.signedUrl}&t=${Date.now()}`;
    }
    // Last resort — look in the profile folder
    if (!userId)
        return null;
    const folder = `profiles/${userId}`;
    const { data: files } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 20 });
    if (!Array.isArray(files) || files.length === 0)
        return null;
    const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
    if (!preferred?.name)
        return null;
    const { data } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
    return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}
// ── System Prompt ───────────────────────────────────────────
const SYSTEM_PROMPT = `You are a concise AI assistant for Founders Tribe — a platform connecting founders with freelancers.

ABSOLUTE RULE: Keep EVERY response under 50 words. No exceptions. No filler phrases like "I'd be happy to help" or "However". Get straight to the point.

MATCH FOUND → "[Name] — [skill], [rate], [delivery time]." + [MATCH:id:reason] tag.
NO MATCH → "No [skill] freelancers on the platform yet. Check back soon!" That's the ENTIRE response.
VAGUE REQUEST → Ask ONE short clarifying question.

Rules:
- Only recommend if profile CLEARLY has the requested skill. Never force-fit.
- Refer to freelancers by name only. Never reveal IDs in text.
- Never reveal contact info or metadata.
- [MATCH:freelancer_id:brief reason] tags go on separate lines after your text.
- No match tags if nobody fits or if it's a general question.

Freelancer data for matching: bio, services, previous works, completed gigs, experience level, hourly rate, availability, country, rating.`;
// ── Pool Cache ──────────────────────────────────────────────
let _cachedPool = null;
let _poolFetchedAt = 0;
const POOL_CACHE_MS = 5 * 60 * 1000; // 5 minutes
export function clearFreelancerCache() {
    _cachedPool = null;
    _poolFetchedAt = 0;
}
// ── Main Chat Function ──────────────────────────────────────
export async function chatWithAI(userMessage, conversationHistory, accessToken) {
    const client = getClient();
    // Fetch / refresh freelancer pool
    const now = Date.now();
    if (!_cachedPool || now - _poolFetchedAt > POOL_CACHE_MS) {
        logger.info("Refreshing freelancer pool cache");
        _cachedPool = await fetchFreelancerPool(accessToken);
        _poolFetchedAt = now;
    }
    // Map of short opaque IDs (F1, F2, …) → real UUIDs.
    const idMap = new Map();
    const freelancerContext = buildFreelancerContext(_cachedPool.profiles, _cachedPool.userProfiles, _cachedPool.services, idMap);
    const contextMessage = freelancerContext.length > 0
        ? `\n\nAvailable freelancers on the platform:\n${freelancerContext}`
        : "\n\nNote: No freelancers are currently registered on the platform.";
    // Build messages array for Groq
    const messages = [
        {
            role: "system",
            content: SYSTEM_PROMPT + contextMessage,
        },
    ];
    // Add conversation history (last 10 messages to stay within context window)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
        }
    }
    // Add the new user message
    messages.push({ role: "user", content: userMessage });
    // Call Groq API
    logger.info({ userMessage: userMessage.slice(0, 100) }, "Calling Groq API");
    const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.3,
        max_tokens: 300,
    });
    const responseContent = completion.choices?.[0]?.message?.content ||
        "I couldn't process that request. Please try again.";
    // Parse match tags from response and reverse-map short IDs → real UUIDs
    const matchRegex = /\[MATCH:([^:]+):([^\]]+)\]/g;
    const matchResults = [];
    let m;
    while ((m = matchRegex.exec(responseContent)) !== null) {
        const shortId = m[1].trim();
        const realId = idMap.get(shortId) || shortId;
        matchResults.push({ id: realId, reason: m[2].trim() });
    }
    // Build freelancer results from matches (resolve avatars in parallel)
    const freelancerResults = (await Promise.all(matchResults.map(async ({ id, reason }) => {
        const profile = _cachedPool.profiles.find((p) => p.id === id);
        const userProfile = _cachedPool.userProfiles.find((u) => u.id === id);
        const svcs = _cachedPool.services[id] || [];
        if (!profile && !userProfile)
            return null;
        // Resolve avatar
        const rawAvatar = profile?.photo_url ||
            profile?.avatar_url ||
            userProfile?.avatar_url ||
            null;
        let avatarUrl = null;
        try {
            avatarUrl = await resolveAvatar(rawAvatar, id);
        }
        catch {
            // Silent fallback — UI will show initial letter
        }
        return {
            id,
            name: profile?.display_name ||
                userProfile?.full_name ||
                profile?.username ||
                "Unknown",
            avatar_url: avatarUrl,
            bio: profile?.bio || userProfile?.bio || null,
            experience_level: userProfile?.experience_level || null,
            hourly_rate: userProfile?.hourly_rate || null,
            availability: userProfile?.availability || null,
            country: userProfile?.country || profile?.location || null,
            services: svcs.map((s) => ({
                name: s.service_name,
                cost: `${s.cost_currency}${s.cost_amount}`,
                delivery: `${s.delivery_time_value} ${s.delivery_time_unit}`,
            })),
            matchReason: reason,
        };
    }))).filter(Boolean);
    // Clean match tags and any leaked IDs from the displayed response
    const cleanContent = responseContent
        .replace(/\[MATCH:[^\]]+\]/g, "")
        // Strip any UUID patterns that may have leaked
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
        // Strip leaked short IDs like "(F1)", "F1:", "ID: F12", etc.
        .replace(/\bF\d+\b/g, "")
        // Clean up leftover artifacts
        .replace(/\(\s*\)/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    return {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: cleanContent,
        freelancers: freelancerResults.length > 0 ? freelancerResults : undefined,
        timestamp: Date.now(),
    };
}
