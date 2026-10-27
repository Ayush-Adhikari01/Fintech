import { Router, Request, Response, NextFunction } from 'express';
import { listCustomers, getCustomerDetail, updateCustomer, createCustomer } from '../services/customerService';
import { validateBody } from '../middleware/validator';
import { CustomerUpdateSchema } from '../types';
import { z } from 'zod';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      search: req.query.search as string,
      kycStatus: req.query.kycStatus as string,
      riskRating: req.query.riskRating as string,
      type: req.query.type as string,
      country: req.query.country as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = listCustomers(filters);
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
    const detail = getCustomerDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateBody(CustomerUpdateSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = updateCustomer(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Customer compliance profile updated.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validateBody(
    z.object({
      name: z.string().min(2),
      type: z.enum(['INDIVIDUAL', 'CORPORATE', 'SME']),
      country: z.string().length(2),
      kyc_status: z.enum(['VERIFIED', 'PENDING', 'EXPIRED', 'REJECTED']).optional(),
      risk_rating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      occupation_or_industry: z.string().min(2),
      monthly_expected_turnover: z.number().positive().optional(),
      initial_account_currency: z.string().default('USD'),
      initial_account_balance: z.number().nonnegative().default(10000),
    })
  ),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = createCustomer(req.body);
      res.status(201).json({
        success: true,
        message: 'Customer onboarded successfully.',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
