import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createRatingSchema, getMyRatingSchema } from "../schemas/ratingSchemas.js";
import * as ratingService from "../services/ratingService.js";
const router = Router({ mergeParams: true });
router.get("/", validate(getMyRatingSchema), async (req, res, next) => {
    try {
        const data = await ratingService.getMyRatingForContract(req.db, req.params.id, req.user.id);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
router.post("/", validate(createRatingSchema), async (req, res, next) => {
    try {
        const data = await ratingService.createRating(req.db, req.params.id, req.user.id, req.body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
export default router;
