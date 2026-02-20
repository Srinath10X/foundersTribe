export class ContractRepository {
  constructor(db) {
    this.db = db;
  }

  async listContracts(filters, limit, cursor) {
    let query = this.db
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (filters.status) query = query.eq("status", filters.status);

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getContractById(id) {
    const { data, error } = await this.db
      .from("contracts")
      .select("*, gigs(id, title, status), founder:user_profiles!contracts_founder_id_fkey(id, full_name, avatar_url, handle), freelancer:user_profiles!contracts_freelancer_id_fkey(id, full_name, avatar_url, handle)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async markComplete(id) {
    const { data, error } = await this.db.rpc("mark_contract_complete", { p_contract_id: id });
    if (error) throw error;
    return data;
  }

  async approve(id) {
    const { data, error } = await this.db.rpc("approve_contract", { p_contract_id: id });
    if (error) throw error;
    return data;
  }
}
