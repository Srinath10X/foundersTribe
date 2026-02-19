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
import createRoomsRouter from "./routes/rooms.js";
import healthRouter from "./routes/health.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = express();
  app.set('trust proxy', 1);  
  const server = http.createServer(app);

  // ------------------------
  // Security middleware
  // ------------------------
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(apiRateLimiter);

  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.url }, "Request");
    next();
  });

  app.use("/api/health", healthRouter);

  // ------------------------
  // Socket.io
  // ------------------------
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    // Cloud Run kills idle connections after 60s.
    // Keep-alive via frequent pings well within that window.
    pingInterval: 10000,   // ping every 10s (was 25s)
    pingTimeout: 20000,    // give 20s for pong (was 60s)
    // Cloud Run: start with polling then upgrade to WebSocket
    transports: ["polling", "websocket"],
    maxHttpBufferSize: 1e6,
    connectionStateRecovery: {
      maxDisconnectionDuration: 120000, // 2 min recovery window
    },
  });

  app.use("/api", createRoomsRouter(io));
  app.use(errorHandler);

  io.use(socketAuthMiddleware);
  registerSocketHandlers(io);

  // ------------------------
  // 🚀 START SERVER FIRST
  // ------------------------
  const PORT = process.env.PORT || 3002;

  server.listen(parseInt(PORT), () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 Socket.io ready`);
    logger.info(`🔗 CORS origin: ${env.CORS_ORIGIN}`);
  });

  // ------------------------
  // 🔥 Background Init (Non-blocking)
  // ------------------------
  (async () => {
    try {
      const adapter = await createRedisAdapter();
      io.adapter(adapter);
      logger.info("✅ Redis adapter connected");
    } catch (err) {
      logger.warn(
        { err },
        "⚠️ Redis adapter failed — running without horizontal scaling",
      );
    }

    try {
      const graceRedis = await createRedisClient();
      initGracePeriod(graceRedis);
      logger.info("✅ Grace period Redis connected");
    } catch (err) {
      logger.warn(
        { err },
        "⚠️ Grace period Redis failed — local-only mode",
      );
    }
  })();

  // ------------------------
  // Graceful Shutdown
  // ------------------------
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
