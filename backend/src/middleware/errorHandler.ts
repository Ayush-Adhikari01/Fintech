import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const correlationId = (req as any).correlationId || 'none';
  console.error(`[Error] [${correlationId}]`, err);

  const statusCode = err.statusCode || (err.message?.includes('not found') ? 404 : 500);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal error occurred.',
    correlationId,
    timestamp: new Date().toISOString(),
  });
}
