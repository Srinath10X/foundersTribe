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

const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);

app.use("/api/health", healthRoutes);

app.use("/api/founders", authMiddleware, founderRoutes);
app.use("/api/swipes", authMiddleware, swipeRoutes);
app.use("/api/matches", authMiddleware, matchRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/moderation", authMiddleware, moderationRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);

app.use(errorHandler);

async function start() {
  try {
    const adapter = await createRedisAdapter();
    io.adapter(adapter);
    logger.info("Socket.io Redis adapter connected");

    io.use(socketAuthMiddleware);
    registerSocketHandlers(io);

    server.listen(env.PORT, () => {
      logger.info(`founder-match-service running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start founder-match-service");
    process.exit(1);
  }
}

start();

const shutdown = async (signal) => {
  logger.info({ signal }, "Shutting down");
  io.close();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

