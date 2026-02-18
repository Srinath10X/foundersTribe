import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema, userIdParamSchema } from "../schemas/profileSchemas.js";
import * as profileService from "../services/profileService.js";

const router = Router();

// GET /api/profiles/me — current user's full profile
router.get("/me", async (req, res, next) => {
  try {
    const profile = await profileService.getMyProfile(req.user.id);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/me — update current user's profile
router.patch("/me", validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.body);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/:userId — another user's public profile
router.get("/:userId", validate(userIdParamSchema), async (req, res, next) => {
  try {
    const profile = await profileService.getPublicProfile(req.params.userId);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

export default router;
