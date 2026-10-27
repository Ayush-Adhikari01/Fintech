import { Router, Request, Response, NextFunction } from 'express';
import { executeStressTestScenario, listStressScenarios } from '../services/stressTestingService';
import { validateBody } from '../middleware/validator';
import { StressTestScenarioSchema } from '../types';

const router = Router();

router.get('/scenarios', (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = listStressScenarios();
    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/run', validateBody(StressTestScenarioSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = executeStressTestScenario(req.body);
    res.json({
      success: true,
      message: 'Stress testing scenario successfully executed.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
