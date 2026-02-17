import { chatRepository } from "../repositories/chatRepository.js";
import { matchRepository } from "../repositories/matchRepository.js";
import { blockRepository } from "../repositories/blockRepository.js";
import { AppError } from "../utils/AppError.js";
import { notifyNewMessage } from "./notificationService.js";
import {
  trackConversationStarted,
  trackFirstMessageSent,
} from "./analyticsService.js";

async function ensureCanMessage(match, userId, targetUserId) {
  if (!match || match.status !== "active") {
    throw new AppError("Match not active", 400);
  }
  if (match.user1_id !== userId && match.user2_id !== userId) {
    throw new AppError("Forbidden", 403);
  }
  const blocked = await blockRepository.isBlockedBetween(userId, targetUserId);
  if (blocked) {
    throw new AppError("Messaging blocked user is not allowed", 400);
  }
}

export async function sendMessage(matchId, senderId, content) {
  const match = await matchRepository.getById(matchId);
  if (!match) {
    throw new AppError("Match not found", 404);
  }
  const recipientId = match.user1_id === senderId ? match.user2_id : match.user1_id;
  await ensureCanMessage(match, senderId, recipientId);
  const message = await chatRepository.createMessage(matchId, senderId, content);
  const ts = new Date(message.created_at);
  await matchRepository.updateMatchLastMessage(matchId, ts);
  const { data: existingMessages } = { data: null };
  if (!existingMessages) {
    await trackConversationStarted(senderId, matchId);
    await trackFirstMessageSent(senderId, matchId);
  }
  await notifyNewMessage(recipientId, matchId, senderId, message.id);
  return message;
}

export async function listMessages(matchId, userId, cursor, limit = 50) {
  const match = await matchRepository.getById(matchId);
  if (!match) {
    throw new AppError("Match not found", 404);
  }
  if (match.user1_id !== userId && match.user2_id !== userId) {
    throw new AppError("Forbidden", 403);
  }
  const messages = await chatRepository.listMessages(matchId, cursor, limit);
  return messages;
}

export async function markSeen(matchId, viewerId, lastMessageId) {
  const match = await matchRepository.getById(matchId);
  if (!match) {
    throw new AppError("Match not found", 404);
  }
  if (match.user1_id !== viewerId && match.user2_id !== viewerId) {
    throw new AppError("Forbidden", 403);
  }
  if (lastMessageId) {
    await chatRepository.markSeenByOther(matchId, lastMessageId, viewerId);
  }
  await matchRepository.setReadPointer(matchId, viewerId, lastMessageId);
}

export function getStarterPrompts() {
  return [
    "What is the biggest problem you are excited to solve right now?",
    "How do you like to work with a co-founder day to day?",
    "What does success look like for you in the next 12 months?",
  ];
}

