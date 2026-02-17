import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { sendMessageSchema, listMessagesSchema, seenSchema } from "../schemas/chatSchemas.js";
import * as chatService from "../services/chatService.js";

const router = Router();

router.get(
  "/:matchId/messages",
  validate(listMessagesSchema),
  async (req, res, next) => {
    try {
      const messages = await chatService.listMessages(
        req.params.matchId,
        req.user.id,
        req.query.cursor,
        req.query.limit || 50,
      );
      res.json({ data: messages });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:matchId/messages",
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      const message = await chatService.sendMessage(
        req.params.matchId,
        req.user.id,
        req.body.content,
      );
      res.status(201).json({ data: message });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:matchId/seen",
  validate(seenSchema),
  async (req, res, next) => {
    try {
      await chatService.markSeen(
        req.params.matchId,
        req.user.id,
        req.body.lastMessageId,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

router.get("/starter-prompts", async (_req, res, next) => {
  try {
    const prompts = chatService.getStarterPrompts();
    res.json({ data: prompts });
  } catch (err) {
    next(err);
  }
});

export default router;

