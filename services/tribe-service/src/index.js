import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { createRedisAdapter } from "./config/redis.js";
import { logger } from "./utils/logger.js";
import { authMiddleware, socketAuthMiddleware } from "./middleware/auth.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { registerSocketHandlers } from "./socket/handlers.js";

// --- Routes ---
import healthRoutes from "./routes/health.js";
import tribeRoutes from "./routes/tribes.js";
import groupRoutes from "./routes/groups.js";
import messageRoutes from "./routes/messages.js";
import memberRoutes from "./routes/members.js";
import inviteRoutes from "./routes/invites.js";
import moderationRoutes from "./routes/moderation.js";
import profileRoutes from "./routes/profiles.js";

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------
// 🔒 Middleware
// ---------------------------------------------------
app.use(helmet());

app.use(
  cors({
    origin:
      env.CORS_ORIGIN === "*"
        ? "*"
        : env.CORS_ORIGIN.split(","),
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);

// ---------------------------------------------------
// 🌐 Public Routes
// ---------------------------------------------------
app.use("/api/health", healthRoutes);

// ---------------------------------------------------
// 🔐 Protected Routes
// ---------------------------------------------------
app.use("/api/tribes", authMiddleware, tribeRoutes);
app.use("/api/tribes/:tribeId/groups", authMiddleware, groupRoutes);
app.use("/api/groups/:groupId/messages", authMiddleware, messageRoutes);
app.use("/api", authMiddleware, memberRoutes);
app.use("/api/tribes/:tribeId/invites", authMiddleware, inviteRoutes);
app.use("/api/invites", authMiddleware, inviteRoutes);
app.use("/api/moderation", authMiddleware, moderationRoutes);
app.use("/api/profiles", authMiddleware, profileRoutes);

// ---------------------------------------------------
// ❌ Error Handler (must be last)
// ---------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------
// 🔌 Socket.io Setup
// ---------------------------------------------------
const io = new SocketIOServer(server, {
  cors: {
    origin:
      env.CORS_ORIGIN === "*"
        ? "*"
        : env.CORS_ORIGIN.split(","),
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
});

// Expose io to REST routes so they can emit realtime events after writes.
app.set("io", io);

// ---------------------------------------------------
// 🚀 Start Server (Non-Blocking for Cloud Run)
// ---------------------------------------------------
const PORT = process.env.PORT || 3003;

function start() {
  // 🔥 1️⃣ Bind to PORT immediately (Cloud Run requirement)
  server.listen(PORT, () => {
    logger.info(`🚀 tribe-service running on port ${PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
  });

  // 🔥 2️⃣ Background async initialization (non-blocking)
  (async () => {
    try {
      const adapter = await createRedisAdapter();
      io.adapter(adapter);
      logger.info("✅ Socket.io Redis adapter connected");
    } catch (err) {
      logger.warn(
        { err },
        "⚠️ Redis adapter failed — running without horizontal scaling",
      );
    }

    try {
      io.use(socketAuthMiddleware);
      registerSocketHandlers(io);
      logger.info("✅ Socket.io handlers registered");
    } catch (err) {
      logger.error({ err }, "❌ Socket initialization failed");
    }
  })();
}

start();

// ---------------------------------------------------
// 🛑 Graceful Shutdown
// ---------------------------------------------------
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down...`);

  io.close(() => logger.info("Socket.io closed"));

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
