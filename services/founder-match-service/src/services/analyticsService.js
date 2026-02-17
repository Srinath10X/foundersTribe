import { analyticsRepository } from "../repositories/analyticsRepository.js";

export async function trackSwipe(userId, targetUserId, type) {
  await analyticsRepository.trackEvent(userId, "swipe", {
    targetUserId,
    type,
  });
}

export async function trackMatchCreated(userA, userB, compatibilityScore) {
  await analyticsRepository.trackEvent(userA, "match_created", {
    withUserId: userB,
    compatibilityScore,
  });
  await analyticsRepository.trackEvent(userB, "match_created", {
    withUserId: userA,
    compatibilityScore,
  });
}

export async function trackConversationStarted(userId, matchId) {
  await analyticsRepository.trackEvent(userId, "conversation_started", {
    matchId,
  });
}

export async function trackFirstMessageSent(userId, matchId) {
  await analyticsRepository.trackEvent(userId, "first_message_sent", {
    matchId,
  });
}

export async function trackRetentionAfterMatch(userId, matchId, days) {
  await analyticsRepository.trackEvent(userId, "retention_after_match", {
    matchId,
    days,
  });
}

