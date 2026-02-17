import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class BanRepository {
  async ban(tribeId, userId, bannedBy, reason = null) {
    const { data, error } = await supabase
      .from("banned_users")
      .insert({
        tribe_id: tribeId,
        user_id: userId,
        banned_by: bannedBy,
        reason,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return null; // already banned
      logger.error({ error }, "BanRepository.ban failed");
      throw new Error("Database error banning user");
    }
    return data;
  }

  async unban(tribeId, userId) {
    const { error } = await supabase
      .from("banned_users")
      .delete()
      .eq("tribe_id", tribeId)
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "BanRepository.unban failed");
      throw new Error("Database error unbanning user");
    }
  }

  async isBanned(tribeId, userId) {
    const { data, error } = await supabase
      .from("banned_users")
      .select("id, expires_at")
      .eq("tribe_id", tribeId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return false;
      logger.error({ error }, "BanRepository.isBanned failed");
      throw new Error("Database error checking ban status");
    }

    // Check if ban has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // Auto-unban expired bans
      await this.unban(tribeId, userId);
      return false;
    }
    return true;
  }

  async listByTribe(tribeId) {
    const { data, error } = await supabase
      .from("banned_users")
      .select("*, profiles:user_id(id, username, display_name, avatar_url), banned_by_profile:banned_by(id, username, display_name)")
      .eq("tribe_id", tribeId)
      .order("banned_at", { ascending: false });

    if (error) {
      logger.error({ error }, "BanRepository.listByTribe failed");
      throw new Error("Database error listing bans");
    }
    return data || [];
  }
}

export const banRepository = new BanRepository();
