// ==============================================================================
// ROUTES: AUTHENTICATION AND SESSIONS GATEWAY - INVOICEFLOW AI
// ==============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '@multi-agent-invoice/database';
import { signUpSchema, signInSchema, ApiResponse } from '@multi-agent-invoice/shared';
import env from '../../infrastructure/config/env';
import validateRequest from '../middleware/requestValidator';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { redis, isRedisAvailable } from '../../infrastructure/redis/redis';
import logger from '../../shared/logger';

const router = Router();

// In-memory failed logins tracker to prevent brute-force attacks
const failedLogins = new Map<string, { count: number; lockUntil?: number }>();

const BRUTE_FORCE_MAX_ATTEMPTS = 5;
const BRUTE_FORCE_LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes lock

// IP-level failed attempts tracker to prevent authentication flooding (MED-05)
const ipRateLimits = new Map<string, { count: number; resetTime: number }>();
const authIpRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.DISABLE_RATE_LIMIT === 'true' || env.NODE_ENV === 'development') return next();
  
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || '127.0.0.1';
  
  const key = `ip_limit:${ip}`;
  const now = Date.now();
  const limitRecord = ipRateLimits.get(key);
  
  if (limitRecord && now < limitRecord.resetTime) {
    if (limitRecord.count >= 20) { // Limit 20 login/signup attempts per 15 minutes per IP
      const remainingSeconds = Math.ceil((limitRecord.resetTime - now) / 1000);
      logger.warn(`🚫 Auth brute-force rate limit hit for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        error: {
          code: 'ERR_TOO_MANY_ATTEMPTS',
          message: `Too many auth attempts from this IP. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`
        },
        traceId: (req as any).traceId || ''
      });
    }
    limitRecord.count += 1;
  } else {
    ipRateLimits.set(key, {
      count: 1,
      resetTime: now + 15 * 60 * 1000 // 15 minutes window
    });
  }
  next();
};

// 1. Sign Up route
router.post(
  '/signup',
  authIpRateLimiter,
  validateRequest(signUpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
      const lowercaseEmail = email.toLowerCase();
      
      const existingUser = await UserModel.findOne({ email: lowercaseEmail });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_EMAIL_REGISTERED',
            message: 'This email is already registered.'
          },
          traceId: (req as any).traceId || ''
        });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Auto-generate a unique tenantId for the new business user
      const tenantId = `tenant_${crypto.randomUUID()}`;

      // Domain escalation rule: Enforce admin role for @invoiceflow.ai email domains
      const role = lowercaseEmail.endsWith('@invoiceflow.ai') ? 'admin' : 'user';

      const newUser = await UserModel.create({
        name,
        email: lowercaseEmail,
        password: hashedPassword,
        role,
        tenantId,
        quotaLimit: role === 'admin' ? 999999 : 100 // Enterprise quota for admins, 100 for users
      });

      const tokenVersion = 1;
      if (isRedisAvailable()) {
        await redis.set(`user:tokenVersion:${newUser._id}`, tokenVersion.toString(), 'EX', 86400).catch(() => {});
      }

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, role: newUser.role, tenantId: newUser.tenantId, ver: tokenVersion },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      logger.info(`👤 New user registered: ${lowercaseEmail} (Tenant: ${tenantId})`, {
        traceId: (req as any).traceId,
        userId: newUser._id,
        tenantId
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          token,
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            tenantId: newUser.tenantId
          }
        },
        traceId: (req as any).traceId || ''
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 2. Login route with Brute-Force safety locking
router.post(
  '/login',
  authIpRateLimiter,
  validateRequest(signInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const lowercaseEmail = email.toLowerCase();

      // Check brute-force lock state
      const lockRecord = failedLogins.get(lowercaseEmail);
      if (lockRecord && lockRecord.lockUntil && Date.now() < lockRecord.lockUntil) {
        const secondsRemaining = Math.ceil((lockRecord.lockUntil - Date.now()) / 1000);
        logger.warn(`🚫 Login temporarily locked for: ${lowercaseEmail} (${secondsRemaining}s remaining)`, {
          traceId: (req as any).traceId
        });

        return res.status(423).json({
          success: false,
          error: {
            code: 'ERR_ACCOUNT_LOCKED',
            message: `Brute force safety activated. Account is locked. Try again in ${Math.ceil(secondsRemaining / 60)} minutes.`
          },
          traceId: (req as any).traceId || ''
        });
      }

      const user = await UserModel.findOne({ email: lowercaseEmail, isDeleted: false });
      if (!user || user.isSuspended) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ERR_INVALID_CREDENTIALS',
            message: 'Invalid email or password credentials provided.'
          },
          traceId: (req as any).traceId || ''
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Record failed login attempt
        const count = lockRecord ? lockRecord.count + 1 : 1;
        const lockUntil = count >= BRUTE_FORCE_MAX_ATTEMPTS ? Date.now() + BRUTE_FORCE_LOCK_TIME_MS : undefined;

        failedLogins.set(lowercaseEmail, { count, lockUntil });

        logger.warn(`⚠️ Failed login attempt (${count}/${BRUTE_FORCE_MAX_ATTEMPTS}) for: ${lowercaseEmail}`, {
          traceId: (req as any).traceId
        });

        return res.status(401).json({
          success: false,
          error: {
            code: 'ERR_INVALID_CREDENTIALS',
            message: 'Invalid email or password credentials provided.'
          },
          traceId: (req as any).traceId || ''
        });
      }

      // Successful login - clear brute-force logs
      failedLogins.delete(lowercaseEmail);

      const tokenVersion = user.tokenVersion || 1;
      if (isRedisAvailable()) {
        await redis.set(`user:tokenVersion:${user._id}`, tokenVersion.toString(), 'EX', 86400).catch(() => {});
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, tenantId: user.tenantId, ver: tokenVersion },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      logger.info(`👤 Successful login: ${lowercaseEmail} (Role: ${user.role})`, {
        traceId: (req as any).traceId,
        userId: user._id,
        tenantId: user.tenantId
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
          }
        },
        traceId: (req as any).traceId || ''
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 3. Reset pipeline mock
router.post('/forgot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ERR_VALIDATION_FAILED',
          message: 'Email address is required.'
        },
        traceId: (req as any).traceId || ''
      });
    }

    res.json({
      success: true,
      data: {
        message: 'If the account exists, a reset link has been dispatched successfully.'
      },
      traceId: (req as any).traceId || ''
    });
  } catch (error) {
    next(error);
  }
});

// 3. Logout route - Increment tokenVersion and blacklist active token in Redis
router.post(
  '/logout',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.decode(token) as { exp?: number } | null;
        if (decoded && decoded.exp) {
          const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttlSeconds > 0 && isRedisAvailable()) {
            // Blacklist token in Redis until its natural expiration
            await redis.set(`blacklist:${token}`, '1', 'EX', ttlSeconds);
            logger.info(`🚫 Blacklisted active token on logout (Remaining TTL: ${ttlSeconds}s)`);
          }
        }
      }

      const userId = req.user?.id;
      if (userId) {
        // Increment tokenVersion in MongoDB and update Redis write-through cache
        const updatedUser = await UserModel.findByIdAndUpdate(
          userId,
          { $inc: { tokenVersion: 1 } },
          { new: true }
        );

        if (updatedUser && isRedisAvailable()) {
          const newVer = updatedUser.tokenVersion || 1;
          await redis.set(`user:tokenVersion:${userId}`, newVer.toString(), 'EX', 86400);
          logger.info(`🔄 Incremented tokenVersion for user ${userId} to ${newVer} on logout.`);
        }
      }

      res.json({
        success: true,
        data: {
          message: 'Logged out successfully and session blacklisted.'
        },
        traceId: req.traceId || ''
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
