import { matchRepository } from "../repositories/matchRepository.js";
import { founderProfileRepository } from "../repositories/founderProfileRepository.js";
import { skillRepository } from "../repositories/skillRepository.js";
import { AppError } from "../utils/AppError.js";

function otherUserId(match, viewerId) {
  return match.user1_id === viewerId ? match.user2_id : match.user1_id;
}

function timeAgo(timestamp) {
  if (!timestamp) return null;
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export async function listMatches(userId, sort, cursor, limit = 50) {
  const matches = await matchRepository.listMatchesForUser(userId, limit, cursor);
  if (!matches.length) return [];
  const userIds = [...new Set(matches.map((m) => otherUserId(m, userId)))];
  const profiles = await Promise.all(
    userIds.map((id) => founderProfileRepository.getByUserId(id)),
  );
  const profileByUser = new Map();
  profiles.forEach((p) => {
    if (p) profileByUser.set(p.user_id, p);
  });
  const skillsMap = await skillRepository.getTopSkillsForUsers(userIds, 3);
  const enriched = matches
    .map((m) => {
      const otherId = otherUserId(m, userId);
      const p = profileByUser.get(otherId);
      if (!p) return null;
      const topSkills = skillsMap.get(otherId) || [];
      return {
        matchId: m.id,
        otherUserId: otherId,
        compatibility: m.compatibility_score,
        compatibilityBreakdown: m.compatibility_breakdown,
        status: m.status,
        lastMessageAt: m.last_message_at,
        timeAgo: timeAgo(m.last_message_at || m.created_at),
        role: p.role,
        stage: p.stage,
        commitment: p.commitment,
        industryTags: p.industry_tags,
        pitch: p.pitch_short,
        lastActiveAt: p.last_active_at,
        topSkills,
      };
    })
    .filter(Boolean);
  if (sort === "compatibility") {
    enriched.sort((a, b) => b.compatibility - a.compatibility);
  } else if (sort === "activity") {
    enriched.sort(
      (a, b) =>
        new Date(b.lastActiveAt || 0).getTime() -
        new Date(a.lastActiveAt || 0).getTime(),
    );
  } else {
    enriched.sort(
      (a, b) =>
        new Date(b.lastMessageAt || 0).getTime() -
        new Date(a.lastMessageAt || 0).getTime(),
    );
  }
  return enriched;
}

export async function assertUserInMatch(matchId, userId) {
  const match = await matchRepository.getById(matchId);
  if (!match || match.status !== "active") {
    throw new AppError("Match not found", 404);
  }
  if (match.user1_id !== userId && match.user2_id !== userId) {
    throw new AppError("Forbidden", 403);
  }
  return match;
}

export async function unmatch(matchId, userId) {
  const match = await assertUserInMatch(matchId, userId);
  const updated = await matchRepository.unmatch(matchId, userId);
  const otherId = otherUserId(match, userId);
  return { match: updated, otherUserId: otherId };
}

