import { SupabaseClient } from "@supabase/supabase-js";

export class ProposalRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async createProposal(payload: Record<string, any>) {
    const { data, error } = await this.db.from("proposals").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }

  async listProposalsByGig(gigId: string, limit: number, cursor: { createdAt: string, id: string } | null) {
    let query = this.db
      .from("proposals")
      .select("*")
      .eq("gig_id", gigId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async listProposalsByFreelancer(freelancerId: string, limit: number, cursor: { createdAt: string, id: string } | null) {
    let query = this.db
      .from("proposals")
      .select("*, gigs(id, title, status)")
      .eq("freelancer_id", freelancerId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async acceptProposal(proposalId: string) {
    const { data, error } = await this.db.rpc("accept_proposal", { p_proposal_id: proposalId });
    if (error) throw error;
    return data;
  }

  async rejectProposal(proposalId: string) {
    const { data, error } = await this.db.rpc("reject_proposal", { p_proposal_id: proposalId });
    if (error) throw error;
    return data;
  }
}
