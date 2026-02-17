import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    logger.warn("Rate limit exceeded");
    res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  },
});

// Stricter rate limiter for message sending
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (_req, res) => {
    logger.warn("Message rate limit exceeded");
    res
      .status(429)
      .json({ error: "Message rate limit exceeded. Slow down." });
  },
});

// Socket rate limiting
const socketRateLimits = new Map();

export function socketRateLimit(socketId, maxPerMinute = 60) {
  const now = Date.now();
  const entry = socketRateLimits.get(socketId);

  if (!entry || now > entry.resetAt) {
    socketRateLimits.set(socketId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  entry.count++;
  if (entry.count > maxPerMinute) {
    logger.warn({ socketId }, "Socket rate limit exceeded");
    return false;
  }

  return true;
}

export function cleanupSocketRateLimit(socketId) {
  socketRateLimits.delete(socketId);
}
