import { profileRepository } from "../repositories/profileRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

export async function getMyProfile(userId) {
  const profile = await profileRepository.getByUserId(userId);
  if (!profile) throw new AppError("Profile not found", 404);
  return profile;
}

export async function updateProfile(userId, data) {
  // Ensure user can only update their own profile
  const existing = await profileRepository.getByUserId(userId);
  if (!existing) throw new AppError("Profile not found", 404);

  const updated = await profileRepository.update(userId, data);
  logger.info({ userId }, "Profile updated");
  return updated;
}

export async function getPublicProfile(userId) {
  const profile = await profileRepository.getByUserId(userId);
  if (!profile) throw new AppError("Profile not found", 404);
  return profile;
}
