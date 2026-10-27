import { Router, Request, Response, NextFunction } from 'express';
import { resetDemoDataset } from '../services/settingsService';

const router = Router();

router.post('/reset-demo', (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = (req.body.actor as string) || 'demo.operator@sentinel.internal';
    const result = resetDemoDataset(actor);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
