import { Router } from "express";
import { supabase } from "../config/supabase.js";

const router = Router();

router.get("/summary", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.rpc("founder_match_analytics_summary");
    if (error) {
      return res.status(500).json({ error: "Analytics query failed" });
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;

