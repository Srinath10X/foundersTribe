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
import {
  fetchFreelancerPool,
  buildFreelancerContext,
  type FreelancerPool,
} from "./freelancerPoolService.js";
import type { ChatMessage, FreelancerResult } from "../types/ai.js";

// ── Groq Client ─────────────────────────────────────────────

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return _client;
}

// ── Avatar Resolver ─────────────────────────────────────────

const STORAGE_BUCKET = "tribe-media";

async function resolveAvatar(
  candidate: unknown,
  userId: string,
): Promise<string | null> {
  // Already an HTTP URL
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  // Storage path — create a signed URL
  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }

  // Last resort — look in the profile folder
  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant for Founders Tribe, a platform connecting founders with freelancers.

### SAFETY & PRIVACY RULES:
1. NEVER reveal any IDs (such as F1, F2, UUIDs, or any identifier) in your conversational text. IDs are strictly internal — only use them inside [MATCH:…] tags.
2. Always refer to freelancers by their NAME, never by their ID.
3. NEVER reveal private contact information (email, phone, exact social links) in your text.
4. NEVER mention internal database fields or technical metadata.
5. Keep responses professional, encouraging, and under 3 paragraphs.

Your job is to help founders find the right freelancer for their needs. You analyze the founder's request and match it against the available freelancer pool.

IMPORTANT: Each freelancer profile may include rich data — use ALL of it for matching:
- **Bio**: What they do and their expertise
- **Services**: Specific services they offer with pricing and delivery times
- **Previous Works & Completed Gigs**: Past projects demonstrating relevant experience
- **Experience Level**: junior, mid, senior, expert
- **Hourly Rate**: Their pricing
- **Availability**: Whether they are open for new work
- **Location/Country**: Where they are based (relevant for timezone alignment)
- **Rating**: Quality score from past clients
- **LinkedIn/Portfolio**: Professional presence
- **Domain/Ideas**: Areas of interest or specialization
- **Social Links**: Additional online presence

### STRICT MATCHING RULES (CRITICAL — FOLLOW EXACTLY):
1. ONLY recommend a freelancer if their profile **clearly and directly demonstrates** relevant skills, services, or experience for the user's request.
2. A freelancer's bio, services, previous works, or completed gigs MUST contain concrete evidence of the requested skill. Do NOT infer or assume skills that are not explicitly stated.
3. If a user asks for "reel editor" or "video editor", the freelancer MUST have video editing, reel creation, motion graphics, or similar explicitly listed in their services, bio, or previous works. Do NOT recommend a graphic designer, web developer, or other unrelated professional just because they exist in the pool.
4. If NO freelancer in the pool genuinely matches the user's request, say so honestly. Tell the user: "I couldn't find any freelancers on the platform with that specific skill set right now. You might want to check back later as new freelancers join regularly." Do NOT force-fit unrelated freelancers.
5. NEVER recommend someone just to have a recommendation. An empty result is better than a wrong one.
6. If the match is partial (e.g., a general designer when the user needs a specific type), clearly state it is a partial match and explain the gap — let the user decide.
7. When in doubt, ASK the user for more details rather than guessing.

When recommending freelancers:
1. Explain WHY each freelancer is a good match based on **specific, concrete data** from their profile
2. Reference their actual services, previous works, or completed gigs when relevant
3. Consider skills, experience, availability, pricing, delivery speed, and services offered
4. Be conversational and helpful — ask clarifying questions if the request is vague
5. Always mention the freelancer's name and key details
6. If a freelancer has a low hourly rate or fast delivery time that matches the founder's needs, highlight that
7. Prioritize freelancers who have services directly matching the request

When you find matching freelancers, include their IDs in your response using this exact format on separate lines:
[MATCH:freelancer_id:brief reason for match]

For example:
[MATCH:abc-123:Expert video editor with fast turnaround and $50/hr rate]
[MATCH:def-456:Has completed 3 similar reel editing projects]

If the query is not about finding freelancers (e.g. general questions, greetings), respond naturally without match tags.
If NO freelancers match the request, respond WITHOUT any match tags and explain that no matching freelancers were found.

Keep responses concise but informative. Use a friendly, professional tone.`;

// ── Pool Cache ──────────────────────────────────────────────

let _cachedPool: FreelancerPool | null = null;
let _poolFetchedAt = 0;
const POOL_CACHE_MS = 5 * 60 * 1000; // 5 minutes

export function clearFreelancerCache() {
  _cachedPool = null;
  _poolFetchedAt = 0;
}

// ── Main Chat Function ──────────────────────────────────────

export async function chatWithAI(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  accessToken: string,
): Promise<ChatMessage> {
  const client = getClient();

  // Fetch / refresh freelancer pool
  const now = Date.now();
  if (!_cachedPool || now - _poolFetchedAt > POOL_CACHE_MS) {
    logger.info("Refreshing freelancer pool cache");
    _cachedPool = await fetchFreelancerPool(accessToken);
    _poolFetchedAt = now;
  }

  // Map of short opaque IDs (F1, F2, …) → real UUIDs.
  const idMap = new Map<string, string>();

  const freelancerContext = buildFreelancerContext(
    _cachedPool.profiles,
    _cachedPool.userProfiles,
    _cachedPool.services,
    idMap,
  );

  const contextMessage =
    freelancerContext.length > 0
      ? `\n\nAvailable freelancers on the platform:\n${freelancerContext}`
      : "\n\nNote: No freelancers are currently registered on the platform.";

  // Build messages array for Groq
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
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
    max_tokens: 1024,
  });

  const responseContent =
    completion.choices?.[0]?.message?.content ||
    "I couldn't process that request. Please try again.";

  // Parse match tags from response and reverse-map short IDs → real UUIDs
  const matchRegex = /\[MATCH:([^:]+):([^\]]+)\]/g;
  const matchResults: { id: string; reason: string }[] = [];
  let m;
  while ((m = matchRegex.exec(responseContent)) !== null) {
    const shortId = m[1].trim();
    const realId = idMap.get(shortId) || shortId;
    matchResults.push({ id: realId, reason: m[2].trim() });
  }

  // Build freelancer results from matches (resolve avatars in parallel)
  const freelancerResults: FreelancerResult[] = (
    await Promise.all(
      matchResults.map(async ({ id, reason }) => {
        const profile = _cachedPool!.profiles.find((p) => p.id === id);
        const userProfile = _cachedPool!.userProfiles.find((u) => u.id === id);
        const svcs = _cachedPool!.services[id] || [];

        if (!profile && !userProfile) return null;

        // Resolve avatar
        const rawAvatar =
          profile?.photo_url ||
          profile?.avatar_url ||
          userProfile?.avatar_url ||
          null;
        let avatarUrl: string | null = null;
        try {
          avatarUrl = await resolveAvatar(rawAvatar, id);
        } catch {
          // Silent fallback — UI will show initial letter
        }

        return {
          id,
          name:
            profile?.display_name ||
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
        } as FreelancerResult;
      }),
    )
  ).filter(Boolean) as FreelancerResult[];

  // Clean match tags and any leaked IDs from the displayed response
  const cleanContent = responseContent
    .replace(/\[MATCH:[^\]]+\]/g, "")
    // Strip any UUID patterns that may have leaked
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "",
    )
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
