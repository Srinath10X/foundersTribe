/**
 * ============================================================
 * FREELANCER POOL SERVICE
 * ============================================================
 *
 * Fetches freelancer data from Supabase (profiles table) and
 * the gig-marketplace API, then builds the text context string
 * sent to the AI model.
 *
 * Replaces the client-side fetchFreelancerPool() and
 * buildFreelancerContext() that previously lived in the mobile
 * app's groqAI.ts.
 * ============================================================
 */

import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type {
  ProfileRow,
  UserProfile,
  FreelancerService,
} from "../types/ai.js";

// ── Gig-marketplace API helpers ─────────────────────────────

async function fetchGigUsers(token: string): Promise<UserProfile[]> {
  try {
    const res = await fetch(`${env.GIG_SERVICE_URL}/api/users?limit=100`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { items: UserProfile[] };
    return (json.items || []).filter(
      (u) => u.role === "freelancer" || u.role === "both",
    );
  } catch {
    logger.warn("Could not reach gig-marketplace /api/users");
    return [];
  }
}

async function fetchFreelancerServices(
  freelancerId: string,
  token: string,
): Promise<FreelancerService[]> {
  try {
    const res = await fetch(
      `${env.GIG_SERVICE_URL}/api/services/freelancers/${freelancerId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { items: FreelancerService[] };
    return json.items || [];
  } catch {
    return [];
  }
}

// ── Public API ──────────────────────────────────────────────

export interface FreelancerPool {
  profiles: ProfileRow[];
  userProfiles: UserProfile[];
  services: Record<string, FreelancerService[]>;
}

/**
 * Fetch the freelancer pool from Supabase + gig-marketplace API.
 * The `token` is the caller's access token, forwarded to gig-marketplace
 * so its auth middleware accepts the request.
 */
export async function fetchFreelancerPool(
  token: string,
): Promise<FreelancerPool> {
  // Fetch from profiles table (tribe-service) — freelancers & both
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, display_name, username, photo_url, avatar_url, bio, user_type, role, location, rating, previous_works, completed_gigs, linkedin_url, business_idea, business_ideas, social_links, contact",
    )
    .or("user_type.eq.freelancer,user_type.eq.both")
    .limit(100);

  // Fetch from gig-marketplace via API
  const userProfiles = await fetchGigUsers(token);

  // Collect all unique freelancer IDs
  const freelancerIds = new Set<string>();
  (profiles || []).forEach((p) => freelancerIds.add(p.id));
  userProfiles.forEach((u) => freelancerIds.add(u.id));

  // Fetch services for each freelancer (cap at 50 to limit fan-out)
  const serviceMap: Record<string, FreelancerService[]> = {};
  await Promise.all(
    Array.from(freelancerIds)
      .slice(0, 50)
      .map(async (fid) => {
        const svcs = await fetchFreelancerServices(fid, token);
        if (svcs.length > 0) serviceMap[fid] = svcs;
      }),
  );

  return {
    profiles: profiles || [],
    userProfiles,
    services: serviceMap,
  };
}

/**
 * Build the freelancer context string sent to the AI.
 * Real UUIDs are replaced with opaque short IDs (F1, F2, ...)
 * so the AI never sees or leaks actual user IDs. The `idMap` is
 * populated as a side-effect: shortId -> realId.
 */
export function buildFreelancerContext(
  profiles: ProfileRow[],
  userProfiles: UserProfile[],
  services: Record<string, FreelancerService[]>,
  idMap: Map<string, string>,
): string {
  const seen = new Set<string>();
  const entries: string[] = [];
  let counter = 1;

  const getShortId = (realId: string): string => {
    for (const [short, real] of idMap.entries()) {
      if (real === realId) return short;
    }
    const short = `F${counter++}`;
    idMap.set(short, realId);
    return short;
  };

  // Merge data from both sources
  for (const p of profiles) {
    seen.add(p.id);
    const up = userProfiles.find((u) => u.id === p.id);
    const svcs = services[p.id] || [];
    const shortId = getShortId(p.id);

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
          `  - ${s.service_name}: ${s.cost_currency}${s.cost_amount} / ${s.delivery_time_value} ${s.delivery_time_unit}${
            s.description ? ` — ${s.description}` : ""
          }`,
      )
      .join("\n");

    entries.push(
      [
        `ID: ${shortId}`,
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
        .join("\n"),
    );
  }

  // Add user_profiles not in profiles table
  for (const up of userProfiles) {
    if (seen.has(up.id)) continue;
    const svcs = services[up.id] || [];
    const shortId = getShortId(up.id);
    const svcList = svcs
      .map(
        (s) =>
          `  - ${s.service_name}: ${s.cost_currency}${s.cost_amount} / ${s.delivery_time_value} ${s.delivery_time_unit}${
            s.description ? ` — ${s.description}` : ""
          }`,
      )
      .join("\n");

    entries.push(
      [
        `ID: ${shortId}`,
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
        .join("\n"),
    );
  }

  return entries.join("\n---\n");
}
