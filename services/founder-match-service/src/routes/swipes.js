import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { swipeRateLimiter } from "../middleware/rateLimiter.js";
import { nextCandidateQuerySchema, swipeBodySchema } from "../schemas/swipeSchemas.js";
import * as swipeService from "../services/swipeService.js";

const router = Router();

router.get("/next", validate(nextCandidateQuerySchema), async (req, res, next) => {
  try {
    const candidate = await swipeService.getNextCandidate(req.user.id, {
      role: req.query.role,
      stage: req.query.stage,
      commitment: req.query.commitment,
      industry: req.query.industry,
    });
    res.json({ data: candidate });
  } catch (err) {
    next(err);
  }
});

router.post("/", swipeRateLimiter, validate(swipeBodySchema), async (req, res, next) => {
  try {
    const result = await swipeService.recordSwipe(
      req.user.id,
      req.body.targetUserId,
      req.body.type,
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;

