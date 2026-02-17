import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class ReadRepository {
  async upsert(groupId, userId, lastReadMsgId) {
    const { data, error } = await supabase
      .from("tribe_message_reads")
      .upsert(
        {
          group_id: groupId,
          user_id: userId,
          last_read_msg_id: lastReadMsgId,
          last_read_at: new Date().toISOString(),
          unread_count: 0,
        },
        { onConflict: "group_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      logger.error({ error }, "ReadRepository.upsert failed");
      throw new Error("Database error updating read receipt");
    }
    return data;
  }

  async getByUser(userId) {
    const { data, error } = await supabase
      .from("tribe_message_reads")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "ReadRepository.getByUser failed");
      throw new Error("Database error fetching read receipts");
    }
    return data || [];
  }

  async getByGroupAndUser(groupId, userId) {
    const { data, error } = await supabase
      .from("tribe_message_reads")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "ReadRepository.getByGroupAndUser failed");
      throw new Error("Database error fetching read receipt");
    }
    return data;
  }

  async incrementUnread(groupId, excludeUserId) {
    // Increment unread_count for all members of this group except the sender
    const { error } = await supabase.rpc("increment_unread_count", {
      p_group_id: groupId,
      p_exclude_user_id: excludeUserId,
    });

    if (error) {
      // Non-critical — log but don't throw
      logger.warn({ error, groupId }, "ReadRepository.incrementUnread failed (non-critical)");
    }
  }
}

export const readRepository = new ReadRepository();
