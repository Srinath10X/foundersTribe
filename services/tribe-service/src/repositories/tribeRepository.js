import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class TribeRepository {
  async getLiveMemberCount(tribeId) {
    const { count, error } = await supabase
      .from("tribe_members")
      .select("id", { count: "exact", head: true })
      .eq("tribe_id", tribeId)
      .is("deleted_at", null);

    if (error) {
      logger.error({ error, tribeId }, "TribeRepository.getLiveMemberCount failed");
      return 0;
    }
    return Number(count || 0);
  }

  async applyLiveMemberCounts(tribes) {
    const list = Array.isArray(tribes) ? tribes : [];
    if (!list.length) return list;

    const withCounts = await Promise.all(
      list.map(async (tribe) => ({
        ...tribe,
        member_count: await this.getLiveMemberCount(tribe.id),
      })),
    );
    return withCounts;
  }

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
    return {
      ...data,
      member_count: await this.getLiveMemberCount(tribeId),
    };
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
    return await this.applyLiveMemberCounts(data || []);
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
    const rows = data || [];
    const withCounts = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        tribes: row.tribes
          ? {
              ...row.tribes,
              member_count: await this.getLiveMemberCount(row.tribes.id),
            }
          : row.tribes,
      })),
    );
    return withCounts;
  }

  async incrementMemberCount(tribeId, delta) {
    // Fetch current count first, then update
    const tribe = await this.getById(tribeId);
    if (!tribe) return;
    const newCount = Math.max(0, (tribe.member_count || 0) + delta);
    const { error } = await supabase
      .from("tribes")
      .update({ member_count: newCount })
      .eq("id", tribeId);

    if (error) {
      logger.error({ error, tribeId, delta }, "TribeRepository.incrementMemberCount failed");
    }
  }

  async searchPublic(query, limit = 20) {
    const { data, error } = await supabase
      .from("tribes")
      .select("*")
      .eq("is_public", true)
      .is("deleted_at", null)
      .ilike("name", `%${query}%`)
      .order("member_count", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ error, query }, "TribeRepository.searchPublic failed");
      throw new Error("Database error searching tribes");
    }
    return await this.applyLiveMemberCounts(data || []);
  }
}

export const tribeRepository = new TribeRepository();
