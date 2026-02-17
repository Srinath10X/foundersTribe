import { socketRateLimit, cleanupSocketRateLimit } from "../middleware/rateLimiter.js";

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    socket.on("join_match", ({ matchId }, callback) => {
      if (!socketRateLimit(socket.id)) {
        return callback?.({ error: "Rate limited" });
      }
      socket.join(`match:${matchId}`);
      callback?.({ success: true });
    });
    socket.on("leave_match", ({ matchId }, callback) => {
      socket.leave(`match:${matchId}`);
      callback?.({ success: true });
    });
    socket.on("typing", ({ matchId }) => {
      if (!socketRateLimit(socket.id, 30)) return;
      socket.to(`match:${matchId}`).emit("user_typing", {
        matchId,
        userId,
        timestamp: Date.now(),
      });
    });
    socket.on("stop_typing", ({ matchId }) => {
      socket.to(`match:${matchId}`).emit("user_stop_typing", {
        matchId,
        userId,
      });
    });
    socket.on("message", ({ matchId, message }) => {
      if (!socketRateLimit(socket.id)) return;
      socket.to(`match:${matchId}`).emit("message", {
        matchId,
        message,
      });
    });
    socket.on("seen", ({ matchId, lastMessageId }) => {
      socket.to(`match:${matchId}`).emit("seen", {
        matchId,
        userId,
        lastMessageId,
        timestamp: Date.now(),
      });
    });
    socket.on("disconnect", () => {
      cleanupSocketRateLimit(socket.id);
    });
  });
}

