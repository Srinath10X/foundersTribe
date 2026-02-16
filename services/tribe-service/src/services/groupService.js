import { groupRepository } from "../repositories/groupRepository.js";
import { groupMemberRepository } from "../repositories/groupMemberRepository.js";
import { tribeMemberRepository } from "../repositories/tribeMemberRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

export async function createGroup(tribeId, userId, data) {
  // Check user is admin/owner of the tribe
  const role = await tribeMemberRepository.getRole(tribeId, userId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new AppError("Only owner or admin can create groups", 403);
  }

  const group = await groupRepository.create(tribeId, userId, data);

  // Add creator as group admin
  await groupMemberRepository.add(group.id, userId, "admin");

  logger.info({ groupId: group.id, tribeId, userId }, "Group created");
  return group;
}

export async function getGroup(groupId, userId) {
  const group = await groupRepository.getById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  // Check user is a member of the parent tribe
  const isMember = await tribeMemberRepository.isMember(group.tribe_id, userId);
  if (!isMember) throw new AppError("Group not found", 404);

  return group;
}

export async function updateGroup(groupId, userId, updates) {
  const group = await groupRepository.getById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  const role = await tribeMemberRepository.getRole(group.tribe_id, userId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new AppError("Only owner or admin can update groups", 403);
  }

  const updated = await groupRepository.update(groupId, updates);
  logger.info({ groupId, userId }, "Group updated");
  return updated;
}

export async function deleteGroup(groupId, userId) {
  const group = await groupRepository.getById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  if (group.type === "announcement") {
    throw new AppError("Cannot delete announcement group", 400);
  }

  const role = await tribeMemberRepository.getRole(group.tribe_id, userId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new AppError("Only owner or admin can delete groups", 403);
  }

  await groupRepository.softDelete(groupId);
  logger.info({ groupId, userId }, "Group deleted");
}

export async function listGroups(tribeId, userId) {
  // Check membership
  const isMember = await tribeMemberRepository.isMember(tribeId, userId);
  if (!isMember) throw new AppError("Not a member of this tribe", 403);

  return await groupRepository.listByTribe(tribeId);
}

export async function getGroupMembers(groupId, userId, cursor, limit) {
  const isMember = await groupMemberRepository.isMember(groupId, userId);
  if (!isMember) throw new AppError("Not a member of this group", 403);

  return await groupMemberRepository.listByGroup(groupId, cursor, limit);
}
