import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createProposalSchema, listProposalsSchema } from "../schemas/proposalSchemas.js";
import * as proposalService from "../services/proposalService.js";

const router = Router({ mergeParams: true });

router.post("/", validate(createProposalSchema), async (req, res, next) => {
  try {
    const data = await proposalService.createProposal(req.db, req.params.id, req.user.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/", validate(listProposalsSchema), async (req, res, next) => {
  try {
    const data = await proposalService.listProposals(req.db, req.params.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
