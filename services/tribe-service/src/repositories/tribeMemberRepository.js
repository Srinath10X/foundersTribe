import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class TribeMemberRepository {
  async add(tribeId, userId, role = "member") {
    const { data, error } = await supabase
      .from("tribe_members")
      .insert({ tribe_id: tribeId, user_id: userId, role })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return null; // duplicate — already member
      logger.error({ error }, "TribeMemberRepository.add failed");
      throw new Error("Database error adding tribe member");
    }
    return data;
  }

  async get(tribeId, userId) {
    const { data, error } = await supabase
      .from("tribe_members")
      .select("*")
      .eq("tribe_id", tribeId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "TribeMemberRepository.get failed");
      throw new Error("Database error fetching member");
    }
    return data;
  }

  async listByTribe(tribeId, cursor, limit = 50) {
    let query = supabase
      .from("tribe_members")
      .select("*, profiles(id, username, display_name, avatar_url)")
      .eq("tribe_id", tribeId)
      .is("deleted_at", null)
      .order("joined_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("joined_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error }, "TribeMemberRepository.listByTribe failed");
      throw new Error("Database error listing members");
    }
    return data || [];
  }

  async updateRole(tribeId, userId, role) {
    const { data, error } = await supabase
      .from("tribe_members")
      .update({ role })
      .eq("tribe_id", tribeId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      logger.error({ error }, "TribeMemberRepository.updateRole failed");
      throw new Error("Database error updating role");
    }
    return data;
  }

  async softDelete(tribeId, userId) {
    const { error } = await supabase
      .from("tribe_members")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tribe_id", tribeId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      logger.error({ error }, "TribeMemberRepository.softDelete failed");
      throw new Error("Database error removing member");
    }
  }

  async isMember(tribeId, userId) {
    const { count, error } = await supabase
      .from("tribe_members")
      .select("id", { count: "exact", head: true })
      .eq("tribe_id", tribeId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      logger.error({ error }, "TribeMemberRepository.isMember failed");
      throw new Error("Database error checking membership");
    }
    return count > 0;
  }

  async getRole(tribeId, userId) {
    const member = await this.get(tribeId, userId);
    return member?.role || null;
  }
}

export const tribeMemberRepository = new TribeMemberRepository();
