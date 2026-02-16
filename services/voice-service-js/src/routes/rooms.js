import { Router } from "express";
import * as roomService from "../services/roomService.js";
import * as chatService from "../services/chatService.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createRoomSchema } from "../schemas/roomSchemas.js";

const router = Router();

router.use(authMiddleware);

router.get("/get_all_available_rooms", async (_req, res, next) => {
  try {
    const rooms = await roomService.getActiveRooms();
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/create_room",
  validate(createRoomSchema),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { title, type } = req.body;

      const result = await roomService.createRoom(userId, title, type);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/:id", async (req, res, next) => {
  try {
    const roomState = await roomService.getRoomState(req.params.id);
    res.json(roomState);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/messages", async (req, res, next) => {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 50;

    const result = await chatService.getMessages(req.params.id, cursor, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
