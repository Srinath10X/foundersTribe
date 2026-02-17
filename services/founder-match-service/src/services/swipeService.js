import { env } from "../config/env.js";
import { founderProfileRepository } from "../repositories/founderProfileRepository.js";
import { swipeRepository } from "../repositories/swipeRepository.js";
import { matchRepository } from "../repositories/matchRepository.js";
import { blockRepository } from "../repositories/blockRepository.js";
import { skillRepository } from "../repositories/skillRepository.js";
import { AppError } from "../utils/AppError.js";
import { computeCompatibility } from "./compatibilityService.js";
import { notifyMatchCreated, notifySuperLikeReceived } from "./notificationService.js";
import { trackSwipe, trackMatchCreated } from "./analyticsService.js";

async function ensureSwipeEligibility(userId) {
  const eligibility = await founderProfileRepository.isProfileEligibleForSwiping(
    userId,
    env.MIN_PROFILE_COMPLETION_FOR_SWIPE,
  );
  if (!eligibility.eligible) {
    if (eligibility.reason === "PROFILE_MISSING" || eligibility.reason === "PROFILE_INCOMPLETE") {
      throw new AppError("Complete profile before swiping", 400);
    }
    if (eligibility.reason === "COOLDOWN") {
      throw new AppError("Swiping temporarily disabled due to cooldown", 429);
    }
  }
}

export async function getNextCandidate(userId, filters) {
  await ensureSwipeEligibility(userId);
  const profile = await founderProfileRepository.getByUserId(userId);
  if (!profile) {
    throw new AppError("Profile not found", 404);
  }
  const candidates = await swipeRepository.nextCandidateForUser(userId, {
    role: filters.role,
    stage: filters.stage,
    commitment: filters.commitment,
    industry: filters.industry,
    minCompletion: env.MIN_PROFILE_COMPLETION_FOR_SWIPE,
  });
  if (!candidates.length) {
    return null;
  }
  const candidate = candidates[0];
  const viewerSkillsMap = await skillRepository.getTopSkillsForUsers([userId]);
  const candidateSkillsMap = await skillRepository.getTopSkillsForUsers([candidate.user_id]);
  const viewerSkills = viewerSkillsMap.get(userId) || [];
  const candidateSkills = candidateSkillsMap.get(candidate.user_id) || [];
  const compatibility = computeCompatibility(
    profile,
    candidate,
    viewerSkills,
    candidateSkills,
  );
  return {
    userId: candidate.user_id,
    role: candidate.role,
    stage: candidate.stage,
    commitment: candidate.commitment,
    industryTags: candidate.industry_tags,
    pitch: candidate.pitch_short,
    lastActiveAt: candidate.last_active_at,
    profileCompletionPct: candidate.profile_completion_pct,
    verified: candidate.verified,
    projectsBuilt: candidate.projects_built,
    compatibility: compatibility.score,
    compatibilityBreakdown: compatibility.breakdown,
    topSkills: candidateSkills,
  };
}

export async function recordSwipe(userId, targetUserId, type) {
  if (userId === targetUserId) {
    throw new AppError("Cannot swipe self", 400);
  }
  const existingMatch = await matchRepository.getMatchBetween(userId, targetUserId);
  if (existingMatch && existingMatch.status === "active") {
    throw new AppError("Already matched with this user", 400);
  }
  await ensureSwipeEligibility(userId);
  const blocked = await blockRepository.isBlockedBetween(userId, targetUserId);
  if (blocked) {
    throw new AppError("Cannot swipe blocked user", 400);
  }
  const dailyCount = await swipeRepository.getDailySwipeCount(userId);
  if (dailyCount >= env.DAILY_SWIPE_LIMIT) {
    await founderProfileRepository.setSwipeCooldown(
      userId,
      new Date(Date.now() + 60 * 60 * 1000),
    );
    throw new AppError("Daily swipe limit reached", 429);
  }
  if (type === "super") {
    const dailySuper = await swipeRepository.getDailySuperCount(userId);
    if (dailySuper >= env.DAILY_SUPER_LIMIT) {
      throw new AppError("Daily super swipe limit reached", 429);
    }
  }
  const swipe = await swipeRepository.createSwipe(userId, targetUserId, type);
  await trackSwipe(userId, targetUserId, type);
  if (type === "super") {
    await notifySuperLikeReceived(targetUserId, userId);
  }
  const mutual = await swipeRepository.hasMutualPositiveSwipe(userId, targetUserId);
  if (!mutual) {
    return { swipe, match: null };
  }
  const [profileA, profileB] = await Promise.all([
    founderProfileRepository.getByUserId(userId),
    founderProfileRepository.getByUserId(targetUserId),
  ]);
  if (!profileA || !profileB) {
    return { swipe, match: null };
  }
  const skillsMap = await skillRepository.getTopSkillsForUsers([userId, targetUserId], 10);
  const skillsA = skillsMap.get(userId) || [];
  const skillsB = skillsMap.get(targetUserId) || [];
  const compatibility = computeCompatibility(profileA, profileB, skillsA, skillsB);
  if (!compatibility.commitmentAligned || !compatibility.roleComplement) {
    return { swipe, match: null };
  }
  const match = await matchRepository.createMatch(userId, targetUserId, compatibility);
  await trackMatchCreated(userId, targetUserId, compatibility.score);
  await notifyMatchCreated(userId, match.id, targetUserId, compatibility.score);
  await notifyMatchCreated(targetUserId, match.id, userId, compatibility.score);
  return { swipe, match };
}

