// ==============================================================================
// ROUTES: SERVER-SENT EVENTS QUEUE STREAM - INVOICEFLOW AI
// ==============================================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { QueueJobModel } from '@multi-agent-invoice/database';
import { SSEEventType, SSEPayload } from '@multi-agent-invoice/shared';
import sseRegistry from '../../infrastructure/sse/SSEConnectionRegistry';
import { isRedisAvailable, getRedisConnection } from '../../infrastructure/redis/redis';
import env from '../../infrastructure/config/env';
import logger from '../../shared/logger';

const router = Router();

// Map database status fields to our standardized SSEEventType enum
const mapStatusToEvent = (status: string): SSEEventType => {
  switch (status) {
    case 'queued': return SSEEventType.QUEUED;
    case 'processing': return SSEEventType.PROCESSING;
    case 'ocr_running': return SSEEventType.OCR_RUNNING;
    case 'parsing': return SSEEventType.OCR_RUNNING;
    case 'validation': return SSEEventType.VALIDATING;
    case 'completed': return SSEEventType.COMPLETED;
    case 'failed': return SSEEventType.FAILED;
    default: return SSEEventType.PROCESSING;
  }
};

const getStageMessage = (stage: SSEEventType): string => {
  switch (stage) {
    case SSEEventType.QUEUED: return 'Job enqueued. Waiting for worker allocation.';
    case SSEEventType.PROCESSING: return 'Preprocessing invoice document buffers.';
    case SSEEventType.OCR_RUNNING: return 'Extracting structural details using AI OCR.';
    case SSEEventType.VALIDATING: return 'Validating mathematical items and tax balances.';
    case SSEEventType.COMPLETED: return 'AI document extraction completed successfully.';
    case SSEEventType.FAILED: return 'Ingestion pipeline processing failed.';
    default: return 'Processing invoice document.';
  }
};

// SSE connection stream endpoint
router.get('/:id/stream', async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const traceId = (req as any).traceId || 'unknown-trace';

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logger.info(`[SSE] Client opening SSE subscription for job stream: ${jobId}`, {
    traceId,
    jobId
  });

  // 1. Fetch current job state (Mongoose database OR Redis Ephemeral Cache for Guests!)
  try {
    let jobRecord: any = await QueueJobModel.findOne({ jobId });

    // Fallback: If not found in database, check Redis ephemeral guest cache
    if (!jobRecord && isRedisAvailable()) {
      const redis = getRedisConnection();
      const guestSession = redis ? await redis.get(`guest:session:${jobId}`) : null;
      if (guestSession) {
        jobRecord = JSON.parse(guestSession);
        logger.info(`[SSE] Guest session recovered from Redis for job: ${jobId}`, { traceId });
      }
    }
    
    if (jobRecord) {
      const eventType = mapStatusToEvent(jobRecord.status);
      const initialPayload: SSEPayload = {
        event: eventType,
        progress: jobRecord.progress,
        message: jobRecord.error || getStageMessage(eventType),
        jobId,
        traceId,
        result: jobRecord.result
      };

      res.write(`event: message\ndata: ${JSON.stringify(initialPayload)}\n\n`);

      // If the job has already finished, close the stream immediately
      if (jobRecord.status === 'completed' || jobRecord.status === 'failed') {
        res.end();
        logger.info(`[SSE] Job stream ${jobId} hydrated with final state and closed.`, { traceId, jobId });
        return;
      }
    } else {
      // Send fallback queued signal
      const defaultPayload: SSEPayload = {
        event: SSEEventType.QUEUED,
        progress: 0,
        message: 'Job enqueued. Waiting for worker allocation.',
        jobId,
        traceId
      };
      res.write(`event: message\ndata: ${JSON.stringify(defaultPayload)}\n\n`);
    }
  } catch (err: any) {
    logger.error(`[SSE] Error fetching initial state for job ${jobId}: ${err.message}`);
  }

  // 2. Register client Response stream in the central Set Map Registry
  let userId = 'guest';
  const token = (req.query.token as string) || (req.headers.authorization?.split(' ')[1]);
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      userId = decoded.id || 'guest';
    } catch (err: any) {
      logger.warn(`[SSE] Invalid token passed in stream query: ${err.message}`);
    }
  }

  const ip = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();

  const registration = await sseRegistry.add({
    userId,
    ip,
    jobId,
    res
  });

  if ('error' in registration) {
    res.write(`event: error\ndata: ${JSON.stringify({ code: registration.error, message: 'Connection rejected by scaling policies.' })}\n\n`);
    res.end();
    return;
  }

  const { connId } = registration;

  req.on('close', () => {
    // 3. Centralized cleanup and end connection
    sseRegistry.remove(connId);
  });
});

export default router;
