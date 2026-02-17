import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/", async (_req, res) => {
  const checks = {};
  try {
    const { error } = await supabase.from("founder_profiles").select("user_id").limit(1);
    checks.supabase = error ? "unhealthy" : "healthy";
  } catch {
    checks.supabase = "unhealthy";
  }
  const allHealthy = Object.values(checks).every((v) => v === "healthy");
  if (!allHealthy) {
    logger.warn({ checks }, "Health check degraded");
  }
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    service: "founder-match-service",
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;

