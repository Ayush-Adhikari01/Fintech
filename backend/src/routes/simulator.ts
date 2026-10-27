import { Router, Request, Response, NextFunction } from 'express';
import { simulator } from '../engine/simulator';
import { processTransactionPipeline } from '../engine/pipeline';

const router = Router();

router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: simulator.getStatus(),
  });
});

router.post('/start', (req: Request, res: Response) => {
  simulator.start();
  res.json({
    success: true,
    message: 'Transaction simulator started.',
    data: simulator.getStatus(),
  });
});

router.post('/pause', (req: Request, res: Response) => {
  simulator.pause();
  res.json({
    success: true,
    message: 'Transaction simulator paused.',
    data: simulator.getStatus(),
  });
});

router.post('/resume', (req: Request, res: Response) => {
  simulator.resume();
  res.json({
    success: true,
    message: 'Transaction simulator resumed.',
    data: simulator.getStatus(),
  });
});

router.post('/stop', (req: Request, res: Response) => {
  simulator.stop();
  res.json({
    success: true,
    message: 'Transaction simulator stopped.',
    data: simulator.getStatus(),
  });
});

router.post('/rate', (req: Request, res: Response) => {
  const intervalMs = parseInt(req.body.intervalMs, 10);
  if (isNaN(intervalMs) || intervalMs < 500 || intervalMs > 10000) {
    return res.status(400).json({ success: false, error: 'Interval must be between 500ms and 10000ms.' });
  }
  simulator.setIntervalMs(intervalMs);
  res.json({
    success: true,
    message: `Simulator rate updated to ${intervalMs}ms.`,
    data: simulator.getStatus(),
  });
});

router.post('/generate-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = Math.min(25, Math.max(1, parseInt(req.body.count || '5', 10)));
    const results = await simulator.generateBatch(count);
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});

// Reproducible teacher demonstration scenario (guaranteed multiple rule triggers & ML anomaly)
router.post('/generate-suspicious', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Deliberate high-risk structuring scenario:
    // Amount $9,750 (Structuring band), Customer Viktor Mikhailov (Expired KYC + Sanctions Name),
    // Counterparty Caspian Petrochem (Sanctioned / IR), Channel API
    const suspiciousTxInput = {
      sender_account_id: 'ACC-8004',
      receiver_account_id: 'ACC-EXT-9921',
      amount: 9750.00,
      currency: 'USD',
      channel: 'API' as const,
      type: 'WIRE' as const,
      origin_country: 'RU',
      dest_country: 'IR',
      counterparty_id: 'CPTY-103',
    };

    const result = await processTransactionPipeline(suspiciousTxInput);

    res.status(201).json({
      success: true,
      message: 'Deliberately flagged demonstration scenario transaction generated.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
