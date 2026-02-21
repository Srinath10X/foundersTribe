import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createGigSchema, deleteGigSchema, getGigSchema, listGigsSchema, updateGigSchema } from "../schemas/gigSchemas.js";
import * as gigService from "../services/gigService.js";

const router = Router();

router.post("/", validate(createGigSchema), async (req, res, next) => {
  try {
    const data = await gigService.createGig(req.db, req.user.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/", validate(listGigsSchema), async (req, res, next) => {
  try {
    const data = await gigService.listGigs(req.db, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/me", validate(listGigsSchema), async (req, res, next) => {
  try {
    const data = await gigService.listGigs(req.db, { ...req.query, founder_id: req.user.id });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const data = await gigService.getFreelancerStats(req.db, req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", validate(getGigSchema), async (req, res, next) => {
  try {
    const data = await gigService.getGigById(req.db, req.params.id as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", validate(updateGigSchema), async (req, res, next) => {
  try {
    const data = await gigService.updateGig(req.db, req.params.id as string, req.user.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", validate(deleteGigSchema), async (req, res, next) => {
  try {
    await gigService.deleteGig(req.db, req.params.id as string, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
