import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createRatingSchema } from "../schemas/ratingSchemas.js";
import * as ratingService from "../services/ratingService.js";

const router = Router({ mergeParams: true });

router.post("/", validate(createRatingSchema), async (req, res, next) => {
  try {
    const data = await ratingService.createRating(req.db, req.params.id as string, req.user.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
