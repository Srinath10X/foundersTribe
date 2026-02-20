import { ContractRepository } from "../repositories/contractRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { AppError } from "../utils/AppError.js";
import { mapSupabaseError } from "./dbErrorMap.js";

export async function listContracts(db, query) {
  const repo = new ContractRepository(db);
  const limit = Math.min(Number(query.limit || 20), 100);
  const cursor = decodeCursor(query.cursor);

  const rows = await repo.listContracts(query, limit, cursor);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}

export async function getContractById(db, id) {
  const repo = new ContractRepository(db);
  const contract = await repo.getContractById(id);
  if (!contract) throw new AppError("Contract not found", 404, "not_found");
  return contract;
}

export async function markContractComplete(db, id) {
  try {
    const repo = new ContractRepository(db);
    await repo.markComplete(id);
    return { success: true };
  } catch (error) {
    throw mapSupabaseError(error, "Failed to mark contract complete");
  }
}

export async function approveContract(db, id) {
  try {
    const repo = new ContractRepository(db);
    await repo.approve(id);
    return { success: true };
  } catch (error) {
    throw mapSupabaseError(error, "Failed to approve contract");
  }
}
