import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createTribeSchema, updateTribeSchema, tribeIdParamSchema } from "../schemas/tribeSchemas.js";
import * as tribeService from "../services/tribeService.js";

const router = Router();

// GET /api/tribes — list public tribes
router.get("/", async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const tribes = await tribeService.listPublicTribes(cursor, Number(limit) || 20);
    res.json({ data: tribes });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/me — list my tribes
router.get("/me", async (req, res, next) => {
  try {
    const tribes = await tribeService.listMyTribes(req.user.id);
    res.json({ data: tribes });
  } catch (err) {
    next(err);
  }
});

// GET /api/tribes/:tribeId — get tribe detail
router.get("/:tribeId", validate(tribeIdParamSchema), async (req, res, next) => {
  try {
    const tribe = await tribeService.getTribe(req.params.tribeId, req.user.id);
    res.json({ data: tribe });
  } catch (err) {
    next(err);
  }
});

// POST /api/tribes — create a tribe
router.post("/", validate(createTribeSchema), async (req, res, next) => {
  try {
    const tribe = await tribeService.createTribe(req.user.id, req.body);
    res.status(201).json({ data: tribe });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tribes/:tribeId — update a tribe
router.patch("/:tribeId", validate(updateTribeSchema), async (req, res, next) => {
  try {
    const tribe = await tribeService.updateTribe(req.params.tribeId, req.user.id, req.body);
    res.json({ data: tribe });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tribes/:tribeId — soft-delete a tribe
router.delete("/:tribeId", validate(tribeIdParamSchema), async (req, res, next) => {
  try {
    await tribeService.deleteTribe(req.params.tribeId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
