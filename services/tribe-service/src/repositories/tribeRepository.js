import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class TribeRepository {
  async create(createdBy, data) {
    const { data: tribe, error } = await supabase
      .from("tribes")
      .insert({ ...data, created_by: createdBy })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "TribeRepository.create failed");
      throw new Error("Database error creating tribe");
    }
    return tribe;
  }

  async getById(tribeId) {
    const { data, error } = await supabase
      .from("tribes")
      .select("*")
      .eq("id", tribeId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error, tribeId }, "TribeRepository.getById failed");
      throw new Error("Database error fetching tribe");
    }
    return data;
  }

  async update(tribeId, updates) {
    const { data, error } = await supabase
      .from("tribes")
      .update(updates)
      .eq("id", tribeId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      logger.error({ error, tribeId }, "TribeRepository.update failed");
      throw new Error("Database error updating tribe");
    }
    return data;
  }

  async softDelete(tribeId) {
    const { error } = await supabase
      .from("tribes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", tribeId);

    if (error) {
      logger.error({ error, tribeId }, "TribeRepository.softDelete failed");
      throw new Error("Database error deleting tribe");
    }
  }

  async listPublic(cursor, limit = 20) {
    let query = supabase
      .from("tribes")
      .select("*")
      .eq("is_public", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error }, "TribeRepository.listPublic failed");
      throw new Error("Database error listing tribes");
    }
    return data || [];
  }

  async listByUser(userId) {
    const { data, error } = await supabase
      .from("tribe_members")
      .select("tribe_id, role, joined_at, tribes(*)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("joined_at", { ascending: false });

    if (error) {
      logger.error({ error, userId }, "TribeRepository.listByUser failed");
      throw new Error("Database error listing user tribes");
    }
    return data || [];
  }
}

export const tribeRepository = new TribeRepository();
