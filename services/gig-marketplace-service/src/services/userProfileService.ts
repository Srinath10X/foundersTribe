import { SupabaseClient } from "@supabase/supabase-js";
import { UserProfileRepository } from "../repositories/userProfileRepository.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";

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

export async function listUsers(db: SupabaseClient, query: Record<string, any>) {
  const repo = new UserProfileRepository(db);
  const limit: number = Math.min(Number(query.limit || 20), 100);
  const cursor = decodeCursor(query.cursor);

  const cursorParts = cursor
    ? { updatedAt: cursor.createdAt, id: cursor.id }
    : null;

  const { rows } = await repo.listProfiles(limit, cursorParts, query.q as string | undefined);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].updated_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}
