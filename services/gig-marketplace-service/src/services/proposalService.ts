import { SupabaseClient } from "@supabase/supabase-js";
import { ProposalRepository } from "../repositories/proposalRepository.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { mapSupabaseError } from "./dbErrorMap.js";
import { AppError } from "../utils/AppError.js";

type UserMetadataLike = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
  role?: string;
  user_type?: string;
};

function normalizeRole(value?: string): "founder" | "freelancer" | "both" | undefined {
  if (!value) return undefined;
  const role = value.toLowerCase();
  if (role === "founder" || role === "freelancer" || role === "both") return role;
  return undefined;
}

async function ensureUserProfileRow(
  db: SupabaseClient,
  userId: string,
  userMetadata?: UserMetadataLike,
) {
  const { data: existing, error: existingError } = await db
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }
  if (existing?.id) {
    return;
  }

  const fullName = userMetadata?.full_name || userMetadata?.name || null;
  const avatarUrl = userMetadata?.avatar_url || userMetadata?.picture || null;
  const role = normalizeRole(userMetadata?.role || userMetadata?.user_type) || "freelancer";

  const { error: insertError } = await db
    .from("user_profiles")
    .insert({
      id: userId,
      full_name: fullName,
      avatar_url: avatarUrl,
      role,
    });

  if (insertError) {
    throw insertError;
  }
}

export async function createProposal(
  db: SupabaseClient,
  gigId: string,
  freelancerId: string,
  payload: Record<string, any>,
  userMetadata?: UserMetadataLike,
) {
  try {
    await ensureUserProfileRow(db, freelancerId, userMetadata);

    const { data: gig, error: gigError } = await db
      .from("gigs")
      .select("id, founder_id, status")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new AppError("Gig not found", 404, "not_found");
    }

    if (gig.founder_id === freelancerId) {
      throw new AppError("You cannot submit a proposal to your own gig", 403, "forbidden");
    }

    if (gig.status !== "open") {
      throw new AppError("This gig is no longer accepting proposals", 409, "gig_closed");
    }

    const { count: contractCount, error: contractError } = await db
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("gig_id", gigId);

    if (contractError) {
      throw contractError;
    }

    if ((contractCount || 0) > 0) {
      throw new AppError("A proposal has already been accepted for this gig", 409, "gig_closed");
    }

    const repo = new ProposalRepository(db);
    return await repo.createProposal({ ...payload, gig_id: gigId, freelancer_id: freelancerId });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
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
