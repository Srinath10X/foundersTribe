import { Router } from "express";
import { notificationRepository } from "../repositories/notificationRepository.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const items = await notificationRepository.listForUser(
      req.user.id,
      Number(req.query.limit) || 50,
      req.query.cursor,
    );
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

export default router;

