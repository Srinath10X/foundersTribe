import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { blockUserSchema, reportUserSchema } from "../schemas/moderationSchemas.js";
import * as moderationService from "../services/moderationService.js";

const router = Router();

router.post("/block", validate(blockUserSchema), async (req, res, next) => {
  try {
    const block = await moderationService.blockUser(
      req.user.id,
      req.body.blockedUserId,
      req.body.reason,
    );
    res.status(201).json({ data: block });
  } catch (err) {
    next(err);
  }
});

router.post("/report", validate(reportUserSchema), async (req, res, next) => {
  try {
    const report = await moderationService.reportUser(req.user.id, req.body);
    res.status(201).json({ data: report });
  } catch (err) {
    next(err);
  }
});

export default router;

