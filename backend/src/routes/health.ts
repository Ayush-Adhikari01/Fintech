import { Router, Request, Response } from 'express';
import { queryOne } from '../db/connection';
import { config } from '../config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  let dbStatus = 'HEALTHY';
  try {
    const test = queryOne('SELECT 1 as val;');
    if (!test || test.val !== 1) dbStatus = 'UNHEALTHY';
  } catch (err) {
    dbStatus = 'FAILED';
  }

  let mlStatus = 'UNAVAILABLE';
  let mlVersion = 'none';
  try {
    const mlRes = await fetch(`${config.mlServiceUrl}/health`, { signal: AbortSignal.timeout(1200) });
    if (mlRes.ok) {
      const mlData = (await mlRes.json()) as any;
      mlStatus = mlData.status === 'healthy' ? 'HEALTHY' : 'DEGRADED';
      mlVersion = mlData.model_version || 'unknown';
    }
  } catch {
    mlStatus = 'UNAVAILABLE';
  }

  const isHealthy = dbStatus === 'HEALTHY';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    product: 'RegTech Sentinel',
    version: '1.0.0',
    mode: 'PROTOTYPE_DEMONSTRATION',
    components: {
      database: {
        status: dbStatus,
        engine: 'SQLite3 (node:sqlite native)',
      },
      mlService: {
        status: mlStatus,
        url: config.mlServiceUrl,
        modelVersion: mlVersion,
      },
    },
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
