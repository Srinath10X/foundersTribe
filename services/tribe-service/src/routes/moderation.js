import { Router } from "express";
import * as moderationService from "../services/moderationService.js";

const router = Router({ mergeParams: true });

// POST /api/tribes/:tribeId/bans — ban a user
router.post("/:tribeId/bans", async (req, res, next) => {
  try {
    const { user_id, reason } = req.body;
    const ban = await moderationService.banUser(
      req.params.tribeId, req.user.id, user_id, reason,
    );
    res.status(201).json({ data: ban });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tribes/:tribeId/bans/:userId — unban a user
router.delete("/:tribeId/bans/:userId", async (req, res, next) => {
  try {
    await moderationService.unbanUser(
      req.params.tribeId, req.user.id, req.params.userId,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/bans — list bans
router.get("/:tribeId/bans", async (req, res, next) => {
  try {
    const bans = await moderationService.listBans(req.params.tribeId, req.user.id);
    res.json({ data: bans });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/audit — get audit logs
router.get("/:tribeId/audit", async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const logs = await moderationService.getAuditLogs(
      req.params.tribeId, req.user.id, cursor, Number(limit) || 50,
    );
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
