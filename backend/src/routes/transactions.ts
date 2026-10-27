import { Router, Request, Response, NextFunction } from 'express';
import { listTransactions, getTransactionDetail } from '../services/transactionService';
import { processTransactionPipeline } from '../engine/pipeline';
import { validateBody } from '../middleware/validator';
import { IngestTransactionSchema } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      search: req.query.search as string,
      status: req.query.status as string,
      riskBand: req.query.riskBand as string,
      channel: req.query.channel as string,
      type: req.query.type as string,
      originCountry: req.query.originCountry as string,
      destCountry: req.query.destCountry as string,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = listTransactions(filters);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = getTransactionDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(IngestTransactionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processed = await processTransactionPipeline(req.body);
    res.status(201).json({
      success: true,
      data: processed,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
