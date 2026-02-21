import { SupabaseClient } from "@supabase/supabase-js";
import { GigRepository } from "../repositories/gigRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";

export async function createGig(db: SupabaseClient, founderId: string, payload: Record<string, any>) {
  try {
    const repo = new GigRepository(db);
    return await repo.createGig({ ...payload, founder_id: founderId });
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
    const repo = new GigRepository(db);
    const gig = await repo.getGigById(id);
    if (!gig) throw new AppError("Gig not found", 404, "not_found");
    if (gig.founder_id !== founderId) throw new AppError("Unauthorized", 403, "forbidden");
    return await repo.updateGig(id, patch);
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
