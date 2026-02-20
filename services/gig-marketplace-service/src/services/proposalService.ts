import { SupabaseClient } from "@supabase/supabase-js";
import { ProposalRepository } from "../repositories/proposalRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { mapSupabaseError } from "./dbErrorMap.js";

export async function createProposal(db: SupabaseClient, gigId: string, freelancerId: string, payload: Record<string, any>) {
  try {
    const repo = new ProposalRepository(db);
    return await repo.createProposal({ ...payload, gig_id: gigId, freelancer_id: freelancerId });
  } catch (error) {
    throw mapSupabaseError(error, "Failed to create proposal");
  }
}

export async function listProposals(db: SupabaseClient, gigId: string, query: Record<string, any>) {
  const repo = new ProposalRepository(db);
  const limit: number = Math.min(Number(query.limit || 20), 100);
  const cursor = decodeCursor(query.cursor);

  const rows = await repo.listProposalsByGig(gigId, limit, cursor);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}

export async function listProposalsByFreelancer(db: SupabaseClient, freelancerId: string, query: Record<string, any>) {
  const repo = new ProposalRepository(db);
  const limit: number = Math.min(Number(query.limit || 20), 100);
  const cursor = decodeCursor(query.cursor);

  const rows = await repo.listProposalsByFreelancer(freelancerId, limit, cursor);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}

export async function acceptProposal(db: SupabaseClient, proposalId: string) {
  try {
    const repo = new ProposalRepository(db);
    const contractId = await repo.acceptProposal(proposalId);
    return { contract_id: contractId };
  } catch (error) {
    throw mapSupabaseError(error, "Failed to accept proposal");
  }
}

export async function rejectProposal(db: SupabaseClient, proposalId: string) {
  try {
    const repo = new ProposalRepository(db);
    await repo.rejectProposal(proposalId);
    return { success: true };
  } catch (error) {
    throw mapSupabaseError(error, "Failed to reject proposal");
  }
}
