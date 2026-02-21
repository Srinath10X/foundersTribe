import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { getUserProfileSchema, upsertUserProfileSchema } from "../schemas/userProfileSchemas.js";
import * as userProfileService from "../services/userProfileService.js";
const router = Router();
router.get("/me", validate(getUserProfileSchema), async (req, res, next) => {
    try {
        const data = await userProfileService.getMyProfile(req.db, req.user.id);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
router.put("/me", validate(upsertUserProfileSchema), async (req, res, next) => {
    try {
        const data = await userProfileService.upsertMyProfile(req.db, req.user.id, req.body);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
export default router;
