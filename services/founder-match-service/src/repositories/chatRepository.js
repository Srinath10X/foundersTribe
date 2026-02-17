import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class ChatRepository {
  async createMessage(matchId, senderId, content) {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content,
      })
      .select()
      .single();
    if (error) {
      logger.error({ error, matchId }, "ChatRepository.createMessage failed");
      throw new Error("Database error creating message");
    }
    return data;
  }

  async listMessages(matchId, cursor, limit = 50) {
    let query = supabase
      .from("chat_messages")
      .select("*")
      .eq("match_id", matchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (cursor) {
      query = query.lt("created_at", cursor);
    }
    const { data, error } = await query;
    if (error) {
      logger.error({ error, matchId }, "ChatRepository.listMessages failed");
      throw new Error("Database error fetching messages");
    }
    return data || [];
  }

  async markSeenByOther(matchId, messageId, viewerId) {
    const { error } = await supabase
      .from("chat_messages")
      .update({ seen_by_other_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("match_id", matchId)
      .neq("sender_id", viewerId);
    if (error) {
      logger.error({ error, matchId }, "ChatRepository.markSeenByOther failed");
    }
  }
}

export const chatRepository = new ChatRepository();

