import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class ReactionRepository {
  async add(messageId, userId, emoji) {
    const { data, error } = await supabase
      .from("tribe_message_reactions")
      .insert({ message_id: messageId, user_id: userId, emoji })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return null; // already reacted with this emoji
      logger.error({ error }, "ReactionRepository.add failed");
      throw new Error("Database error adding reaction");
    }
    return data;
  }

  async remove(messageId, userId, emoji) {
    const { error } = await supabase
      .from("tribe_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);

    if (error) {
      logger.error({ error }, "ReactionRepository.remove failed");
      throw new Error("Database error removing reaction");
    }
  }

  async listByMessage(messageId) {
    const { data, error } = await supabase
      .from("tribe_message_reactions")
      .select("*, profiles:user_id(id, username, display_name, avatar_url)")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ error }, "ReactionRepository.listByMessage failed");
      throw new Error("Database error listing reactions");
    }
    return data || [];
  }
}

export const reactionRepository = new ReactionRepository();
