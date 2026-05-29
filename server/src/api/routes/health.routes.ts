// ==============================================================================
// ROUTES: HEALTHCHECK & DIAGNOSTIC ENDPOINTS - INVOICEFLOW AI
// ==============================================================================

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { isRedisAvailable, getRedisConnection } from '../../infrastructure/config/redis';

const router = Router();

// 1. Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    traceId: (req as any).traceId || ''
  });
});

// 2. MongoDB connection check
router.get('/mongo', (req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isConnected = state === 1;
  res.status(isConnected ? 200 : 503).json({
    success: isConnected,
    data: {
      status: states[state as keyof typeof states] || 'unknown',
      database: mongoose.connection.name || 'N/A'
    },
    traceId: (req as any).traceId || ''
  });
});

// 3. Redis connection check
router.get('/redis', (req: Request, res: Response) => {
  const isConnected = isRedisAvailable();
  res.status(isConnected ? 200 : 503).json({
    success: isConnected,
    data: {
      status: isConnected ? 'connected' : 'disconnected'
    },
    traceId: (req as any).traceId || ''
  });
});

// 4. Queue telemetry check
router.get('/queue', async (req: Request, res: Response) => {
  const isRedisConnected = isRedisAvailable();
  if (!isRedisConnected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'ERR_QUEUE_OFFLINE',
        message: 'Redis queue connector is offline.'
      },
      traceId: (req as any).traceId || ''
    });
  }

  try {
    const redis = getRedisConnection();
    // BullMQ stores queue keys in redis. Let's count matching keys
    const keys = redis ? await redis.keys('bull:invoice_processing:*') : [];
    
    res.json({
      success: true,
      data: {
        status: 'online',
        activeKeysCount: keys.length
      },
      traceId: (req as any).traceId || ''
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ERR_HEALTH_CHECK_FAILED',
        message: err.message
      },
      traceId: (req as any).traceId || ''
    });
  }
});

export default router;
