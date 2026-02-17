import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { joinTribeSchema, joinGroupSchema, changeRoleSchema } from "../schemas/memberSchemas.js";
import * as memberService from "../services/memberService.js";

const router = Router({ mergeParams: true });

// POST /api/tribes/:tribeId/join — join a tribe
router.post("/tribes/:tribeId/join", validate(joinTribeSchema), async (req, res, next) => {
  try {
    const member = await memberService.joinTribe(req.params.tribeId, req.user.id);
    res.status(201).json({ data: member });
  } catch (err) {
    next(err);
  }
});

// POST /api/tribes/:tribeId/leave — leave a tribe
router.post("/tribes/:tribeId/leave", validate(joinTribeSchema), async (req, res, next) => {
  try {
    await memberService.leaveTribe(req.params.tribeId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/members — list tribe members
router.get("/tribes/:tribeId/members", validate(joinTribeSchema), async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const members = await memberService.getTribeMembers(
      req.params.tribeId, req.user.id, cursor, Number(limit) || 50,
    );
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tribes/:tribeId/members/:userId/role — change member role
router.patch("/tribes/:tribeId/members/:userId/role", validate(changeRoleSchema), async (req, res, next) => {
  try {
    const updated = await memberService.changeRole(
      req.params.tribeId, req.user.id, req.params.userId, req.body.role,
    );
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tribes/:tribeId/members/:userId — remove a member
router.delete("/tribes/:tribeId/members/:userId", async (req, res, next) => {
  try {
    await memberService.removeMember(req.params.tribeId, req.user.id, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/tribes/:tribeId/groups/:groupId/join — join a group
router.post("/tribes/:tribeId/groups/:groupId/join", validate(joinGroupSchema), async (req, res, next) => {
  try {
    const member = await memberService.joinGroup(
      req.params.tribeId, req.params.groupId, req.user.id,
    );
    res.status(201).json({ data: member });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:groupId/leave — leave a group
router.post("/groups/:groupId/leave", async (req, res, next) => {
  try {
    await memberService.leaveGroup(req.params.groupId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
