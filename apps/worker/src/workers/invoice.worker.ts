import { Worker, Queue, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import crypto from 'crypto';
import { URL } from 'url';
import { QueueJobModel } from '@multi-agent-invoice/database';
import env from '../config/env';
import UploadAgent from '../agents/upload.agent';
import OCRAgent from '../agents/ocr.agent';
import ParsingAgent from '../agents/parsing.agent';
import ValidationAgent from '../agents/validation.agent';
import ConsensusAgent from '../agents/consensus.agent';
import DBWriterAgent from '../agents/dbwriter.agent';

const uploadAgent = new UploadAgent();
const ocrAgent = new OCRAgent();
const parsingAgent = new ParsingAgent();
const validationAgent = new ValidationAgent();
const consensusAgent = new ConsensusAgent();
const dbWriterAgent = new DBWriterAgent();

export const getBullMQConnectionOptions = (urlStr: string): ConnectionOptions => {
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null
    } as any;
  } catch (error) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null
    } as any;
  }
};

export const processInvoiceJob = async (jobData: {
  jobId: string;
  userId: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  filepath: string;
  fileSize: number;
}) => {
  const { jobId, userId, originalName } = jobData;
  console.log(`[WORKER-PIPELINE] Initializing sequential agents processing for Job: ${jobId}`);

  const updateStatus = async (
    status: 'queued' | 'processing' | 'ocr_running' | 'parsing' | 'validation' | 'completed' | 'failed',
    progress: number,
    error?: string
  ) => {
    if (userId !== 'guest') {
      await QueueJobModel.updateOne({ jobId }, { $set: { status, progress, error } });
    } else {
      const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
      try {
        const currentData = await connection.get(`guest:session:${jobId}`);
        const sessionPayload = currentData ? JSON.parse(currentData) : {};
        sessionPayload.status = status;
        sessionPayload.progress = progress;
        if (error) sessionPayload.error = error;
        await connection.set(`guest:session:${jobId}`, JSON.stringify(sessionPayload), 'EX', 86400);
      } catch (err: any) {
        console.error(`[WORKER-PIPELINE] Redis Guest update error for job ${jobId}:`, err.message);
      } finally {
        await connection.quit();
      }
    }

    // Publish dynamic event via Redis Pub/Sub so that SSE Stream hydrator broadcasts in real time
    const publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    try {
      const eventPayload = {
        id: crypto.randomUUID(),
        event: status.toUpperCase(),
        progress,
        message: error || `Extraction progress stage: ${status}`,
        jobId,
        traceId: 'worker-trace'
      };
      await publisher.publish(`job:${jobId}`, JSON.stringify(eventPayload));
    } catch (err: any) {
      console.error(`[WORKER-PIPELINE] Redis publish failure for job ${jobId}:`, err.message);
    } finally {
      await publisher.quit();
    }
  };

  const startTime = Date.now();

  try {
    // 1. Ingestion / Upload validation
    await updateStatus('processing', 15);
    const uploadOutput = await uploadAgent.run(jobData);

    // 2. Optical Character Recognition Preprocessing & API Router routing
    await updateStatus('ocr_running', 40);
    const ocrOutput = await ocrAgent.run(uploadOutput);

    // 3. String normalization / Dates standardizations
    await updateStatus('parsing', 60);
    const parsingOutput = await parsingAgent.run(ocrOutput);

    // 4. Mathematical check Validation
    await updateStatus('validation', 80);
    const validationOutput = await validationAgent.run(parsingOutput);

    // 5. Consensus score resolver
    const consensusOutput = await consensusAgent.run(validationOutput);

    // 6. MongoDB Persistence Transactions
    const dbWriterOutput = await dbWriterAgent.run(consensusOutput);

    const endTime = Date.now();
    const latencyMs = endTime - startTime;
    const finalResult = dbWriterOutput.result;
    const modelUsed = finalResult.modelUsed || 'gemini-1.5-flash';

    if (userId !== 'guest') {
      await QueueJobModel.updateOne(
        { jobId },
        {
          $set: {
            status: 'completed',
            progress: 100,
            latencyMs,
            costUsd: 0.0035, // Mocked token cost metrics
            modelUsed,
            result: finalResult
          }
        }
      );
    } else {
      const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
      try {
        const currentData = await connection.get(`guest:session:${jobId}`);
        const sessionPayload = currentData ? JSON.parse(currentData) : {};
        sessionPayload.status = 'completed';
        sessionPayload.progress = 100;
        sessionPayload.latencyMs = latencyMs;
        sessionPayload.costUsd = 0.0035;
        sessionPayload.modelUsed = modelUsed;
        sessionPayload.result = finalResult;
        await connection.set(`guest:session:${jobId}`, JSON.stringify(sessionPayload), 'EX', 86400);
      } finally {
        await connection.quit();
      }
    }

    // Publish completed state to SSE registry subscribers
    const publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    try {
      const eventPayload = {
        id: crypto.randomUUID(),
        event: 'COMPLETED',
        progress: 100,
        message: 'AI document extraction completed successfully.',
        jobId,
        traceId: 'worker-trace',
        result: finalResult
      };
      await publisher.publish(`job:${jobId}`, JSON.stringify(eventPayload));
    } finally {
      await publisher.quit();
    }
    // Evict job from active jobs SET on success
    const activeJobsKey = `active:jobs:${userId}`;
    const decrRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    try {
      await decrRedis.srem(activeJobsKey, jobId);
      await decrRedis.srem('jobs:active:index', jobId);
    } catch (decrErr: any) {
      console.error(`[WORKER-PIPELINE] Concurrency eviction failed on success:`, decrErr.message);
    } finally {
      await decrRedis.quit();
    }

    console.log(`[WORKER-PIPELINE] Job ${jobId} successfully executed all agents`);
  } catch (err: any) {
    console.error(`[WORKER-PIPELINE] Error executing agents on job ${jobId}:`, err.message);
    await updateStatus('failed', 100, err.message);

    // Evict job from active jobs SET on failure
    const activeJobsKey = `active:jobs:${userId}`;
    const decrRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    try {
      await decrRedis.srem(activeJobsKey, jobId);
      await decrRedis.srem('jobs:active:index', jobId);
    } catch (decrErr: any) {
      console.error(`[WORKER-PIPELINE] Concurrency eviction failed on failure:`, decrErr.message);
    } finally {
      await decrRedis.quit();
    }
  }
};

let worker: Worker | null = null;

export const startInvoiceWorker = () => {
  const connectionOptions = getBullMQConnectionOptions(env.REDIS_URL);

  // Concurrency matches Phase D constraint (OCR Concurrency = 5)
  worker = new Worker(
    'invoice-processing',
    async (job) => {
      await processInvoiceJob(job.data);
    },
    {
      connection: connectionOptions,
      concurrency: 5,
      lockDuration: 60000,
      stalledInterval: 30000,
      maxStalledCount: 2,
      drainDelay: 5
    }
  );

  worker.on('completed', (job) => {
    console.log(`[INVOICE-WORKER] Processing completed for task: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[INVOICE-WORKER] Processing failed for task: ${job?.id}. Error:`, err.message);

    // Dead Letter Queue fallback for permanently failed tasks after retry threshold
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      console.warn(`[INVOICE-WORKER] Job ${job.id} permanently failed after ${job.attemptsMade} attempts. Transferring to DLQ...`);
      const dlqQueue = new Queue('invoice-processing-dlq', { connection: connectionOptions });
      dlqQueue.add('failed-job', {
        jobId: job.id,
        data: job.data,
        failedReason: err.message,
        failedAt: new Date().toISOString()
      }).then(() => {
        console.log(`[DLQ] Successfully pushed failed job ${job.id} to Dead Letter Queue.`);
      }).catch(dlqErr => {
        console.error(`[DLQ] Failed to transfer job ${job.id} to DLQ:`, dlqErr.message);
      }).finally(() => {
        dlqQueue.close();
      });
    }
  });

  console.log('🚀 Invoice Processing Worker active [concurrency=5]');
};

export const stopInvoiceWorker = async () => {
  if (worker) {
    await worker.close();
    console.log('[INVOICE-WORKER] Gracefully terminated worker.');
  }
};
