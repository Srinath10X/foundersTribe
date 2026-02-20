import { GigRepository } from "../repositories/gigRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";

export async function createGig(db, founderId, payload) {
  try {
    const repo = new GigRepository(db);
    return await repo.createGig({ ...payload, founder_id: founderId });
  } catch (error) {
    throw mapSupabaseError(error, "Failed to create gig");
  }
}

export async function listGigs(db, query) {
  const repo = new GigRepository(db);
  const limit = Math.min(Number(query.limit || 20), 100);
  const cursor = decodeCursor(query.cursor);

  const { rows } = await repo.listGigs(query, limit, cursor);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}

export async function getGigById(db, id) {
  const repo = new GigRepository(db);
  const gig = await repo.getGigById(id);
  if (!gig) throw new AppError("Gig not found", 404, "not_found");
  return gig;
}

export async function updateGig(db, id, patch) {
  try {
    const repo = new GigRepository(db);
    return await repo.updateGig(id, patch);
  } catch (error) {
    throw mapSupabaseError(error, "Failed to update gig");
  }
}

export async function deleteGig(db, id) {
  try {
    const repo = new GigRepository(db);
    await repo.deleteGig(id);
  } catch (error) {
    throw mapSupabaseError(error, "Failed to delete gig");
  }
}
