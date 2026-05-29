// ==============================================================================
// WORKER: DISTRIBUTED JOB RECOVERY RECONCILER - INVOICEFLOW AI
// ==============================================================================

import Redis from 'ioredis';
import { Queue } from 'bullmq';
import crypto from 'crypto';
import { QueueJobModel } from '@multi-agent-invoice/database';
import { JobStateMachine } from '@multi-agent-invoice/shared';
import env from '../config/env';
import { getBullMQConnectionOptions } from './invoice.worker';

export class RecoveryWorker {
  private redis: Redis;
  private stateMachine: JobStateMachine;
  private workerId: string;
  private interval: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.stateMachine = new JobStateMachine(this.redis);
    this.workerId = `reconciler_${crypto.randomUUID()}`;
  }

  /**
   * Starts the periodic recovery sweep (runs every 60 seconds)
   */
  public start() {
    console.log(`🚀 Recovery Reconciler Worker active [instance=${this.workerId}]`);
    this.interval = setInterval(() => {
      this.sweepActiveJobs().catch((err) => {
        console.error('[RECOVERY-WORKER] Sweep failed with error:', err.message);
      });
    }, 60000); // Sweep every 60s
  }

  /**
   * Stops the recovery reconciler worker
   */
  public async stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    await this.redis.quit();
    console.log('[RECOVERY-WORKER] Gracefully terminated reconciler.');
  }

  /**
   * Sweeps explicit Redis jobs active index to reconcile hung tasks
   */
  private async sweepActiveJobs() {
    if (this.isSweeping) return;
    this.isSweeping = true;

    try {
      // 1. Fetch all active jobIds from index SET (O(1) cluster-friendly sweep, no blocking KEYS/SCAN)
      const activeJobIds = await this.redis.smembers('jobs:active:index');
      if (activeJobIds.length === 0) {
        this.isSweeping = false;
        return;
      }

      console.log(`[RECOVERY-WORKER] Sweeping ${activeJobIds.length} active jobs in progress...`);

      for (const jobId of activeJobIds) {
        const jobKey = `job:${jobId}`;
        
        // Retrieve job state snapshot HASH
        const fields = await this.redis.hmget(jobKey, 'state', 'updatedAt', 'version', 'traceId', 'userId', 'tenantId');
        const [state, updatedAtStr, versionStr, traceId, userId, tenantId] = fields;

        if (!state) {
          // Orphaned index -> remove
          await this.redis.srem('jobs:active:index', jobId);
          continue;
        }

        // We only reconcile non-terminal in-flight states
        if (state === 'COMPLETED' || state === 'FAILED') {
          await this.redis.srem('jobs:active:index', jobId);
          continue;
        }

        const updatedAt = updatedAtStr ? new Date(updatedAtStr).getTime() : 0;
        const elapsedMs = Date.now() - updatedAt;
        const TEN_MINUTES_MS = 10 * 60 * 1000;

        // Check if job is hung (no progress/heartbeat update for >10 minutes)
        if (elapsedMs > TEN_MINUTES_MS) {
          console.warn(`[RECOVERY-WORKER] Hung job detected! ID: ${jobId}, State: ${state}, Idle: ${Math.floor(elapsedMs / 1000)}s`);

          // 2. Lock job recovery ownership to prevent duplicate reconciliations
          const lockKey = `recovery:job:${jobId}`;
          const locked = await this.redis.set(lockKey, this.workerId, 'EX', 60, 'NX');
          
          if (!locked) {
            console.log(`[RECOVERY-WORKER] Job ${jobId} recovery lock currently held by another reconciler. Skipping.`);
            continue;
          }

          // 3. Requeue idempotency log check to prevent recovery storms
          const idempotencyKey = `recovery:requeued:${jobId}`;
          const isAlreadyRequeued = await this.redis.get(idempotencyKey);
          if (isAlreadyRequeued) {
            console.log(`[RECOVERY-WORKER] Job ${jobId} already enqueued for recovery recently. Skipping to avoid storm.`);
            continue;
          }

          await this.redis.set(idempotencyKey, '1', 'EX', 300); // 5 minutes recovery lock

          try {
            await this.reconcileHungJob({
              jobId,
              state,
              version: parseInt(versionStr || '0', 10),
              traceId: traceId || 'recovery-trace',
              userId: userId || 'guest',
              tenantId: tenantId || 'guest_tenant'
            });
          } catch (recErr: any) {
            console.error(`[RECOVERY-WORKER] Failed to reconcile job ${jobId}:`, recErr.message);
          } finally {
            // Safe lock release
            const currentLock = await this.redis.get(lockKey);
            if (currentLock === this.workerId) {
              await this.redis.del(lockKey);
            }
          }
        }
      }
    } finally {
      this.isSweeping = false;
    }
  }

  /**
   * Reschedules or fails a hung job based on retry thresholds
   */
  private async reconcileHungJob(job: {
    jobId: string;
    state: string;
    version: number;
    traceId: string;
    userId: string;
    tenantId: string;
  }) {
    const dbJob = await QueueJobModel.findOne({ jobId: job.jobId });
    const retryCount = dbJob ? (dbJob.error ? 2 : 1) : 1; // Basic tracking or default threshold

    if (retryCount >= 3) {
      console.error(`[RECOVERY-WORKER] Job ${job.jobId} exceeded recovery limits. Marking as FAILED.`);
      
      // Atomic transition to terminal FAILED state
      await this.stateMachine.transition({
        jobId: job.jobId,
        nextState: 'FAILED',
        progress: 100,
        message: 'Recovery threshold exceeded. Task processing hung indefinitely.',
        expectedVersion: job.version,
        traceId: job.traceId,
        result: { error: 'HUNG_WORKER_TIMEOUT' }
      });

      // Evict cleanups
      await this.redis.srem('jobs:active:index', job.jobId);
      await this.redis.srem(`active:jobs:${job.userId}`, job.jobId);
      
      if (dbJob) {
        await QueueJobModel.updateOne({ jobId: job.jobId }, { $set: { status: 'failed', progress: 100, error: 'HUNG_WORKER_TIMEOUT' } });
      }
      return;
    }

    console.log(`[RECOVERY-WORKER] Requeuing hung job ${job.jobId} to BullMQ queue...`);

    // Update job state in Redis to RETRYING / RECOVERING atomically
    const { version } = await this.stateMachine.transition({
      jobId: job.jobId,
      nextState: 'RETRYING',
      progress: 10,
      message: 'Reconciliation sweep triggered job reschedule.',
      expectedVersion: job.version,
      traceId: job.traceId
    });

    // Requeue to BullMQ
    const connectionOptions = getBullMQConnectionOptions(env.REDIS_URL);
    const invoiceQueue = new Queue('invoice-processing', { connection: connectionOptions });
    
    try {
      let fileUrl = `/uploads/${job.jobId}.pdf`; // Fallback template filepath structure
      let filepath = `/uploads/${job.jobId}.pdf`;
      let originalName = 'rescheduled_invoice.pdf';
      let mimeType = 'application/pdf';
      let fileSize = 100000;

      if (dbJob) {
        // Recover details from persistent snapshot
        fileUrl = dbJob.result?.fileUrl || fileUrl;
        filepath = dbJob.result?.filepath || filepath;
        originalName = dbJob.result?.originalName || originalName;
      }

      await invoiceQueue.add('process', {
        jobId: job.jobId,
        userId: job.userId,
        tenantId: job.tenantId,
        fileUrl,
        originalName,
        mimeType,
        filepath,
        fileSize,
        checksumHash: job.jobId,
        isGuest: job.userId === 'guest',
        recoveredAt: new Date().toISOString()
      }, {
        priority: 2 // Rescheduled / recovered jobs enqueued with Priority 2
      });

      // Keep version state machines fresh on database snapshot
      if (dbJob) {
        await QueueJobModel.updateOne({ jobId: job.jobId }, { $set: { status: 'queued', progress: 10, error: `Rescheduled (Recovery Attempt ${retryCount})` } });
      }

      console.log(`[RECOVERY-WORKER] Rescheduled job ${job.jobId} enqueued successfully.`);
    } finally {
      await invoiceQueue.close();
    }
  }
}
