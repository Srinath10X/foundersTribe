import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createGroupSchema, updateGroupSchema, groupIdParamSchema } from "../schemas/groupSchemas.js";
import * as groupService from "../services/groupService.js";

const router = Router({ mergeParams: true });

// GET /api/tribes/:tribeId/groups — list groups in a tribe (members only)
router.get("/", async (req, res, next) => {
  try {
    const groups = await groupService.listGroups(req.params.tribeId, req.user.id);
    res.json({ data: groups });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/groups/public — list groups publicly (preview for non-members)
router.get("/public", async (req, res, next) => {
  try {
    const groups = await groupService.listGroupsPublic(req.params.tribeId);
    res.json({ data: groups });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/groups/:groupId — get group detail
router.get("/:groupId", validate(groupIdParamSchema), async (req, res, next) => {
  try {
    const group = await groupService.getGroup(req.params.groupId, req.user.id);
    res.json({ data: group });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId/groups/:groupId/members — list group members
router.get("/:groupId/members", validate(groupIdParamSchema), async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const members = await groupService.getGroupMembers(req.params.groupId, req.user.id, cursor, Number(limit) || 50);
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
});

// POST /api/tribes/:tribeId/groups — create a subtribe
router.post("/", validate(createGroupSchema), async (req, res, next) => {
  try {
    const group = await groupService.createGroup(req.params.tribeId, req.user.id, req.body);
    res.status(201).json({ data: group });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tribes/:tribeId/groups/:groupId — update a group
router.patch("/:groupId", validate(updateGroupSchema), async (req, res, next) => {
  try {
    const group = await groupService.updateGroup(req.params.groupId, req.user.id, req.body);
    res.json({ data: group });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tribes/:tribeId/groups/:groupId — delete a group
router.delete("/:groupId", validate(groupIdParamSchema), async (req, res, next) => {
  try {
    await groupService.deleteGroup(req.params.groupId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
