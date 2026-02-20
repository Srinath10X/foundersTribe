import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { acceptProposalSchema } from "../schemas/proposalSchemas.js";
import * as proposalService from "../services/proposalService.js";

const router = Router();

router.post("/:id/accept", validate(acceptProposalSchema), async (req, res, next) => {
  try {
    const data = await proposalService.acceptProposal(req.db, req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
