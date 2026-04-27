import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.js";
import chatRoutes from "./routes/chat.js";
import accountRoutes from "./routes/account.js";
const app = express();
/**
 * Cloud Run / reverse proxy support
 */
app.set("trust proxy", true);
/**
 * Security Middleware
 */
app.use(helmet());
/**
 * CORS Configuration
 */
app.use(cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
    credentials: true,
}));
/**
 * Body Parser
 */
app.use(express.json({ limit: "1mb" }));
/**
 * Rate Limiter (AFTER trust proxy)
 */
app.use(apiRateLimiter);
/**
 * Public Routes
 */
app.use("/api/health", healthRoutes);
/**
 * Protected Routes (require auth)
 */
app.use(authMiddleware);
app.use("/api/ai", chatRoutes);
app.use("/api/account", accountRoutes);
/**
 * Global Error Handler (MUST BE LAST)
 */
app.use(errorHandler);
/**
 * Start server
 */
const PORT = env.PORT;
app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "ai-service running");
});
