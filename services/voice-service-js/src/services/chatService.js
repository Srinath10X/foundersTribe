import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { messageRepository } from "../repositories/messageRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import { supabase } from "../config/supabase.js";

export async function sendMessage(userId, roomId, content) {
  if (!content || content.trim().length === 0) {
    throw new AppError("Message content cannot be empty", 400);
  }
  if (content.length > 2000) {
    throw new AppError("Message too long (max 2000 characters)", 400);
  }

  const participant = await participantRepository.getParticipant(
    roomId,
    userId,
  );

  if (!participant || !participant.is_connected) {
    throw new AppError(
      "You must be a connected participant to send messages",
      403,
    );
  }

  const message = await messageRepository.createMessage(
    roomId,
    userId,
    content.trim(),
  );

  // Enrich with sender's display name
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    if (profile) {
      message.user_name = profile.display_name;
    }
  } catch {
    // non-critical — name will fall back to truncated user_id on client
  }

  logger.debug({ messageId: message.id, roomId, userId }, "Message sent");
  return message;
}

export async function getMessages(roomId, cursor, limit = 50) {
  const safeLimit = Math.min(limit, 100);

  const messages = await messageRepository.getMessages(
    roomId,
    cursor,
    safeLimit,
  );

  let nextCursor = null;

  if (messages.length > safeLimit) {
    nextCursor = messages[safeLimit - 1].created_at;
    messages.pop();
  }

  return { messages, nextCursor };
}

export async function getMessagesSince(roomId, since) {
  return await messageRepository.getMessagesSince(roomId, since);
}
