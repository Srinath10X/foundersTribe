import { messageRepository } from "../repositories/messageRepository.js";
import { reactionRepository } from "../repositories/reactionRepository.js";
import { readRepository } from "../repositories/readRepository.js";
import { groupMemberRepository } from "../repositories/groupMemberRepository.js";
import { groupRepository } from "../repositories/groupRepository.js";
import { tribeMemberRepository } from "../repositories/tribeMemberRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

/**
 * Aggregate raw reaction rows into { emoji, count, user_reacted } format.
 */
function aggregateReactions(message, currentUserId) {
  const raw = message.tribe_message_reactions || [];
  const map = {};
  for (const r of raw) {
    if (!map[r.emoji]) {
      map[r.emoji] = { emoji: r.emoji, count: 0, user_reacted: false };
    }
    map[r.emoji].count++;
    if (r.user_id === currentUserId) map[r.emoji].user_reacted = true;
  }
  const reactions = Object.values(map);
  const { tribe_message_reactions, ...rest } = message;
  return { ...rest, reactions };
}

export async function sendMessage(groupId, senderId, data) {
  // Look up the group to get its tribe_id
  const group = await groupRepository.getById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  // Verify tribe membership (any tribe member can post in a group)
  const isTribeMember = await tribeMemberRepository.isMember(group.tribe_id, senderId);
  if (!isTribeMember) throw new AppError("Not a member of this tribe", 403);

  // Auto-join the group if not already a member
  const isGroupMember = await groupMemberRepository.isMember(groupId, senderId);
  if (!isGroupMember) {
    await groupMemberRepository.add(groupId, senderId, "member");
  }

  // Check if announcement group — only admins can post
  if (group.is_readonly) {
    const member = await groupMemberRepository.get(groupId, senderId);
    if (!member || member.role !== "admin") {
      throw new AppError("Only admins can post in announcement groups", 403);
    }
  }

  const message = await messageRepository.create(groupId, senderId, data);
  logger.info({ messageId: message.id, groupId, senderId }, "Message sent");
  return aggregateReactions(message, senderId);
}

export async function getMessages(groupId, userId, cursor, limit) {
  // Look up the group to get its tribe_id
  const group = await groupRepository.getById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  // Verify tribe membership (any tribe member can read group messages)
  const isTribeMember = await tribeMemberRepository.isMember(group.tribe_id, userId);
  if (!isTribeMember) throw new AppError("Not a member of this tribe", 403);

  const messages = await messageRepository.listByGroup(groupId, cursor, limit);

  // Batch-fetch reactions for all messages in one query
  const messageIds = messages.map((m) => m.id);
  const allReactions = await reactionRepository.listByMessageIds(messageIds);

  // Group reactions by message_id
  const reactionsByMsg = {};
  for (const r of allReactions) {
    if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
    reactionsByMsg[r.message_id].push(r);
  }

  // Attach reactions and aggregate
  const enriched = messages.map((m) => {
    const withReactions = { ...m, tribe_message_reactions: reactionsByMsg[m.id] || [] };
    return aggregateReactions(withReactions, userId);
  });

  // Build next cursor from last message
  const nextCursor = enriched.length === limit
    ? enriched[enriched.length - 1].created_at
    : null;

  return {
    messages: enriched,
    next_cursor: nextCursor,
    has_more: enriched.length === limit,
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
