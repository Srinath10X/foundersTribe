import { SupabaseClient } from "@supabase/supabase-js";

export class NotificationRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async listNotifications(unreadOnly: boolean, limit: number, cursor: { createdAt: string, id: string } | null) {
    let query = this.db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}
