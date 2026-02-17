import { inviteRepository } from "../repositories/inviteRepository.js";
import { tribeMemberRepository } from "../repositories/tribeMemberRepository.js";
import { banRepository } from "../repositories/banRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

export async function createInvite(tribeId, userId, options) {
  // Check user has permission to create invites
  const role = await tribeMemberRepository.getRole(tribeId, userId);
  if (!role || !["owner", "admin", "moderator"].includes(role)) {
    throw new AppError("Insufficient permissions to create invite", 403);
  }

  const invite = await inviteRepository.create(tribeId, userId, options);
  logger.info({ inviteId: invite.id, tribeId, userId }, "Invite created");
  return invite;
}

export async function redeemInvite(code, userId) {
  const invite = await inviteRepository.getByCode(code);
  if (!invite) throw new AppError("Invalid or expired invite code", 404);

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new AppError("Invite has expired", 410);
  }

  // Check max uses
  if (invite.max_uses && invite.use_count >= invite.max_uses) {
    throw new AppError("Invite has reached maximum uses", 410);
  }

  // Check if user is banned
  const isBanned = await banRepository.isBanned(invite.tribe_id, userId);
  if (isBanned) throw new AppError("You are banned from this tribe", 403);

  // Check if already a member
  const existing = await tribeMemberRepository.get(invite.tribe_id, userId);
  if (existing) throw new AppError("Already a member of this tribe", 409);

  // Join the tribe
  const member = await tribeMemberRepository.add(invite.tribe_id, userId, "member");

  // Increment use count
  await inviteRepository.incrementUseCount(invite.id);

  logger.info({ code, userId, tribeId: invite.tribe_id }, "Invite redeemed");
  return { tribe: invite.tribes, member };
}

export async function revokeInvite(inviteId, tribeId, userId) {
  const role = await tribeMemberRepository.getRole(tribeId, userId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  await inviteRepository.revoke(inviteId);
  logger.info({ inviteId, userId }, "Invite revoked");
}

export async function listInvites(tribeId, userId) {
  const role = await tribeMemberRepository.getRole(tribeId, userId);
  if (!role || !["owner", "admin", "moderator"].includes(role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  return await inviteRepository.listByTribe(tribeId);
}
