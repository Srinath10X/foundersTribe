import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { listNotificationsSchema } from "../schemas/notificationSchemas.js";
import * as notificationService from "../services/notificationService.js";

const router = Router();

router.get("/", validate(listNotificationsSchema), async (req, res, next) => {
  try {
    const data = await notificationService.listNotifications(req.db, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
