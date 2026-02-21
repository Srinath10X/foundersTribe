import { Router } from "express";
const router = Router();
router.get("/", (_req, res) => {
    res.json({ status: "ok", service: "gig-marketplace-service" });
});
export default router;
