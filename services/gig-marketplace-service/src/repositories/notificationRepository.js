export class NotificationRepository {
  constructor(db) {
    this.db = db;
  }

  async listNotifications(unreadOnly, limit, cursor) {
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
