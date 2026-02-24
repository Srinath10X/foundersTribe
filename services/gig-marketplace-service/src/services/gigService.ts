import { SupabaseClient } from "@supabase/supabase-js";
import { GigRepository } from "../repositories/gigRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";

export async function createGig(db: SupabaseClient, founderId: string, payload: Record<string, any>) {
  try {
    const { tags, ...gigData } = payload;
    const repo = new GigRepository(db);

    // Ensure user_profiles row exists (FK requirement) — no-op if already present
    await db.from("user_profiles").upsert({ id: founderId }, { onConflict: "id", ignoreDuplicates: true });

    const publishedAt = gigData.status === "open" ? new Date().toISOString() : null;
    const result = await repo.createGig({ ...gigData, founder_id: founderId, ...(publishedAt ? { published_at: publishedAt } : {}) });
    if (tags && Array.isArray(tags) && tags.length > 0) {
      await repo.addTagsToGig(result.id, tags);
    }
    return result;
  } catch (error) {
    throw mapSupabaseError(error, "Failed to create gig");
  }
}

export async function listGigs(db: SupabaseClient, query: Record<string, any>) {
  const repo = new GigRepository(db);
  const limit: number = Math.min(Number(query.limit || 20), 100);
  const cursor = decodeCursor(query.cursor);

  const { rows } = await repo.listGigs(query, limit, cursor);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}

export async function getGigById(db: SupabaseClient, id: string) {
  const repo = new GigRepository(db);
  const gig = await repo.getGigById(id);
  if (!gig) throw new AppError("Gig not found", 404, "not_found");
  return gig;
}

export async function updateGig(db: SupabaseClient, id: string, founderId: string, patch: Record<string, any>) {
  try {
    const { tags, ...gigData } = patch;
    const repo = new GigRepository(db);
    const gig = await repo.getGigById(id);
    if (!gig) throw new AppError("Gig not found", 404, "not_found");
    if (gig.founder_id !== founderId) throw new AppError("Unauthorized", 403, "forbidden");

    let result = gig;
    if (Object.keys(gigData).length > 0) {
      // Set published_at when transitioning to open for the first time
      if (gigData.status === "open" && !gig.published_at) {
        gigData.published_at = new Date().toISOString();
      }
      result = await repo.updateGig(id, gigData);
    }

    if (tags && Array.isArray(tags)) {
      await repo.addTagsToGig(id, tags);
    }
    return result;
  } catch (error) {
    throw mapSupabaseError(error, "Failed to update gig");
  }
}

export async function getFreelancerStats(db: SupabaseClient, userId: string) {
  const repo = new GigRepository(db);
  return await repo.getFreelancerStats(userId);
}

export async function deleteGig(db: SupabaseClient, id: string, founderId: string) {
  try {
    const repo = new GigRepository(db);
    const gig = await repo.getGigById(id);
    if (!gig) throw new AppError("Gig not found", 404, "not_found");
    if (gig.founder_id !== founderId) throw new AppError("Unauthorized", 403, "forbidden");
    await repo.deleteGig(id);
  } catch (error) {
    throw mapSupabaseError(error, "Failed to delete gig");
  }
}
