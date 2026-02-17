import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { upsertProfileSchema, publicProfileQuerySchema } from "../schemas/founderSchemas.js";
import * as founderService from "../services/founderService.js";
import { computeCompatibility } from "../services/compatibilityService.js";

const router = Router();

router.post("/me/profile", validate(upsertProfileSchema), async (req, res, next) => {
  try {
    const profile = await founderService.upsertProfile(req.user.id, req.body);
    res.status(201).json({ data: profile });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:userId/public-profile",
  validate(publicProfileQuerySchema),
  async (req, res, next) => {
    try {
      const viewerId = req.user?.id;
      const profile = await founderService.getPublicProfile(
        viewerId,
        req.params.userId,
        (viewer, target) => computeCompatibility(viewer, target),
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

