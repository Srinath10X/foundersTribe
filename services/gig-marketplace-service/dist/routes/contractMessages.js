import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createMessageSchema, listMessagesSchema, readMessagesSchema } from "../schemas/messageSchemas.js";
import * as messageService from "../services/messageService.js";
const router = Router({ mergeParams: true });
router.post("/", validate(createMessageSchema), async (req, res, next) => {
    try {
        const data = await messageService.createMessage(req.db, req.params.id, req.user.id, req.body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
router.get("/", validate(listMessagesSchema), async (req, res, next) => {
    try {
        const data = await messageService.listMessages(req.db, req.params.id, req.user.id, req.query);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.post("/read", validate(readMessagesSchema), async (req, res, next) => {
    try {
        const data = await messageService.markMessagesRead(req.db, req.params.id, req.user.id);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
export default router;
