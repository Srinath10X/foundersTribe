import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class BlockRepository {
  async isBlockedBetween(userA, userB) {
    const { data, error } = await supabase
      .from("user_blocks")
      .select("id, blocker_id, blocked_id, expires_at")
      .or(
        `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`,
      );
    if (error) {
      logger.error({ error, userA, userB }, "BlockRepository.isBlockedBetween failed");
      throw new Error("Database error checking block");
    }
    const now = new Date();
    return (data || []).some((row) => !row.expires_at || new Date(row.expires_at) > now);
  }

  async createBlock(blockerId, blockedId, reason, expiresAt) {
    const { data, error } = await supabase
      .from("user_blocks")
      .upsert(
        {
          blocker_id: blockerId,
          blocked_id: blockedId,
          reason: reason || null,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
        },
        { onConflict: "blocker_id,blocked_id" },
      )
      .select()
      .single();
    if (error) {
      logger.error({ error }, "BlockRepository.createBlock failed");
      throw new Error("Database error creating block");
    }
    return data;
  }
}

export const blockRepository = new BlockRepository();

