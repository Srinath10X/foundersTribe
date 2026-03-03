import { Router, Request, Response, NextFunction } from "express";
import { chatRequestSchema } from "../schemas/chatSchemas.js";
import { chatWithAI, clearFreelancerCache } from "../services/aiService.js";
import { chatRateLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * POST /api/ai/chat
 *
 * Body:
 *   { message: string, conversation_history: { role, content }[] }
 *
 * Returns:
 *   { data: ChatMessage }
 */
router.post(
  "/chat",
  chatRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = chatRequestSchema.parse(req.body);

      const result = await chatWithAI(
        body.message,
        body.conversation_history,
        req.accessToken!,
      );

      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/ai/clear-cache
 *
 * Clears the server-side freelancer pool cache.
 */
router.post(
  "/clear-cache",
  (_req: Request, res: Response) => {
    clearFreelancerCache();
    res.json({ data: { cleared: true } });
  },
);

export default router;
