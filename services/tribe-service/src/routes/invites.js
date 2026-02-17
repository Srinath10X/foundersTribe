import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createInviteSchema, redeemInviteSchema } from "../schemas/inviteSchemas.js";
import * as inviteService from "../services/inviteService.js";

const router = Router({ mergeParams: true });

// POST /api/tribes/:tribeId/invites — create invite link
router.post("/", validate(createInviteSchema), async (req, res, next) => {
  try {
    const invite = await inviteService.createInvite(
      req.params.tribeId, req.user.id, req.body,
    );
    res.status(201).json({ data: invite });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/invites — list invites
router.get("/", async (req, res, next) => {
  try {
    const invites = await inviteService.listInvites(req.params.tribeId, req.user.id);
    res.json({ data: invites });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tribes/:tribeId/invites/:inviteId — revoke invite
router.delete("/:inviteId", async (req, res, next) => {
  try {
    await inviteService.revokeInvite(req.params.inviteId, req.params.tribeId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/:code/redeem — redeem invite (mounted separately)
router.post("/:code/redeem", validate(redeemInviteSchema), async (req, res, next) => {
  try {
    const result = await inviteService.redeemInvite(req.params.code, req.user.id);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
