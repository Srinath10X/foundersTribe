import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { listMatchesQuerySchema, matchIdParamSchema } from "../schemas/matchSchemas.js";
import * as matchService from "../services/matchService.js";

const router = Router();

router.get("/", validate(listMatchesQuerySchema), async (req, res, next) => {
  try {
    const items = await matchService.listMatches(
      req.user.id,
      req.query.sort,
      req.query.cursor,
      req.query.limit || 50,
    );
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

router.post("/:matchId/unmatch", validate(matchIdParamSchema), async (req, res, next) => {
  try {
    const result = await matchService.unmatch(req.params.matchId, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;

