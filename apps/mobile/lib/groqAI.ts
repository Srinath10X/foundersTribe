/**
 * ============================================================
 * GROQ AI - Agentic Freelancer Search
 * ============================================================
 *
 * Uses GROQ (Llama 3) to interpret natural-language queries
 * from founders and match them against the freelancer database.
 *
 * Flow:
 *  1. Founder types a free-form request (e.g. "I need a reel editor")
 *  2. We fetch available freelancers + their services from the API
 *  3. We send the query + freelancer data to GROQ
 *  4. GROQ returns a structured recommendation with reasoning
 * ============================================================
 */

import Groq from "groq-sdk";
import gigService from "./gigService";
import type { UserProfile, FreelancerService } from "@/types/gig";
import { supabase } from "./supabase";

// ── Storage ──────────────────────────────────────────────────

const STORAGE_BUCKET = "tribe-media";

/**
 * Resolve a profile avatar. The `candidate` value may be:
 *  - An HTTP(S) URL (already usable)
 *  - A Supabase storage path (needs a signed URL)
 *  - null / empty (fall back to listing the profile folder)
 */
async function resolveAvatar(
  candidate: unknown,
  userId: string,
): Promise<string | null> {
  // Already an HTTP URL — use as-is
  if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  // Storage path — create a signed URL
  if (typeof candidate === "string" && candidate.trim()) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(candidate.trim(), 60 * 60 * 24 * 30);
    if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
  }

  // Last resort — look in the profile folder for an avatar file
  if (!userId) return null;
  const folder = `profiles/${userId}`;
  const { data: files } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 20 });
  if (!Array.isArray(files) || files.length === 0) return null;
  const preferred =
    files.find((f) => /^avatar\./i.test(f.name)) || files[0];
  if (!preferred?.name) return null;

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

// ── Client ───────────────────────────────────────────────────

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
      throw new Error(
        "GROQ API key not configured. Set EXPO_PUBLIC_GROQ_API_KEY in .env"
      );
    }
    _client = new Groq({
      apiKey: GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return _client;
}

// ── Types ────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  freelancers?: FreelancerResult[];
  timestamp: number;
};

export type FreelancerResult = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  experience_level: string | null;
  hourly_rate: string | null;
  availability: string | null;
  country: string | null;
  services: {
    name: string;
    cost: string;
    delivery: string;
  }[];
  matchReason: string;
};

// ── Data Fetching ────────────────────────────────────────────

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  photo_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_type: string | null;
  role: string | null;
  location: string | null;
  rating: number | null;
  previous_works: any[] | null;
  completed_gigs: any[] | null;
  linkedin_url: string | null;
  business_idea: string | null;
  business_ideas: any[] | null;
  social_links: Record<string, string> | null;
  contact: string | null;
};

async function fetchFreelancerPool(): Promise<{
  profiles: ProfileRow[];
  userProfiles: UserProfile[];
  services: Record<string, FreelancerService[]>;
}> {
  // Fetch from profiles table (tribe-service) — freelancers & both
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, photo_url, avatar_url, bio, user_type, role, location, rating, previous_works, completed_gigs, linkedin_url, business_idea, business_ideas, social_links, contact"
    )
    .or("user_type.eq.freelancer,user_type.eq.both")
    .limit(100);

  // Fetch from user_profiles (gig-marketplace) via API
  let userProfiles: UserProfile[] = [];
  try {
    const res = await gigService.listUsers({ limit: 100 });
    userProfiles = res.items.filter(
      (u) => u.role === "freelancer" || u.role === "both"
    );
  } catch {
    // API may not be reachable
  }

  // Fetch services for all known freelancer IDs
  const freelancerIds = new Set<string>();
  (profiles || []).forEach((p) => freelancerIds.add(p.id));
  userProfiles.forEach((u) => freelancerIds.add(u.id));

  const serviceMap: Record<string, FreelancerService[]> = {};
  await Promise.all(
    Array.from(freelancerIds)
      .slice(0, 50)
      .map(async (fid) => {
        try {
          const svcs = await gigService.getFreelancerServicesByUser(fid);
          if (svcs.length > 0) serviceMap[fid] = svcs;
        } catch {
          // skip
        }
      })
  );

  return {
    profiles: profiles || [],
    userProfiles,
    services: serviceMap,
  };
}

// ── Build Context ────────────────────────────────────────────

function buildFreelancerContext(
  profiles: ProfileRow[],
  userProfiles: UserProfile[],
  services: Record<string, FreelancerService[]>
): string {
  const seen = new Set<string>();
  const entries: string[] = [];

  // Merge data from both sources
  for (const p of profiles) {
    seen.add(p.id);
    const up = userProfiles.find((u) => u.id === p.id);
    const svcs = services[p.id] || [];

    const name = p.display_name || up?.full_name || p.username || "Unknown";
    const bio = p.bio || up?.bio || "";
    const experience = up?.experience_level || "";
    const rate = up?.hourly_rate || "";
    const availability = up?.availability || "";
    const country = up?.country || p.location || "";
    const linkedIn = p.linkedin_url || up?.linkedin_url || "";
    const portfolio = up?.portfolio_url || "";
    const contact = p.contact || "";

    // Format previous works
    const prevWorks =
      Array.isArray(p.previous_works) && p.previous_works.length > 0
        ? p.previous_works
            .map((w: any) => {
              const title = w.title || w.name || "Untitled";
              const desc = w.description || "";
              return desc ? `  - ${title}: ${desc}` : `  - ${title}`;
            })
            .join("\n")
        : "";

    // Format completed gigs
    const completedGigs =
      Array.isArray(p.completed_gigs) && p.completed_gigs.length > 0
        ? p.completed_gigs
            .map((g: any) => {
              const title = g.title || g.name || "Untitled";
              const desc = g.description || "";
              return desc ? `  - ${title}: ${desc}` : `  - ${title}`;
            })
            .join("\n")
        : "";

    // Format social links
    const socialLinks =
      p.social_links &&
      typeof p.social_links === "object" &&
      Object.keys(p.social_links).length > 0
        ? Object.entries(p.social_links)
            .map(([platform, url]) => `  - ${platform}: ${url}`)
            .join("\n")
        : "";

    // Format business ideas (skills/domain context)
    const businessIdeas =
      Array.isArray(p.business_ideas) && p.business_ideas.length > 0
        ? p.business_ideas
            .map((idea: any) => {
              const title =
                typeof idea === "string"
                  ? idea
                  : idea.title || idea.name || JSON.stringify(idea);
              return `  - ${title}`;
            })
            .join("\n")
        : "";

    const svcList = svcs
      .map(
        (s) =>
          `  - ${s.service_name}: ${s.cost_currency}${s.cost_amount} / ${
            s.delivery_time_value
          } ${s.delivery_time_unit}${
            s.description ? ` — ${s.description}` : ""
          }`
      )
      .join("\n");

    entries.push(
      [
        `ID: ${p.id}`,
        `Name: ${name}`,
        bio ? `Bio: ${bio}` : "",
        experience ? `Experience: ${experience}` : "",
        rate ? `Hourly Rate: $${rate}` : "",
        availability ? `Availability: ${availability}` : "",
        country ? `Location: ${country}` : "",
        p.rating ? `Rating: ${p.rating}/5` : "",
        linkedIn ? `LinkedIn: ${linkedIn}` : "",
        portfolio ? `Portfolio: ${portfolio}` : "",
        contact ? `Contact: ${contact}` : "",
        svcList ? `Services:\n${svcList}` : "",
        prevWorks ? `Previous Works:\n${prevWorks}` : "",
        completedGigs ? `Completed Gigs:\n${completedGigs}` : "",
        socialLinks ? `Social Links:\n${socialLinks}` : "",
        businessIdeas ? `Domain/Ideas:\n${businessIdeas}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  // Add user_profiles not in profiles table
  for (const up of userProfiles) {
    if (seen.has(up.id)) continue;
    const svcs = services[up.id] || [];
    const svcList = svcs
      .map(
        (s) =>
          `  - ${s.service_name}: ${s.cost_currency}${s.cost_amount} / ${
            s.delivery_time_value
          } ${s.delivery_time_unit}${
            s.description ? ` — ${s.description}` : ""
          }`
      )
      .join("\n");

    entries.push(
      [
        `ID: ${up.id}`,
        `Name: ${up.full_name || up.handle || "Unknown"}`,
        up.bio ? `Bio: ${up.bio}` : "",
        up.experience_level ? `Experience: ${up.experience_level}` : "",
        up.hourly_rate ? `Hourly Rate: $${up.hourly_rate}` : "",
        up.availability ? `Availability: ${up.availability}` : "",
        up.country ? `Location: ${up.country}` : "",
        up.linkedin_url ? `LinkedIn: ${up.linkedin_url}` : "",
        up.portfolio_url ? `Portfolio: ${up.portfolio_url}` : "",
        svcList ? `Services:\n${svcList}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return entries.join("\n---\n");
}

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant for Founders Tribe, a platform connecting founders with freelancers.

### SAFETY & PRIVACY RULES:
1. NEVER reveal raw IDs (UUIDs) in your conversational text.
2. NEVER reveal private contact information (email, phone, exact social links) in your text.
3. NEVER mention internal database fields or technical metadata.
4. Keep responses professional, encouraging, and under 3 paragraphs.

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

// ── Chat Function ────────────────────────────────────────────

let _cachedPool: Awaited<ReturnType<typeof fetchFreelancerPool>> | null = null;
let _poolFetchedAt = 0;
const POOL_CACHE_MS = 5 * 60 * 1000; // 5 minutes

export async function chatWithAI(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<ChatMessage> {
  const client = getClient();

  // Fetch / refresh freelancer pool
  const now = Date.now();
  if (!_cachedPool || now - _poolFetchedAt > POOL_CACHE_MS) {
    _cachedPool = await fetchFreelancerPool();
    _poolFetchedAt = now;
  }

  const freelancerContext = buildFreelancerContext(
    _cachedPool.profiles,
    _cachedPool.userProfiles,
    _cachedPool.services
  );

  const contextMessage =
    freelancerContext.length > 0
      ? `\n\nAvailable freelancers on the platform:\n${freelancerContext}`
      : "\n\nNote: No freelancers are currently registered on the platform.";

  // Build messages array for GROQ
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

  // Call GROQ API
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  });

  const responseContent =
    completion.choices?.[0]?.message?.content ||
    "I couldn't process that request. Please try again.";

  // Parse match tags from response
  const matchRegex = /\[MATCH:([^:]+):([^\]]+)\]/g;
  const matches: { id: string; reason: string }[] = [];
  let match;
  while ((match = matchRegex.exec(responseContent)) !== null) {
    matches.push({ id: match[1].trim(), reason: match[2].trim() });
  }

  // Build freelancer results from matches (resolve avatars in parallel)
  const freelancerResults: FreelancerResult[] = (
    await Promise.all(
      matches.map(async ({ id, reason }) => {
        const profile = _cachedPool!.profiles.find((p) => p.id === id);
        const userProfile = _cachedPool!.userProfiles.find((u) => u.id === id);
        const svcs = _cachedPool!.services[id] || [];

        if (!profile && !userProfile) return null;

        // Resolve the avatar — handles storage paths, HTTP URLs, and folder fallbacks
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

  // Clean match tags from the displayed response
  const cleanContent = responseContent
    .replace(/\[MATCH:[^\]]+\]/g, "")
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

/** Clear the cached freelancer pool (e.g. on pull-to-refresh) */
export function clearFreelancerCache() {
  _cachedPool = null;
  _poolFetchedAt = 0;
}
