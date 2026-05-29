// ==============================================================================
// ROUTES: ADMINISTRATIVE MANAGEMENT CENTER - INVOICEFLOW AI
// ==============================================================================

import { Router, Response, NextFunction } from 'express';
import { UserModel, AuditLogModel } from '@multi-agent-invoice/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { ApiResponse } from '@multi-agent-invoice/shared';
import logger from '../../shared/logger';

const router = Router();

// Enforce authentication at the router level for all administrative endpoints
router.use(authMiddleware);

// ------------------------------------------------------------------------------
// 1. User Management - Fetch Registered User list
// ------------------------------------------------------------------------------
router.get(
  '/users',
  authMiddleware,
  roleGuard(['admin', 'ops']), // Ops and Admin roles can manage user desks
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const search = (req.query.search as string) || '';

      const skip = (page - 1) * limit;
      const query: any = { isDeleted: false };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const total = await UserModel.countDocuments(query);
      const users = await UserModel.find(query)
        .select('-password')
        .skip(skip)
        .limit(limit);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          users,
          total,
          page,
          pages: Math.ceil(total / limit)
        },
        traceId: (req as any).traceId || ''
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ------------------------------------------------------------------------------
// 2. User Management - Change Role
// ------------------------------------------------------------------------------
router.put(
  '/users/:id/role',
  authMiddleware,
  roleGuard(['admin']), // Admin-only privilege
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['admin', 'manager', 'viewer', 'user', 'support', 'ops'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_UNSUPPORTED_ROLE', message: 'The provided role is unsupported.' },
          traceId: req.traceId || ''
        });
      }

      const updatedUser = await UserModel.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'ERR_USER_NOT_FOUND', message: 'User does not exist.' },
          traceId: req.traceId || ''
        });
      }

      // Record administrative audit trail event
      await AuditLogModel.create({
        level: 'warn',
        action: 'USER_ROLE_OVERRIDE',
        userId: req.user!.id,
        metadata: { targetUser: id, targetRole: role }
      });

      logger.warn(`🛡️ Administrative user role override: ${updatedUser.email} promoted to ${role}`, {
        traceId: req.traceId,
        userId: req.user!.id,
        tenantId: req.user!.tenantId
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          message: 'User role updated successfully.',
          user: updatedUser
        },
        traceId: req.traceId || ''
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ------------------------------------------------------------------------------
// 3. User Management - Toggle Suspension (PATCH)
// ------------------------------------------------------------------------------
router.patch(
  '/users/:id/status',
  authMiddleware,
  roleGuard(['admin', 'ops']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { isSuspended } = req.body;

      if (typeof isSuspended !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION_FAILED', message: 'Suspension status must be a boolean.' },
          traceId: req.traceId || ''
        });
      }

      const updatedUser = await UserModel.findByIdAndUpdate(id, { isSuspended }, { new: true }).select('-password');
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'ERR_USER_NOT_FOUND', message: 'User does not exist.' },
          traceId: req.traceId || ''
        });
      }

      // Record administrative audit trail event
      await AuditLogModel.create({
        level: 'warn',
        action: isSuspended ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        userId: req.user!.id,
        metadata: { targetUser: id }
      });

      logger.warn(`🛡️ User suspension status updated: ${updatedUser.email} (isSuspended: ${isSuspended})`, {
        traceId: req.traceId,
        userId: req.user!.id
      });

      res.json({
        success: true,
        data: {
          message: isSuspended ? 'User suspended successfully.' : 'User account reactivated.',
          user: updatedUser
        },
        traceId: req.traceId || ''
      });
    } catch (error) {
      next(error);
    }
  }
);

// ------------------------------------------------------------------------------
// 4. User Management - Soft Delete (DELETE)
// ------------------------------------------------------------------------------
router.delete(
  '/users/:id',
  authMiddleware,
  roleGuard(['admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const updatedUser = await UserModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).select('-password');
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'ERR_USER_NOT_FOUND', message: 'User does not exist.' },
          traceId: req.traceId || ''
        });
      }

      // Record administrative audit trail event
      await AuditLogModel.create({
        level: 'error',
        action: 'USER_SOFT_DELETED',
        userId: req.user!.id,
        metadata: { targetUser: id }
      });

      logger.error(`🛡️ User soft deleted: ${updatedUser.email}`, {
        traceId: req.traceId,
        userId: req.user!.id
      });

      res.json({
        success: true,
        data: {
          message: 'User account soft deleted successfully.'
        },
        traceId: req.traceId || ''
      });
    } catch (error) {
      next(error);
    }
  }
);

// ------------------------------------------------------------------------------
// 5. System Uptime / Health (Ops & Support roles allowed)
// ------------------------------------------------------------------------------
router.get(
  '/health',
  authMiddleware,
  roleGuard(['admin', 'ops', 'support']),
  (req: AuthenticatedRequest, res: Response) => {
    const heapMemoryMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    res.json({
      success: true,
      data: {
        uptime: Math.round(process.uptime()),
        memoryUsage: `${heapMemoryMb} MB`,
        cpuUsage: '2.5%',
        networkLatencyMs: '12ms',
        clusters: [
          { name: 'Core Ingestion Router', status: 'online', load: '14%' },
          { name: 'Queue Worker Inferences', status: 'online', load: '5%' },
          { name: 'Redis Broker', status: 'online', load: '1%' }
        ]
      },
      traceId: req.traceId || ''
    });
  }
);

// ------------------------------------------------------------------------------
// 6. Live Audit Log Streaming (SSE)
// ------------------------------------------------------------------------------
router.get(
  '/logs/stream',
  authMiddleware,
  roleGuard(['admin', 'ops']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    logger.info('[SSE-LOGS] Administrative logs connection opened', {
      traceId: req.traceId
    });

    let timestampFilter = new Date();

    const pushLogs = setInterval(async () => {
      try {
        const freshLogs = await AuditLogModel.find({ timestamp: { $gt: timestampFilter } }).sort({ timestamp: 1 });
        if (freshLogs.length > 0) {
          timestampFilter = freshLogs[freshLogs.length - 1].timestamp;
          freshLogs.forEach((log) => {
            res.write(`data: ${JSON.stringify(log)}\n\n`);
          });
        }
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ level: 'error', action: 'LOG_STREAM_ERROR', metadata: { error: err.message } })}\n\n`);
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(pushLogs);
      res.end();
      logger.info('[SSE-LOGS] Administrative logs connection closed', {
        traceId: req.traceId
      });
    });
  }
);

export default router;
