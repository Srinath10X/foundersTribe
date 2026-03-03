import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stricter limiter for AI chat (expensive LLM calls) */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "rate_limited",
      message: "Too many AI requests. Please wait a moment and try again.",
      details: null,
    },
  },
});
