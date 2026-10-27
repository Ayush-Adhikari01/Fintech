import { Router, Request, Response, NextFunction } from 'express';
import { getDashboardData } from '../services/dashboardService';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardData();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
