// ==============================================================================
// MIDDLEWARE: DUAL-LAYER RATE LIMITER & BUDGET GUARD - INVOICEFLOW AI
// ==============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { redis, isRedisAvailable } from '../../infrastructure/redis/redis';
import env from '../../infrastructure/config/env';
import logger from '../../shared/logger';

// Standard rate limit options
const BUCKET_CAPACITY = 60; // Max 60 tokens
const REFILL_RATE = 2.0;    // Refill 2 tokens per second (120 reqs/min average refill)

const getClientIp = (req: AuthenticatedRequest): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;
  return ip || '127.0.0.1';
};

const getRouteWeight = (path: string): number => {
  if (path.includes('/auth/login') || path.includes('/auth/signin')) return 1;
  if (path.includes('/ai/chat') || path.includes('/chat')) return 2;
  if (path.includes('/invoices/upload') || path.includes('/upload')) return 5;
  if (path.includes('/export')) return 3;
  return 1; // Default
};

const LUA_TOKEN_BUCKET = `
  local rateKey = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])
  local cost = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])

  local data = redis.call("HMGET", rateKey, "tokens", "lastUpdated")
  local tokens = tonumber(data[1])
  local lastUpdated = tonumber(data[2])

  if not tokens then
    tokens = capacity
    lastUpdated = now
  else
    local elapsed = now - lastUpdated
    if elapsed > 0 then
      local added = elapsed * refillRate
      tokens = math.min(capacity, tokens + added)
      lastUpdated = now
    end
  end

  if tokens < cost then
    redis.call("HMSET", rateKey, "tokens", tostring(tokens), "lastUpdated", tostring(lastUpdated))
    redis.call("EXPIRE", rateKey, 60)
    return {0, tostring(tokens)}
  else
    tokens = tokens - cost
    redis.call("HMSET", rateKey, "tokens", tostring(tokens), "lastUpdated", tostring(lastUpdated))
    redis.call("EXPIRE", rateKey, 60)
    return {1, tostring(tokens)}
  end
`;

export const rateLimitMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  const path = req.path;
  const ip = getClientIp(req);
  const nowSecs = Math.floor(Date.now() / 1000);
  const todayStr = new Date().toISOString().split('T')[0];

  let rateLimitKey = `rate:bucket:guest:${ip}`;
  let cost = getRouteWeight(path);
  let isGuest = true;
  let tenantId = 'guest';

  if (req.user) {
    rateLimitKey = `rate:bucket:user:${req.user.id}`;
    isGuest = false;
    tenantId = req.user.tenantId || req.user.id;

    if (req.user.role === 'admin') {
      return next();
    }
  }

  if (isRedisAvailable()) {
    try {
      // 1. Backpressure System Load Check
      const systemLoad = (await redis.get('system:load')) || 'NORMAL';
      
      if (systemLoad === 'CRITICAL') {
        // Block all heavy operations
        if (cost > 1) {
          logger.warn(`🚫 Route blocked due to CRITICAL system load: ${path}`, { traceId: req.traceId });
          return res.status(503).json({
            success: false,
            error: {
              code: 'ERR_SYSTEM_OVERLOAD',
              message: 'The server is currently under high load. Complex processing is temporarily paused.'
            },
            traceId: req.traceId || ''
          });
        }
      } else if (systemLoad === 'DEGRADED') {
        // Throttle uploads and heavy operations by doubling their token cost
        if (cost > 1) {
          cost = cost * 2;
          logger.info(`⚠️ System load DEGRADED. Doubled request token cost to ${cost} for: ${path}`);
        }
      }

      // 2. Budget Protections (Daily dollar cost limits)
      if (!isGuest && cost >= 2) {
        const costKey = `usage:cost:${tenantId}:${todayStr}`;
        const dailyCostStr = await redis.get(costKey);
        const dailyCost = dailyCostStr ? parseFloat(dailyCostStr) : 0.0;

        const BUDGET_LIMIT = req.user?.role === 'manager' ? 50.0 : 5.0; // Standard $5/day, Premium/Manager $50/day

        if (dailyCost >= BUDGET_LIMIT) {
          logger.warn(`🚫 API budget limit exceeded for tenant ${tenantId}: $${dailyCost}`, { traceId: req.traceId });
          return res.status(403).json({
            success: false,
            error: {
              code: 'ERR_BUDGET_EXCEEDED',
              message: 'Your active organization budget limit for AI services has been exceeded for today.'
            },
            traceId: req.traceId || ''
          });
        }
      }

      // 3. Weighted Token Bucket rate limiting
      const results = await redis.eval(
        LUA_TOKEN_BUCKET,
        1,
        rateLimitKey,
        BUCKET_CAPACITY.toString(),
        REFILL_RATE.toString(),
        cost.toString(),
        nowSecs.toString()
      ) as [number, string];

      const [allowed, remainingTokens] = results;
      const remaining = parseFloat(remainingTokens);

      res.setHeader('X-RateLimit-Limit', BUCKET_CAPACITY);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, Math.floor(remaining)));

      if (allowed === 0) {
        logger.warn(`🚫 Token Bucket rate limit exceeded for key: ${rateLimitKey}`, {
          traceId: req.traceId,
          userId: req.user?.id,
          tenantId
        });
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'You are performing requests too quickly. Please wait before repeating.'
          },
          traceId: req.traceId || ''
        });
      }

      return next();
    } catch (err: any) {
      logger.error('⚠️ Redis rate limiter / budget sweep error, falling back quietly:', { error: err.message });
    }
  }

  // If Redis is down, perform extremely basic fallback next()
  return next();
};

export default rateLimitMiddleware;
