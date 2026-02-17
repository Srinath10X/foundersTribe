import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class GroupRepository {
  async create(tribeId, createdBy, data) {
    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        ...data,
        tribe_id: tribeId,
        created_by: createdBy,
        type: "subtribe",
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "GroupRepository.create failed");
      throw new Error("Database error creating group");
    }
    return group;
  }

  async getById(groupId) {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error, groupId }, "GroupRepository.getById failed");
      throw new Error("Database error fetching group");
    }
    return data;
  }

  async update(groupId, updates) {
    const { data, error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", groupId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      logger.error({ error, groupId }, "GroupRepository.update failed");
      throw new Error("Database error updating group");
    }
    return data;
  }

  async softDelete(groupId) {
    const { error } = await supabase
      .from("groups")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", groupId);

    if (error) {
      logger.error({ error, groupId }, "GroupRepository.softDelete failed");
      throw new Error("Database error deleting group");
    }
  }

  async listByTribe(tribeId) {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("tribe_id", tribeId)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      logger.error({ error }, "GroupRepository.listByTribe failed");
      throw new Error("Database error listing groups");
    }
    return data || [];
  }

  async listByUser(userId) {
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id, role, joined_at, groups(*)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("joined_at", { ascending: false });

    if (error) {
      logger.error({ error }, "GroupRepository.listByUser failed");
      throw new Error("Database error listing user groups");
    }
    return data || [];
  }
}

export const groupRepository = new GroupRepository();
