import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class NotificationRepository {
  async create(userId, type, payload) {
    const { data, error } = await supabase
      .from("user_notifications")
      .insert({
        user_id: userId,
        type,
        payload: payload || null,
      })
      .select()
      .single();
    if (error) {
      logger.error({ error, userId }, "NotificationRepository.create failed");
      throw new Error("Database error creating notification");
    }
    return data;
  }

  async listForUser(userId, limit = 50, cursor) {
    let query = supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (cursor) {
      query = query.lt("created_at", cursor);
    }
    const { data, error } = await query;
    if (error) {
      logger.error({ error, userId }, "NotificationRepository.listForUser failed");
      throw new Error("Database error fetching notifications");
    }
    return data || [];
  }
}

export const notificationRepository = new NotificationRepository();

