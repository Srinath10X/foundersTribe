import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { createRedisAdapter, createRedisClient } from "./config/redis.js";
import { socketAuthMiddleware } from "./middleware/auth.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { clearAllGracePeriods, initGracePeriod } from "./socket/gracePeriod.js";
import roomsRouter from "./routes/rooms.js";
import healthRouter from "./routes/health.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = express();

  const server = http.createServer(app);

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(apiRateLimiter);

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.url }, "Request");
    next();
  });

  // Routes
  app.use("/api/health", healthRouter);
  app.use("/api", roomsRouter);

  // Error handler
  app.use(errorHandler);

  // ---- Socket.io Server ----
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    connectionStateRecovery: {
      maxDisconnectionDuration: 30000,
    },
  });

  try {
    const adapter = await createRedisAdapter();
    io.adapter(adapter);
    logger.info("✅ Socket.io Redis adapter connected");

    // Initialize grace period system with a standalone Redis client
    try {
      const graceRedis = await createRedisClient();
      initGracePeriod(graceRedis);
    } catch (graceErr) {
      logger.warn(
        { err: graceErr },
        "⚠️ Grace period Redis failed — using local-only mode",
      );
    }
  } catch (err) {
    logger.warn(
      { err },
      "⚠️ Redis adapter failed — running without horizontal scaling",
    );
  }

  io.use(socketAuthMiddleware);

  registerSocketHandlers(io);

  server.listen(parseInt(env.PORT), () => {
    logger.info(`🚀 Server running on port ${env.PORT}`);
    logger.info(`📡 Socket.io ready`);
    logger.info(`🔗 CORS origin: ${env.CORS_ORIGIN}`);
  });

  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    clearAllGracePeriods();
    io.close();
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
