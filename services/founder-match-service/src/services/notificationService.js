import { notificationRepository } from "../repositories/notificationRepository.js";

export async function notifyMatchCreated(userId, matchId, otherUserId, compatibilityScore) {
  await notificationRepository.create(userId, "match_created", {
    matchId,
    otherUserId,
    compatibilityScore,
  });
}

export async function notifyNewMessage(userId, matchId, fromUserId, messageId) {
  await notificationRepository.create(userId, "new_message", {
    matchId,
    fromUserId,
    messageId,
  });
}

export async function notifySuperLikeReceived(userId, fromUserId) {
  await notificationRepository.create(userId, "super_like_received", {
    fromUserId,
  });
}

