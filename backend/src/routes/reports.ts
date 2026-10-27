import { Router, Request, Response, NextFunction } from 'express';
import { generateReport } from '../services/reportService';

const router = Router();

router.get('/generate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = (req.query.type as string) || 'TRANSACTIONS';
    const format = (req.query.format as string) || 'json';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const report = generateReport(type, { startDate, endDate });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="regtech-sentinel-${type.toLowerCase()}-${Date.now()}.csv"`
      );
      return res.send(report.csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
