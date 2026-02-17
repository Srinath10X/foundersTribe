import { founderProfileRepository } from "../repositories/founderProfileRepository.js";
import { skillRepository } from "../repositories/skillRepository.js";
import { AppError } from "../utils/AppError.js";

function calculateCompletionPct(input) {
  const fields = [
    Boolean(input.role),
    Boolean(input.looking_for),
    Boolean(input.stage),
    Boolean(input.commitment),
    Array.isArray(input.industry_tags) && input.industry_tags.length > 0,
    Array.isArray(input.skills) && input.skills.length > 0,
    Boolean(input.pitch_short && input.pitch_short.length >= 10),
  ];
  let score = fields.filter(Boolean).length / fields.length;
  if (input.location) score += 0.1;
  if (typeof input.projects_built === "number" && input.projects_built > 0) score += 0.1;
  const pct = Math.min(1, score) * 100;
  return Math.round(pct);
}

export async function upsertProfile(userId, payload) {
  const completionPct = calculateCompletionPct(payload);
  const skillIds = await skillRepository.ensureSkillsReturnIds(payload.skills);
  await skillRepository.replaceUserSkills(userId, skillIds);
  const profile = await founderProfileRepository.upsert(userId, payload, completionPct);
  return { ...profile, profile_completion_pct: completionPct };
}

export async function getPublicProfile(viewerId, targetUserId, compatibilityFn) {
  const profile = await founderProfileRepository.getByUserId(targetUserId);
  if (!profile) {
    throw new AppError("Profile not found", 404);
  }
  const base = {
    userId: profile.user_id,
    role: profile.role,
    stage: profile.stage,
    commitment: profile.commitment,
    industryTags: profile.industry_tags,
    pitch: profile.pitch_short,
    lastActiveAt: profile.last_active_at,
    profileCompletionPct: profile.profile_completion_pct,
    verified: profile.verified,
    projectsBuilt: profile.projects_built,
  };
  if (!viewerId || viewerId === targetUserId) {
    return { ...base, compatibility: null, compatibilityBreakdown: null };
  }
  const viewerProfile = await founderProfileRepository.getByUserId(viewerId);
  if (!viewerProfile) {
    throw new AppError("Viewer profile not found", 400);
  }
  const compatibility = compatibilityFn(viewerProfile, profile);
  return {
    ...base,
    compatibility: compatibility.score,
    compatibilityBreakdown: compatibility.breakdown,
  };
}

