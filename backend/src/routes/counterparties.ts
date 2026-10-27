import { Router, Request, Response, NextFunction } from 'express';
import { getCounterpartyAnalytics, getCounterpartyDetail } from '../services/counterpartyService';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = getCounterpartyAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = getCounterpartyDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Counterparty not found' });
    }
    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
