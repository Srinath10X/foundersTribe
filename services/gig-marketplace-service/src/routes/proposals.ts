import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { acceptProposalSchema, rejectProposalSchema, listProposalsSchema } from "../schemas/proposalSchemas.js";
import * as proposalService from "../services/proposalService.js";

const router = Router();

router.get("/me", validate(listProposalsSchema), async (req, res, next) => {
  try {
    const data = await proposalService.listProposalsByFreelancer(req.db, req.user.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/accept", validate(acceptProposalSchema), async (req, res, next) => {
  try {
    const data = await proposalService.acceptProposal(req.db, req.params.id as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reject", validate(rejectProposalSchema), async (req, res, next) => {
  try {
    const data = await proposalService.rejectProposal(req.db, req.params.id as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
