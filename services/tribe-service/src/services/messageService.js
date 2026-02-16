import { messageRepository } from "../repositories/messageRepository.js";
import { reactionRepository } from "../repositories/reactionRepository.js";
import { readRepository } from "../repositories/readRepository.js";
import { groupMemberRepository } from "../repositories/groupMemberRepository.js";
import { groupRepository } from "../repositories/groupRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

export async function sendMessage(groupId, senderId, data) {
  // Verify group membership
  const isMember = await groupMemberRepository.isMember(groupId, senderId);
  if (!isMember) throw new AppError("Not a member of this group", 403);

  // Check if announcement group — only admins can post
  const group = await groupRepository.getById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  if (group.is_readonly) {
    const member = await groupMemberRepository.get(groupId, senderId);
    if (!member || member.role !== "admin") {
      throw new AppError("Only admins can post in announcement groups", 403);
    }
  }

  const message = await messageRepository.create(groupId, senderId, data);
  logger.info({ messageId: message.id, groupId, senderId }, "Message sent");
  return message;
}

export async function getMessages(groupId, userId, cursor, limit) {
  // Verify membership
  const isMember = await groupMemberRepository.isMember(groupId, userId);
  if (!isMember) throw new AppError("Not a member of this group", 403);

  const messages = await messageRepository.listByGroup(groupId, cursor, limit);

  // Build next cursor from last message
  const nextCursor = messages.length === limit
    ? messages[messages.length - 1].created_at
    : null;

  return {
    messages,
    next_cursor: nextCursor,
    has_more: messages.length === limit,
  };
}

export async function editMessage(messageId, userId, content) {
  const message = await messageRepository.getById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  if (message.sender_id !== userId) {
    throw new AppError("Can only edit your own messages", 403);
  }

  const updated = await messageRepository.update(messageId, content);
  logger.info({ messageId, userId }, "Message edited");
  return updated;
}

export async function deleteMessage(messageId, userId, groupId) {
  const message = await messageRepository.getById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  // User can delete own message, or group admin can delete any message
  if (message.sender_id !== userId) {
    const member = await groupMemberRepository.get(groupId, userId);
    if (!member || member.role !== "admin") {
      throw new AppError("Cannot delete this message", 403);
    }
  }

  await messageRepository.softDelete(messageId);
  logger.info({ messageId, userId }, "Message deleted");
}

// ---- Reactions ----

export async function addReaction(messageId, userId, emoji) {
  const reaction = await reactionRepository.add(messageId, userId, emoji);
  if (!reaction) throw new AppError("Already reacted with this emoji", 409);
  return reaction;
}

export async function removeReaction(messageId, userId, emoji) {
  await reactionRepository.remove(messageId, userId, emoji);
}

export async function getReactions(messageId) {
  return await reactionRepository.listByMessage(messageId);
}

// ---- Read Receipts ----

export async function markAsRead(groupId, userId, lastReadMsgId) {
  return await readRepository.upsert(groupId, userId, lastReadMsgId);
}

export async function getUnreadCounts(userId) {
  return await readRepository.getByUser(userId);
}
