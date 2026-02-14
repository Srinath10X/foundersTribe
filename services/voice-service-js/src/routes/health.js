import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', async (_req, res) => {
    const checks = {};

    try {
        const { error } = await supabase.from('rooms').select('id').limit(1);
        checks.supabase = error ? 'unhealthy' : 'healthy';
    } catch {
        checks.supabase = 'unhealthy';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'healthy');

    if (!allHealthy) {
        logger.warn({ checks }, 'Health check: some services unhealthy');
    }

    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
    });
});

export default router;
