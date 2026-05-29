// ==============================================================================
// MIDDLEWARE: GLOBAL ERROR HANDLER BOUNDARY - INVOICEFLOW AI
// ==============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import logger from '../../shared/logger';

export const errorMiddleware = (
  err: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected platform error occurred';
  const requestId = req.requestId || 'unknown-req';
  const traceId = req.traceId || 'unknown-trace';

  // Intercept Multer payload-too-large exceptions
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn(`[GATEWAY-UPLOAD] Intercepted oversized upload attempt (Trace ID: ${traceId})`);
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File too large. Maximum size allowed is 10MB.'
      },
      traceId
    });
  }

  // Log failures structured with Pino logger
  logger.error(`[GATEWAY-ERROR] Status ${status} -> ${message}`, {
    status,
    requestId,
    traceId,
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    stack: err.stack
  });

  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'ERR_SYSTEM_FAILURE',
      message
    },
    traceId
  });
};

export default errorMiddleware;
