import { banRepository } from "../repositories/banRepository.js";
import { tribeMemberRepository } from "../repositories/tribeMemberRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { supabase } from "../config/supabase.js";

export async function banUser(tribeId, actorId, targetUserId, reason) {
  // Check actor permissions
  const actorRole = await tribeMemberRepository.getRole(tribeId, actorId);
  if (!actorRole || !["owner", "admin"].includes(actorRole)) {
    throw new AppError("Insufficient permissions to ban", 403);
  }

  // Cannot ban owner
  const targetRole = await tribeMemberRepository.getRole(tribeId, targetUserId);
  if (targetRole === "owner") {
    throw new AppError("Cannot ban the tribe owner", 400);
  }

  // Cannot ban someone with equal or higher role
  if (targetRole === "admin" && actorRole !== "owner") {
    throw new AppError("Cannot ban an admin. Only owner can ban admins.", 403);
  }

  const ban = await banRepository.ban(tribeId, targetUserId, actorId, reason);
  if (!ban) throw new AppError("User is already banned", 409);

  // Remove the banned user from the tribe
  await tribeMemberRepository.softDelete(tribeId, targetUserId);

  logger.info({ tribeId, actorId, targetUserId, reason }, "User banned");
  return ban;
}

export async function unbanUser(tribeId, actorId, targetUserId) {
  const actorRole = await tribeMemberRepository.getRole(tribeId, actorId);
  if (!actorRole || !["owner", "admin"].includes(actorRole)) {
    throw new AppError("Insufficient permissions to unban", 403);
  }

  await banRepository.unban(tribeId, targetUserId);
  logger.info({ tribeId, actorId, targetUserId }, "User unbanned");
}

export async function listBans(tribeId, actorId) {
  const role = await tribeMemberRepository.getRole(tribeId, actorId);
  if (!role || !["owner", "admin", "moderator"].includes(role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  return await banRepository.listByTribe(tribeId);
}

export async function getAuditLogs(tribeId, actorId, cursor, limit = 50) {
  const role = await tribeMemberRepository.getRole(tribeId, actorId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  let query = supabase
    .from("audit_logs")
    .select("*, profiles:actor_id(id, username, display_name)")
    .eq("tribe_id", tribeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    logger.error({ error }, "getAuditLogs failed");
    throw new Error("Database error fetching audit logs");
  }
  return data || [];
}
