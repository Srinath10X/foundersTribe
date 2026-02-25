import { supabaseAdmin } from "../config/supabase.js";
export class ContractRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async hydrateContractRows(rows) {
        if (!rows.length)
            return rows;
        const gigIds = [...new Set(rows.map((row) => row.gig_id).filter(Boolean))];
        const proposalIds = [...new Set(rows.map((row) => row.proposal_id).filter(Boolean))];
        const participantIds = [
            ...new Set(rows
                .flatMap((row) => [row.founder_id, row.freelancer_id])
                .filter(Boolean)),
        ];
        const [gigsRes, proposalsRes, profilesRes] = await Promise.all([
            gigIds.length
                ? supabaseAdmin
                    .from("gigs")
                    .select("id, title, description, budget_min, budget_max, status, is_remote, location_text, experience_level, founder:user_profiles!gigs_founder_id_fkey(id, full_name, avatar_url, handle), gig_tags(tag_id, tags(id, slug, label))")
                    .in("id", gigIds)
                : Promise.resolve({ data: [], error: null }),
            proposalIds.length
                ? supabaseAdmin
                    .from("proposals")
                    .select("id, proposed_amount, estimated_days, cover_letter")
                    .in("id", proposalIds)
                : Promise.resolve({ data: [], error: null }),
            participantIds.length
                ? supabaseAdmin
                    .from("user_profiles")
                    .select("id, full_name, avatar_url, handle")
                    .in("id", participantIds)
                : Promise.resolve({ data: [], error: null }),
        ]);
        if (gigsRes.error)
            throw gigsRes.error;
        if (proposalsRes.error)
            throw proposalsRes.error;
        if (profilesRes.error)
            throw profilesRes.error;
        const gigMap = new Map((gigsRes.data || []).map((item) => [item.id, item]));
        const proposalMap = new Map((proposalsRes.data || []).map((item) => [item.id, item]));
        const profileMap = new Map((profilesRes.data || []).map((item) => [item.id, item]));
        return rows.map((row) => ({
            ...row,
            gig: row.gig_id ? gigMap.get(row.gig_id) || null : null,
            proposal: row.proposal_id ? proposalMap.get(row.proposal_id) || null : null,
            founder: row.founder_id ? profileMap.get(row.founder_id) || null : null,
            freelancer: row.freelancer_id ? profileMap.get(row.freelancer_id) || null : null,
        }));
    }
    async listContracts(filters, limit, cursor) {
        let query = this.db
            .from("contracts")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit + 1);
        if (filters.status)
            query = query.eq("status", filters.status);
        if (cursor) {
            query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return this.hydrateContractRows((data || []));
    }
    async getContractById(id) {
        const { data, error } = await this.db
            .from("contracts")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            return data;
        const [enriched] = await this.hydrateContractRows([data]);
        return enriched;
    }
    async markComplete(id) {
        const { data, error } = await this.db.rpc("mark_contract_complete", { p_contract_id: id });
        if (error)
            throw error;
        return data;
    }
    async approve(id) {
        const { data, error } = await this.db.rpc("approve_contract", { p_contract_id: id });
        if (error)
            throw error;
        return data;
    }
}
