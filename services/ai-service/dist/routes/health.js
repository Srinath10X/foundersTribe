import { Router } from "express";
const router = Router();
router.get("/", (_req, res) => {
    res.json({ status: "ok", service: "ai-service" });
});
export default router;
