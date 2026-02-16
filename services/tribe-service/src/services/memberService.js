import { tribeMemberRepository } from "../repositories/tribeMemberRepository.js";
import { groupMemberRepository } from "../repositories/groupMemberRepository.js";
import { groupRepository } from "../repositories/groupRepository.js";
import { banRepository } from "../repositories/banRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

// ---- Tribe Membership ----

export async function joinTribe(tribeId, userId) {
  // Check if banned
  const isBanned = await banRepository.isBanned(tribeId, userId);
  if (isBanned) throw new AppError("You are banned from this tribe", 403);

  // Check if already a member
  const existing = await tribeMemberRepository.get(tribeId, userId);
  if (existing) throw new AppError("Already a member", 409);

  const member = await tribeMemberRepository.add(tribeId, userId, "member");
  // DB trigger auto-adds to announcement group
  logger.info({ tribeId, userId }, "User joined tribe");
  return member;
}

export async function leaveTribe(tribeId, userId) {
  const member = await tribeMemberRepository.get(tribeId, userId);
  if (!member) throw new AppError("Not a member", 404);

  if (member.role === "owner") {
    throw new AppError("Owner cannot leave tribe. Transfer ownership first.", 400);
  }

  await tribeMemberRepository.softDelete(tribeId, userId);
  // DB trigger handles announcement group removal and count decrement
  logger.info({ tribeId, userId }, "User left tribe");
}

export async function getTribeMembers(tribeId, userId, cursor, limit) {
  const isMember = await tribeMemberRepository.isMember(tribeId, userId);
  if (!isMember) throw new AppError("Not a member of this tribe", 403);

  return await tribeMemberRepository.listByTribe(tribeId, cursor, limit);
}

export async function changeRole(tribeId, actorId, targetUserId, newRole) {
  const actorRole = await tribeMemberRepository.getRole(tribeId, actorId);

  // Only owner can promote to admin; owner/admin can change other roles
  if (newRole === "admin" && actorRole !== "owner") {
    throw new AppError("Only owner can promote to admin", 403);
  }

  if (!actorRole || !["owner", "admin"].includes(actorRole)) {
    throw new AppError("Insufficient permissions", 403);
  }

  // Cannot change owner's role
  const targetRole = await tribeMemberRepository.getRole(tribeId, targetUserId);
  if (targetRole === "owner") {
    throw new AppError("Cannot change owner's role", 400);
  }

  const updated = await tribeMemberRepository.updateRole(tribeId, targetUserId, newRole);
  logger.info({ tribeId, actorId, targetUserId, newRole }, "Role changed");
  return updated;
}

export async function removeMember(tribeId, actorId, targetUserId) {
  const actorRole = await tribeMemberRepository.getRole(tribeId, actorId);
  if (!actorRole || !["owner", "admin"].includes(actorRole)) {
    throw new AppError("Insufficient permissions", 403);
  }

  const targetRole = await tribeMemberRepository.getRole(tribeId, targetUserId);
  if (targetRole === "owner") {
    throw new AppError("Cannot remove owner", 400);
  }

  await tribeMemberRepository.softDelete(tribeId, targetUserId);
  logger.info({ tribeId, actorId, targetUserId }, "Member removed");
}

// ---- Group Membership ----

export async function joinGroup(tribeId, groupId, userId) {
  // Verify tribe membership first
  const isTribeMember = await tribeMemberRepository.isMember(tribeId, userId);
  if (!isTribeMember) throw new AppError("Must be a tribe member first", 403);

  const group = await groupRepository.getById(groupId);
  if (!group || group.tribe_id !== tribeId) {
    throw new AppError("Group not found in this tribe", 404);
  }

  if (group.type === "announcement") {
    throw new AppError("Cannot manually join announcement group", 400);
  }

  const existing = await groupMemberRepository.get(groupId, userId);
  if (existing) throw new AppError("Already a member of this group", 409);

  const member = await groupMemberRepository.add(groupId, userId, "member");
  logger.info({ groupId, userId }, "User joined group");
  return member;
}

export async function leaveGroup(groupId, userId) {
  const member = await groupMemberRepository.get(groupId, userId);
  if (!member) throw new AppError("Not a member of this group", 404);

  const group = await groupRepository.getById(groupId);
  if (group?.type === "announcement") {
    throw new AppError("Cannot leave announcement group", 400);
  }

  await groupMemberRepository.softDelete(groupId, userId);
  logger.info({ groupId, userId }, "User left group");
}
