import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

const router = Router();

// Tables that have a FK reference to profiles.id — leaves first, parents last.
const PROFILE_DEPS = [
  { table: "tribe_messages", column: "sender_id" },
  { table: "tribe_members", column: "user_id" },
  { table: "tribes", column: "created_by" },
  { table: "feed_post_comments", column: "user_id" },
  { table: "feed_post_likes", column: "user_id" },
  { table: "feed_posts", column: "author_id" },
  { table: "messages", column: "sender_id" },
  { table: "proposals", column: "freelancer_id" },
  { table: "contracts", column: "freelancer_id" },
  { table: "contracts", column: "founder_id" },
  { table: "gigs", column: "founder_id" },
];

/**
 * DELETE /api/account
 * Permanently deletes the authenticated user's account.
 */
router.delete("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not found", 401, "unauthorized");
    }

    logger.info({ userId }, "Deleting user account");

    // Clean up all dependent rows (multiple passes for inter-table FKs)
    for (let pass = 0; pass < 3; pass++) {
      let blocked = false;
      for (const { table, column } of PROFILE_DEPS) {
        const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
        if (error?.message.includes("foreign key constraint")) {
          blocked = true;
        }
      }
      if (!blocked) break;
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      logger.error({ userId, error: profileError.message }, "Failed to delete profile");
      throw new AppError("Failed to delete account: " + profileError.message, 500, "delete_failed");
    }

    // Delete auth user (hard delete, then soft delete as fallback)
    let { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      const soft = await supabaseAdmin.auth.admin.deleteUser(userId, true);
      authError = soft.error;
    }

    if (authError) {
      logger.warn({ userId, error: authError.message }, "Auth user cleanup incomplete");
    }

    logger.info({ userId }, "User account deleted successfully");
    res.status(200).json({ data: { message: "Account deleted successfully" } });
  } catch (err) {
    next(err);
  }
});

export default router;
