import { Router, Request, Response, NextFunction } from 'express';
import { listRules, updateRuleConfig } from '../services/settingsService';
import { validateBody } from '../middleware/validator';
import { UpdateRuleSchema } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = listRules();
    res.json({
      success: true,
      count: rules.length,
      data: rules,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateBody(UpdateRuleSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = updateRuleConfig(req.params.id, req.body);
    res.json({
      success: true,
      message: `Rule ${req.params.id} configuration updated.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
