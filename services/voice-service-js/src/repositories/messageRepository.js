import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class MessageRepository {
  async createMessage(roomId, senderId, content) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content: content,
      })
      .select()
      .single();

    if (error) {
      logger.error(
        { error, roomId, senderId },
        "MessageRepository.createMessage failed",
      );
      throw new Error("Database error creating message");
    }
    return data;
  }

  async getMessages(roomId, cursor, limit = 50) {
    let query = supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error, roomId }, "MessageRepository.getMessages failed");
      throw new Error("Database error fetching messages");
    }
    return data || [];
  }

  async getMessagesSince(roomId, since) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .gt("created_at", since)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      logger.error(
        { error, roomId },
        "MessageRepository.getMessagesSince failed",
      );
      return [];
    }
    return data || [];
  }
}

export const messageRepository = new MessageRepository();
