import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { messageRateLimiter } from "../middleware/rateLimiter.js";
import {
  sendMessageSchema,
  editMessageSchema,
  messageIdParamSchema,
  messagesQuerySchema,
  reactionSchema,
} from "../schemas/messageSchemas.js";
import * as messageService from "../services/messageService.js";

const router = Router({ mergeParams: true });

// GET /api/groups/:groupId/messages — cursor-based paginated messages
router.get("/", validate(messagesQuerySchema), async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await messageService.getMessages(
      req.params.groupId, req.user.id, cursor, Number(limit) || 50,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:groupId/messages — send a message
router.post("/", messageRateLimiter, validate(sendMessageSchema), async (req, res, next) => {
  try {
    const message = await messageService.sendMessage(
      req.params.groupId, req.user.id, req.body,
    );
    res.status(201).json({ data: message });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/groups/:groupId/messages/:messageId — edit a message
router.patch("/:messageId", validate(editMessageSchema), async (req, res, next) => {
  try {
    const message = await messageService.editMessage(
      req.params.messageId, req.user.id, req.body.content,
    );
    res.json({ data: message });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:groupId/messages/:messageId — soft-delete a message
router.delete("/:messageId", validate(messageIdParamSchema), async (req, res, next) => {
  try {
    await messageService.deleteMessage(
      req.params.messageId, req.user.id, req.params.groupId,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- Reactions ----

// POST /api/groups/:groupId/messages/:messageId/reactions — add reaction
router.post("/:messageId/reactions", validate(reactionSchema), async (req, res, next) => {
  try {
    const reaction = await messageService.addReaction(
      req.params.messageId, req.user.id, req.body.emoji,
    );
    res.status(201).json({ data: reaction });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:groupId/messages/:messageId/reactions — remove reaction
router.delete("/:messageId/reactions", validate(reactionSchema), async (req, res, next) => {
  try {
    await messageService.removeReaction(
      req.params.messageId, req.user.id, req.body.emoji,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:groupId/messages/:messageId/reactions — list reactions
router.get("/:messageId/reactions", validate(messageIdParamSchema), async (req, res, next) => {
  try {
    const reactions = await messageService.getReactions(req.params.messageId);
    res.json({ data: reactions });
  } catch (err) {
    next(err);
  }
});

// ---- Read Receipts ----

// POST /api/groups/:groupId/messages/read — mark messages as read
router.post("/read", async (req, res, next) => {
  try {
    const { last_read_msg_id } = req.body;
    const receipt = await messageService.markAsRead(
      req.params.groupId, req.user.id, last_read_msg_id,
    );
    res.json({ data: receipt });
  } catch (err) {
    next(err);
  }
});

export default router;
