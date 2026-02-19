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
    const executeUpdate = async (payload) =>
      supabase
        .from("profiles")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();

    let payload = { ...updates };
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data, error } = await executeUpdate(payload);
      if (!error) return data;

      // PGRST204 => unknown column in payload for current schema cache.
      if (error.code === "PGRST204") {
        const match = error.message?.match(/'([^']+)' column/);
        const unknownColumn = match?.[1];
        if (unknownColumn && unknownColumn in payload) {
          delete payload[unknownColumn];
          continue;
        }
      }

      logger.error({ error, userId, payloadKeys: Object.keys(payload) }, "ProfileRepository.update failed");
      throw new Error("Database error updating profile");
    }

    logger.error({ userId, payloadKeys: Object.keys(payload) }, "ProfileRepository.update exhausted retries");
    throw new Error("Database error updating profile");
  }
}

export const profileRepository = new ProfileRepository();
