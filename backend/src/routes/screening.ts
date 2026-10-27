import { Router, Request, Response, NextFunction } from 'express';
import { listWatchlist, screenEntity, listScreeningHistory, updateScreeningStatus } from '../services/screeningService';
import { validateBody } from '../middleware/validator';
import { ScreeningQuerySchema } from '../types';
import { z } from 'zod';

const router = Router();

router.get('/watchlist', (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const regime = req.query.regime as string;
    const entries = listWatchlist(search, regime);
    res.json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/screen', validateBody(ScreeningQuerySchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = screenEntity(req.body);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const history = listScreeningHistory(limit);
    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/status',
  validateBody(
    z.object({
      status: z.enum(['POTENTIAL_MATCH', 'CLEARED', 'ESCALATED']),
      reason: z.string().min(3),
    })
  ),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = updateScreeningStatus(req.params.id, req.body.status, req.body.reason);
      res.json({
        success: true,
        message: `Screening status updated to ${req.body.status}.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
