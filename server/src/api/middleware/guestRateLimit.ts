// ==============================================================================
// MIDDLEWARE: GUEST UPLOAD RATE LIMITER - INVOICEFLOW AI
// ==============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import redis from '../../infrastructure/config/redis';
import logger from '../../shared/logger';

export async function guestUploadLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Pass through if the user is authenticated (they have their own quotas in rateLimitMiddleware)
  if (req.user) {
    return next();
  }

  // Development / test bypass option
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  // Get client IP address safely
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || '127.0.0.1';

  const key = `guest:${ip}:uploads`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 86400); // 24-hour TTL (86400 seconds)
    }

    if (count > 3) {
      logger.warn(`🚫 IP guest rate limit hit for ${ip} (Count: ${count}/3)`);
      return res.status(429).json({
        success: false,
        error: 'Guest trial limit reached. Sign up for unlimited uploads.',
        code: 'GUEST_LIMIT_EXCEEDED'
      });
    }

    logger.info(`[GUEST-RATE-LIMIT] IP: ${ip}, Uploads Used: ${count}/3`);
  } catch (err: any) {
    logger.error('⚠️ Redis error inside guestUploadLimit middleware, bypassing to prevent complete outage:', {
      error: err.message
    });
  }

  (req as any).isGuest = true;
  return next();
}

export default guestUploadLimit;
