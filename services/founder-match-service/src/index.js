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

import healthRoutes from "./routes/health.js";
import founderRoutes from "./routes/founders.js";
import swipeRoutes from "./routes/swipes.js";
import matchRoutes from "./routes/matches.js";
import chatRoutes from "./routes/chat.js";
import moderationRoutes from "./routes/moderation.js";
import notificationRoutes from "./routes/notifications.js";
import analyticsRoutes from "./routes/analytics.js";

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
// 🌐 Routes
// ---------------------------------------------------
app.use("/api/health", healthRoutes);

app.use("/api/founders", authMiddleware, founderRoutes);
app.use("/api/swipes", authMiddleware, swipeRoutes);
app.use("/api/matches", authMiddleware, matchRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/moderation", authMiddleware, moderationRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);

app.use(errorHandler);

// ---------------------------------------------------
// 🔌 Socket.io
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

// ---------------------------------------------------
// 🚀 Start Server (Cloud Run Optimized)
// ---------------------------------------------------
const PORT = process.env.PORT || 3004;

function start() {
  // 🔥 1️⃣ Bind to PORT immediately
  server.listen(PORT, () => {
    logger.info(`🚀 founder-match-service running on port ${PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
  });

  // 🔥 2️⃣ Background async initialization
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
  logger.info({ signal }, "Shutting down");

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
