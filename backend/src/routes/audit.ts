import { Router, Request, Response, NextFunction } from 'express';
import { listAuditEvents } from '../services/auditService';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      actor: req.query.actor as string,
      eventType: req.query.eventType as string,
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      correlationId: req.query.correlationId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
    };
    const result = listAuditEvents(filters);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
