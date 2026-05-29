// ==============================================================================
// MIDDLEWARE: AUTHENTICATION & TENANT DELEGATION - INVOICEFLOW AI
// ==============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '@multi-agent-invoice/database';
import env from '../../infrastructure/config/env';
import { UserRole } from '@multi-agent-invoice/shared';
import { redis, isRedisAvailable } from '../../infrastructure/redis/redis';
import logger from '../../shared/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
  };
  dbContext?: {
    tenantId: string;
  };
  requestId?: string;
  traceId?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: {
        code: 'ERR_AUTH_REQUIRED',
        message: 'Authentication credentials are required to access this resource.'
      },
      traceId: req.traceId || ''
    });
  }

  // Check Redis refresh/access blacklist (CRIT-03)
  if (isRedisAvailable()) {
    try {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ERR_TOKEN_REVOKED',
            message: 'Your active session has been logged out.'
          },
          traceId: req.traceId || ''
        });
      }
    } catch (err: any) {
      // Fallback quietly if Redis connection flashes
    }
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
      tenantId?: string;
      ver?: number;
    };

    const userId = decoded.id;
    const tenantId = decoded.tenantId || decoded.id;

    // Authoritative write-through tokenVersion cache check
    if (isRedisAvailable()) {
      const cacheKey = `user:tokenVersion:${userId}`;
      let cachedVerStr = await redis.get(cacheKey);
      let activeVer: number;

      if (!cachedVerStr) {
        // Cache miss -> fetch and populate cache
        const dbUser = await UserModel.findById(userId);
        activeVer = dbUser ? (dbUser.tokenVersion || 1) : 1;
        await redis.set(cacheKey, activeVer.toString(), 'EX', 86400);
      } else {
        activeVer = parseInt(cachedVerStr, 10);
      }

      const tokenVer = decoded.ver || 1;
      if (tokenVer !== activeVer) {
        logger.warn(`🚫 Token version mismatch for user ${userId}: tokenVer=${tokenVer}, activeVer=${activeVer}`);
        return res.status(401).json({
          success: false,
          error: {
            code: 'ERR_TOKEN_REVOKED',
            message: 'Your session has expired due to security updates or logout.'
          },
          traceId: req.traceId || ''
        });
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId
    };

    // Central Tenant Isolation Context Scoping
    req.dbContext = {
      tenantId
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: {
        code: 'ERR_AUTH_EXPIRED',
        message: 'Your active session has expired or is invalid.'
      },
      traceId: req.traceId || ''
    });
  }
};

export default authMiddleware;
