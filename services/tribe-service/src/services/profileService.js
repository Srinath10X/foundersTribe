import { profileRepository } from "../repositories/profileRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

function parseBusinessIdeas(profileLike) {
  if (Array.isArray(profileLike?.business_ideas)) {
    return profileLike.business_ideas
      .filter((idea) => typeof idea === "string")
      .map((idea) => idea.trim())
      .filter(Boolean);
  }

  const single = typeof profileLike?.business_idea === "string"
    ? profileLike.business_idea.trim()
    : "";
  if (!single) return [];

  try {
    const parsed = JSON.parse(single);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((idea) => typeof idea === "string")
        .map((idea) => idea.trim())
        .filter(Boolean);
    }
  } catch {
    // keep fallback to plain-text idea
  }

  return [single];
}

function isProfileMinimumComplete(profileLike) {
  const hasName =
    typeof profileLike?.display_name === "string" &&
    profileLike.display_name.trim().length > 0;
  const hasBio =
    typeof profileLike?.bio === "string" &&
    profileLike.bio.trim().length > 0;

  const socialLinks = Array.isArray(profileLike?.social_links)
    ? profileLike.social_links.filter(
        (link) => link && typeof link.url === "string" && link.url.trim().length > 0,
      )
    : [];

  const businessIdeas = parseBusinessIdeas(profileLike);

  return hasName && hasBio && socialLinks.length > 0 && businessIdeas.length > 0;
}

export async function getMyProfile(userId) {
  const profile = await profileRepository.getByUserId(userId);
  if (!profile) throw new AppError("Profile not found", 404);
  return profile;
}

export async function updateProfile(userId, data) {
  // Ensure user can only update their own profile
  const existing = await profileRepository.getByUserId(userId);
  if (!existing) throw new AppError("Profile not found", 404);

  const merged = { ...existing, ...data };
  const businessIdeas = parseBusinessIdeas(merged);
  const computedPayload = {
    ...data,
    business_ideas: Array.isArray(data.business_ideas)
      ? businessIdeas
      : data.business_ideas,
    business_idea:
      data.business_idea !== undefined || data.business_ideas !== undefined
        ? businessIdeas[0] || null
        : data.business_idea,
    profile_onboarding_completed: isProfileMinimumComplete(merged),
  };

  // Only send columns that actually exist in current DB schema.
  // This makes profile updates resilient when newer migrations are not yet applied.
  const existingColumns = new Set(Object.keys(existing || {}));
  const payload = Object.fromEntries(
    Object.entries(computedPayload).filter(
      ([key, value]) => existingColumns.has(key) && value !== undefined,
    ),
  );

  let updated;
  try {
    updated = await profileRepository.update(userId, payload);
  } catch (error) {
    try {
      // Backward-compat fallback when onboarding flag column is not available yet.
      const fallbackPayload = { ...payload };
      delete fallbackPayload.profile_onboarding_completed;
      updated = await profileRepository.update(userId, fallbackPayload);
    } catch (_) {
      // Hard fallback: keep only keys that exist on the current profile row.
      // This preserves valid fields like photo_url even if newer columns are absent.
      const existingColumns = new Set(Object.keys(existing || {}));
      const fallbackPayload = Object.fromEntries(
        Object.entries(payload).filter(
          ([key, value]) => existingColumns.has(key) && value !== undefined,
        ),
      );
      updated = await profileRepository.update(userId, fallbackPayload);
    }
  }
  logger.info({ userId }, "Profile updated");
  return updated;
}

export async function getPublicProfile(userId) {
  const profile = await profileRepository.getByUserId(userId);
  if (!profile) throw new AppError("Profile not found", 404);
  return profile;
}
