import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class ProfileRepository {
  async getByUserId(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error, userId }, "ProfileRepository.getByUserId failed");
      throw new Error("Database error fetching profile");
    }
    return data;
  }

  async update(userId, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      logger.error({ error, userId }, "ProfileRepository.update failed");
      throw new Error("Database error updating profile");
    }
    return data;
  }
}

export const profileRepository = new ProfileRepository();
