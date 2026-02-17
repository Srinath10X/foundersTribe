import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class MessageRepository {
  /**
   * Send a message. Uses service-role client to bypass RLS since
   * authorization is checked at the service layer.
   */
  async create(groupId, senderId, data) {
    const { data: message, error } = await supabase
      .from("tribe_messages")
      .insert({
        group_id: groupId,
        sender_id: senderId,
        type: data.type || "text",
        content: data.content,
        media_url: data.media_url,
        media_metadata: data.media_metadata,
        reply_to_id: data.reply_to_id,
      })
      .select("*, profiles:sender_id(id, username, display_name, avatar_url)")
      .single();

    if (error) {
      logger.error({ error }, "MessageRepository.create failed");
      throw new Error("Database error sending message");
    }
    return message;
  }

  /**
   * Cursor-based pagination. No OFFSET.
   * Uses index: (group_id, created_at DESC, id)
   */
  async listByGroup(groupId, cursor, limit = 50) {
    let query = supabase
      .from("tribe_messages")
      .select("*, profiles:sender_id(id, username, display_name, avatar_url)")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error }, "MessageRepository.listByGroup failed");
      throw new Error("Database error fetching messages");
    }
    return data || [];
  }

  async getById(messageId) {
    const { data, error } = await supabase
      .from("tribe_messages")
      .select("*, profiles:sender_id(id, username, display_name, avatar_url)")
      .eq("id", messageId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "MessageRepository.getById failed");
      throw new Error("Database error fetching message");
    }
    return data;
  }

  async update(messageId, content) {
    const { data, error } = await supabase
      .from("tribe_messages")
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      logger.error({ error }, "MessageRepository.update failed");
      throw new Error("Database error updating message");
    }
    return data;
  }

  async softDelete(messageId) {
    const { error } = await supabase
      .from("tribe_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) {
      logger.error({ error }, "MessageRepository.softDelete failed");
      throw new Error("Database error deleting message");
    }
  }
}

export const messageRepository = new MessageRepository();
