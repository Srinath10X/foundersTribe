export class MessageRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async insertMessage(payload) {
        const { data, error } = await this.db.from("messages").insert(payload).select("*").single();
        if (error)
            throw error;
        return data;
    }
    async listMessages(contractId, limit, cursor) {
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
        if (error)
            throw error;
        return data || [];
    }
    async markRead(contractId, userId) {
        const { error } = await this.db
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .eq("contract_id", contractId)
            .eq("recipient_id", userId)
            .is("read_at", null);
        if (error)
            throw error;
    }
}
