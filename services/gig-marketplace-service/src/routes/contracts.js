import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { contractActionSchema, contractByIdSchema, listContractsSchema } from "../schemas/contractSchemas.js";
import * as contractService from "../services/contractService.js";

const router = Router();

router.get("/", validate(listContractsSchema), async (req, res, next) => {
  try {
    const data = await contractService.listContracts(req.db, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", validate(contractByIdSchema), async (req, res, next) => {
  try {
    const data = await contractService.getContractById(req.db, req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/complete", validate(contractActionSchema), async (req, res, next) => {
  try {
    const data = await contractService.markContractComplete(req.db, req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/approve", validate(contractActionSchema), async (req, res, next) => {
  try {
    const data = await contractService.approveContract(req.db, req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
