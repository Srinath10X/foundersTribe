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
// import { supabase } from "../config/supabase.js";




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

// --- Socket.io ---
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// --- Middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);

// --- Public routes ---
app.use("/api/health", healthRoutes);

// --- Protected routes ---
app.use("/api/tribes", authMiddleware, tribeRoutes);
app.use("/api/tribes/:tribeId/groups", authMiddleware, groupRoutes);
app.use("/api/groups/:groupId/messages", authMiddleware, messageRoutes);
app.use("/api", authMiddleware, memberRoutes);
app.use("/api/tribes/:tribeId/invites", authMiddleware, inviteRoutes);
app.use("/api/invites", authMiddleware, inviteRoutes);
app.use("/api/moderation", authMiddleware, moderationRoutes);
app.use("/api/profiles", authMiddleware, profileRoutes);

// --- Error handler ---
app.use(errorHandler);

// --- Start server ---
async function start() {
  try {
    // Connect Redis adapter for Socket.io
    const adapter = await createRedisAdapter();
    io.adapter(adapter);
    logger.info("✅ Socket.io Redis adapter connected");

    // Socket.io auth middleware
    io.use(socketAuthMiddleware);

    // Register socket event handlers
    registerSocketHandlers(io);

    server.listen(env.PORT, () => {
      logger.info(`🚀 tribe-service running on port ${env.PORT}`);
      logger.info(`📡 Environment: ${env.NODE_ENV}`);
    });
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email: 'outofbounds311@gmail.com',
    //   password: 'Praveenkumar'
    // })

    // console.log(data.session)
  } catch (err) {
    logger.error({ err }, "❌ Failed to start tribe-service");
    process.exit(1);
  }
}

start();

// --- Graceful shutdown ---
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down...`);

  io.close(() => logger.info("Socket.io closed"));

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error("Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
