import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class GroupMemberRepository {
  async add(groupId, userId, role = "member") {
    const { data, error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId, role })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return null; // already a member
      logger.error({ error }, "GroupMemberRepository.add failed");
      throw new Error("Database error adding group member");
    }
    return data;
  }

  async get(groupId, userId) {
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "GroupMemberRepository.get failed");
      throw new Error("Database error fetching group member");
    }
    return data;
  }

  async listByGroup(groupId, cursor, limit = 50) {
    let query = supabase
      .from("group_members")
      .select("*, profiles(id, username, display_name, avatar_url)")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("joined_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("joined_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error }, "GroupMemberRepository.listByGroup failed");
      throw new Error("Database error listing group members");
    }
    return data || [];
  }

  async softDelete(groupId, userId) {
    const { error } = await supabase
      .from("group_members")
      .update({ deleted_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      logger.error({ error }, "GroupMemberRepository.softDelete failed");
      throw new Error("Database error removing group member");
    }
  }

  async getSoftDeleted(groupId, userId) {
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "GroupMemberRepository.getSoftDeleted failed");
      throw new Error("Database error checking soft-deleted group member");
    }
    return data;
  }

  async resurrect(groupId, userId) {
    const { data, error } = await supabase
      .from("group_members")
      .update({
        deleted_at: null,
        role: "member",
        joined_at: new Date().toISOString(),
      })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .select()
      .single();

    if (error) {
      logger.error({ error }, "GroupMemberRepository.resurrect failed");
      throw new Error("Database error resurrecting group member");
    }
    return data;
  }

  async isMember(groupId, userId) {
    const { count, error } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      logger.error({ error }, "GroupMemberRepository.isMember failed");
      throw new Error("Database error checking group membership");
    }
    return count > 0;
  }
}

export const groupMemberRepository = new GroupMemberRepository();
