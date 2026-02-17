import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

export class InviteRepository {
  async create(tribeId, createdBy, options = {}) {
    const code = crypto.randomBytes(4).toString("hex"); // 8-char hex code

    const { data, error } = await supabase
      .from("invite_links")
      .insert({
        tribe_id: tribeId,
        code,
        created_by: createdBy,
        max_uses: options.max_uses || null,
        expires_at: options.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "InviteRepository.create failed");
      throw new Error("Database error creating invite");
    }
    return data;
  }

  async getByCode(code) {
    const { data, error } = await supabase
      .from("invite_links")
      .select("*, tribes(id, name, avatar_url, member_count)")
      .eq("code", code)
      .eq("status", "active")
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logger.error({ error }, "InviteRepository.getByCode failed");
      throw new Error("Database error fetching invite");
    }
    return data;
  }

  async incrementUseCount(inviteId) {
    const { error } = await supabase.rpc("increment_invite_use_count", {
      p_invite_id: inviteId,
    });

    // Fallback if RPC not available
    if (error) {
      const { error: updateError } = await supabase
        .from("invite_links")
        .update({ use_count: supabase.raw("use_count + 1") })
        .eq("id", inviteId);

      if (updateError) {
        logger.error({ error: updateError }, "InviteRepository.incrementUseCount failed");
      }
    }
  }

  async revoke(inviteId) {
    const { error } = await supabase
      .from("invite_links")
      .update({ status: "revoked" })
      .eq("id", inviteId);

    if (error) {
      logger.error({ error }, "InviteRepository.revoke failed");
      throw new Error("Database error revoking invite");
    }
  }

  async listByTribe(tribeId) {
    const { data, error } = await supabase
      .from("invite_links")
      .select("*")
      .eq("tribe_id", tribeId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error }, "InviteRepository.listByTribe failed");
      throw new Error("Database error listing invites");
    }
    return data || [];
  }
}

export const inviteRepository = new InviteRepository();
