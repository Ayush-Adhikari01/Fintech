import { Router, Request, Response, NextFunction } from 'express';
import { listAlerts, getAlertDetail, updateAlertStatus, assignAlert, addAlertNote } from '../services/alertService';
import { validateBody } from '../middleware/validator';
import { AlertStatusUpdateSchema } from '../types';
import { z } from 'zod';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string,
      severity: req.query.severity as string,
      category: req.query.category as string,
      assignedTo: req.query.assignedTo as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = listAlerts(filters);
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
    const detail = getAlertDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', validateBody(AlertStatusUpdateSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = (req.body.assigned_to as string) || 'compliance.analyst@sentinel.internal';
    const updated = updateAlertStatus(
      req.params.id,
      req.body.status,
      req.body.reason,
      actor,
      req.body.note
    );
    res.json({
      success: true,
      message: `Alert status updated to ${req.body.status}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/assign', validateBody(z.object({ assignee: z.string().min(2) })), (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = assignAlert(req.params.id, req.body.assignee);
    res.json({
      success: true,
      message: `Alert assigned to ${req.body.assignee}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/notes', validateBody(z.object({ note: z.string().min(3), author: z.string().optional() })), (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = addAlertNote(req.params.id, req.body.note, req.body.author);
    res.json({
      success: true,
      message: 'Investigation note added.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
