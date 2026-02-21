import { SupabaseClient } from "@supabase/supabase-js";
import { UserProfileRepository } from "../repositories/userProfileRepository.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";

export async function getMyProfile(db: SupabaseClient, userId: string) {
  const repo = new UserProfileRepository(db);
  const profile = await repo.getById(userId);
  if (!profile) {
    throw new AppError("Profile not found", 404, "not_found");
  }
  return profile;
}

export async function upsertMyProfile(db: SupabaseClient, userId: string, payload: Record<string, unknown>) {
  try {
    const repo = new UserProfileRepository(db);
    return await repo.upsertProfile(userId, payload);
  } catch (error) {
    throw mapSupabaseError(error, "Failed to upsert profile");
  }
}
