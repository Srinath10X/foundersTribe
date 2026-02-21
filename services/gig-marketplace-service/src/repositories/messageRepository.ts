import { SupabaseClient } from "@supabase/supabase-js";

export class MessageRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async insertMessage(payload: Record<string, any>) {
    const { data, error } = await this.db.from("messages").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }

  async listMessages(contractId: string, limit: number, cursor: { createdAt: string, id: string } | null) {
    let query = this.db
      .from("messages")
      .select("*")
      .eq("contract_id", contractId)
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

  async markRead(contractId: string, userId: string) {
    const { error } = await this.db
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("contract_id", contractId)
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (error) throw error;
  }
}
