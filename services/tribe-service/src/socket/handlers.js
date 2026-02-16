import { logger } from "../utils/logger.js";
import { socketRateLimit, cleanupSocketRateLimit } from "../middleware/rateLimiter.js";
import { groupMemberRepository } from "../repositories/groupMemberRepository.js";

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    logger.info({ userId, socketId: socket.id }, "Socket connected");

    // ---- Join a group channel ----
    socket.on("join_group", async ({ groupId }, callback) => {
      try {
        if (!socketRateLimit(socket.id)) {
          return callback?.({ error: "Rate limited" });
        }

        // Verify group membership
        const isMember = await groupMemberRepository.isMember(groupId, userId);
        if (!isMember) {
          return callback?.({ error: "Not a member of this group" });
        }

        socket.join(`group:${groupId}`);
        logger.debug({ userId, groupId }, "Joined group channel");
        callback?.({ success: true });
      } catch (err) {
        logger.error({ err, groupId }, "join_group failed");
        callback?.({ error: "Failed to join group channel" });
      }
    });

    // ---- Leave a group channel ----
    socket.on("leave_group", ({ groupId }, callback) => {
      socket.leave(`group:${groupId}`);
      logger.debug({ userId, groupId }, "Left group channel");
      callback?.({ success: true });
    });

    // ---- Typing indicator ----
    socket.on("typing", ({ groupId }) => {
      if (!socketRateLimit(socket.id, 30)) return;

      socket.to(`group:${groupId}`).emit("user_typing", {
        groupId,
        userId,
        timestamp: Date.now(),
      });
    });

    socket.on("stop_typing", ({ groupId }) => {
      socket.to(`group:${groupId}`).emit("user_stop_typing", {
        groupId,
        userId,
      });
    });

    // ---- Broadcast new message to group (called after REST create) ----
    socket.on("new_message", ({ groupId, message }) => {
      if (!socketRateLimit(socket.id)) return;

      socket.to(`group:${groupId}`).emit("message", {
        groupId,
        message,
      });
    });

    // ---- Broadcast message read receipt ----
    socket.on("message_read", ({ groupId, lastReadMsgId }) => {
      socket.to(`group:${groupId}`).emit("user_read", {
        groupId,
        userId,
        lastReadMsgId,
        timestamp: Date.now(),
      });
    });

    // ---- Broadcast message edit ----
    socket.on("message_edited", ({ groupId, messageId, content }) => {
      socket.to(`group:${groupId}`).emit("message_updated", {
        groupId,
        messageId,
        content,
        editedAt: new Date().toISOString(),
      });
    });

    // ---- Broadcast message deletion ----
    socket.on("message_deleted", ({ groupId, messageId }) => {
      socket.to(`group:${groupId}`).emit("message_removed", {
        groupId,
        messageId,
      });
    });

    // ---- Disconnect cleanup ----
    socket.on("disconnect", (reason) => {
      cleanupSocketRateLimit(socket.id);
      logger.info({ userId, socketId: socket.id, reason }, "Socket disconnected");
    });
  });
}
