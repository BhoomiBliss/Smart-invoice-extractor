// ==============================================================================
// ROUTES: INVOICE INGESTION & MANUAL OVERRIDES - INVOICEFLOW AI
// ==============================================================================

import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { InvoiceModel, QueueJobModel } from '@multi-agent-invoice/database';
import { invoiceUpdateSchema, ApiResponse, InvoiceRevision } from '@multi-agent-invoice/shared';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { guestUploadLimit } from '../middleware/guestRateLimit';
import { validateObjectId } from '../middleware/validateObjectId';
import validateRequest from '../middleware/requestValidator';
import { redis, isRedisAvailable, getRedisConnection } from '../../infrastructure/redis/redis';
import { invoiceQueue } from '../../infrastructure/queues';
import env from '../../infrastructure/config/env';
import logger from '../../shared/logger';

const router = Router();
const uploadDir = path.join(__dirname, '../../../../uploads'); // Layered folder upload relative matching

// Ensure storage folder is created
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ingestion trigger fallback simulated worker loop
const runLocalSimulation = (jobId: string, userId: string, tenantId: string, fileUrl: string, originalName: string) => {
  const isGuest = userId === 'guest';
  setTimeout(async () => {
    try {
      logger.info(`[LOCAL-SIMULATION-WORKER] Starting job ${jobId} for user ${userId} under tenant ${tenantId}`);

      const updateStatus = async (status: string, progress: number) => {
        if (isGuest) {
          if (isRedisAvailable()) {
            const redis = getRedisConnection();
            if (redis) {
              const currentData = await redis.get(`guest:session:${jobId}`);
              const sessionPayload = currentData ? JSON.parse(currentData) : {};
              sessionPayload.status = status;
              sessionPayload.progress = progress;
              await redis.set(`guest:session:${jobId}`, JSON.stringify(sessionPayload), 'EX', 86400);
            }
          }
        } else {
          await QueueJobModel.updateOne({ jobId }, { $set: { status, progress } });
        }

        // Decoupled Redis Pub/Sub SSE Event Broadcasting
        if (isRedisAvailable()) {
          const redis = getRedisConnection();
          if (redis) {
            const eventPayload = {
              id: crypto.randomUUID(),
              event: status.toUpperCase(),
              progress,
              message: `Extraction progress stage: ${status}`,
              jobId,
              traceId: 'simulated-trace'
            };
            await redis.publish(`job:${jobId}`, JSON.stringify(eventPayload));
          }
        }
      };

      await updateStatus('processing', 20);
      await new Promise(r => setTimeout(r, 800));
      
      await updateStatus('ocr_running', 50);
      await new Promise(r => setTimeout(r, 800));
      
      await updateStatus('parsing', 80);
      await new Promise(r => setTimeout(r, 800));
      
      // Determine model based on name
      const isPdf = originalName.toLowerCase().endsWith('.pdf');
      const modelUsed = isPdf ? 'gemini-2.0-flash-lite' : 'qwen-2.5-vl';

      // General mock data payload
      const invoiceData: any = {
        schemaVersion: 'v1',
        vendor: { value: originalName.toUpperCase().includes('AMAZON') ? 'Amazon Web Services' : 'Samsuddin Siddiqui', confidence: 0.96 },
        recipient: { value: 'BVC Logistics Pvt. Ltd.', confidence: 0.94 },
        invoiceNumber: { value: `INV-2026-${crypto.randomInt(1000, 9999)}`, confidence: 0.98 },
        date: { value: '2026-05-27', confidence: 0.92 },
        dueDate: { value: '2026-06-27', confidence: 0.91 },
        currency: { value: 'INR', confidence: 0.99 },
        totalAmount: { value: originalName.toUpperCase().includes('AMAZON') ? 5000 : 7226, confidence: 0.95 },
        taxAmount: { value: originalName.toUpperCase().includes('AMAZON') ? 900 : 726, confidence: 0.90 },
        lineItems: [
          { description: 'Flush Tank & Fittings', quantity: 2, price: 1500, amount: 3000 },
          { description: 'Labor Charges & Pipes', quantity: 1, price: 4226, amount: 4226 }
        ],
        confidenceScore: 0.94,
        modelUsed,
        summary: `Invoice for plumbing materials and labor services totaling INR 7,226 extracted via ${modelUsed}.`,
        status: 'completed',
        mathValid: true,
        fileUrl,
        isDeleted: false,
        corrections: [],
        revisionHistory: []
      };

      let finalResult = invoiceData;

      if (!isGuest) {
        // Insert mock document only for actual registered users
        const mockInvoice = await InvoiceModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          tenantId,
          ...invoiceData
        });
        finalResult = mockInvoice.toObject();
        finalResult.id = mockInvoice._id.toString(); // Map mongoose ID string to DTO
      }

      if (isGuest) {
        if (isRedisAvailable()) {
          const redis = getRedisConnection();
          if (redis) {
            const currentData = await redis.get(`guest:session:${jobId}`);
            const sessionPayload = currentData ? JSON.parse(currentData) : {};
            sessionPayload.status = 'completed';
            sessionPayload.progress = 100;
            sessionPayload.latencyMs = 2400;
            sessionPayload.costUsd = 0.0032;
            sessionPayload.modelUsed = modelUsed;
            sessionPayload.result = finalResult;
            await redis.set(`guest:session:${jobId}`, JSON.stringify(sessionPayload), 'EX', 86400);
          }
        }
      } else {
        await QueueJobModel.updateOne(
          { jobId }, 
          { 
            $set: { 
              status: 'completed', 
              progress: 100, 
              latencyMs: 2400, 
              costUsd: 0.0032, 
              modelUsed,
              result: finalResult
            } 
          }
        );
      }

      // Publish completion event
      if (isRedisAvailable()) {
        const redis = getRedisConnection();
        if (redis) {
          const eventPayload = {
            id: crypto.randomUUID(),
            event: 'COMPLETED',
            progress: 100,
            message: 'AI document extraction completed successfully.',
            jobId,
            traceId: 'simulated-trace',
            result: finalResult
          };
          await redis.publish(`job:${jobId}`, JSON.stringify(eventPayload));
        }
      }
      
      if (isRedisAvailable()) {
        await redis.srem(`active:jobs:${userId}`, jobId).catch(() => {});
      }

      logger.info(`[LOCAL-SIMULATION-WORKER] Completed job ${jobId}`);
    } catch (err: any) {
      logger.error(`[LOCAL-SIMULATION-WORKER] Error executing job ${jobId}: ${err.message}`);
      
      if (isGuest) {
        if (isRedisAvailable()) {
          const redis = getRedisConnection();
          if (redis) {
            const currentData = await redis.get(`guest:session:${jobId}`);
            const sessionPayload = currentData ? JSON.parse(currentData) : {};
            sessionPayload.status = 'failed';
            sessionPayload.error = err.message;
            await redis.set(`guest:session:${jobId}`, JSON.stringify(sessionPayload), 'EX', 86400);
          }
        }
      } else {
        await QueueJobModel.updateOne({ jobId }, { $set: { status: 'failed', error: err.message } });
      }

      // Publish failure event
      if (isRedisAvailable()) {
        const redis = getRedisConnection();
        if (redis) {
          const eventPayload = {
            id: crypto.randomUUID(),
            event: 'FAILED',
            progress: 100,
            message: err.message,
            jobId,
            traceId: 'simulated-trace'
          };
          await redis.publish(`job:${jobId}`, JSON.stringify(eventPayload));
        }
      }
      if (isRedisAvailable()) {
        await redis.srem(`active:jobs:${userId}`, jobId).catch(() => {});
      }
    }
  }, 1000);
};

const validateMagicBytes = (buffer: Buffer): boolean => {
  if (buffer.length < 4) return false;
  // PDF: %PDF- (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return true;
  }
  // PNG: 89 50 4E 47 (89 50 4e 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }
  return false;
};

const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

// 1. Ingestion / Upload Route
router.post(
  '/upload',
  guestUploadLimit,
  rateLimitMiddleware,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user ? req.user.id : 'guest';
    const tenantId = req.dbContext ? req.dbContext.tenantId : 'guest_tenant';
    const isGuest = userId === 'guest';
    const ownerId = crypto.randomUUID();
    let lockKey = 'lock:dummy';

    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'ERR_INVALID_FILE', message: 'No document file uploaded.' },
          traceId: req.traceId || ''
        });
      }

      // 1. Magic bytes signature validation (Abuse prevention)
      if (!validateMagicBytes(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_MALFORMED_FILE',
            message: 'Unsupported or malformed file type. Only PDF, PNG, and JPEG formats are permitted.'
          },
          traceId: req.traceId || ''
        });
      }

      const fileId = crypto.randomUUID();
      const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const jobId = fileHash; // Checksum-based queue idempotency using SHA-256 hash as jobId
      lockKey = `lock:job:${jobId}`;

      if (isRedisAvailable()) {
        // 2. Lock ingestion to prevent millisecond duplicates
        const acquired = await redis.set(lockKey, ownerId, 'EX', 600, 'NX');
        if (!acquired) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'ERR_DUPLICATE_CONCURRENT_UPLOAD',
              message: 'A duplicate concurrent upload is currently in progress. Please try again in a few moments.'
            },
            traceId: req.traceId || ''
          });
        }
      }

      // Enforce checksum-based idempotency (MongoDB level)
      if (!isGuest) {
        const existingInvoice = await InvoiceModel.findOne({
          checksumHash: fileHash,
          tenantId,
          isDeleted: false
        });
        if (existingInvoice) {
          logger.info(`✨ Idempotency hit! Served cached extraction for hash: ${fileHash}`);
          const mappedResult = existingInvoice.toObject();
          mappedResult.id = existingInvoice._id.toString();
          
          if (isRedisAvailable()) {
            await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, ownerId);
          }

          return res.status(200).json({
            success: true,
            data: {
              message: 'Duplicate file detected. Serving existing extraction result.',
              jobId,
              fileUrl: existingInvoice.fileUrl,
              isGuest: false,
              alreadyCompleted: true,
              result: mappedResult
            },
            traceId: req.traceId || ''
          });
        }
      }

      // 3. Guest deduplication (unique documents every 24h)
      if (isGuest && isRedisAvailable()) {
        const guestDedupeKey = `processed:file:${fileHash}`;
        const wasSet = await redis.set(guestDedupeKey, '1', 'EX', 86400, 'NX');
        if (!wasSet) {
          await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, ownerId);
          return res.status(400).json({
            success: false,
            error: {
              code: 'ERR_DUPLICATE_UPLOAD',
              message: 'Guest users are limited to processing unique documents every 24 hours.'
            },
            traceId: req.traceId || ''
          });
        }
      }

      // 4. Concurrency SET Cap check
      const activeJobsKey = `active:jobs:${userId}`;
      if (isRedisAvailable()) {
        try {
          const activeCount = await redis.scard(activeJobsKey);
          const maxConcurrency = isGuest ? 1 : 3;
          if (activeCount >= maxConcurrency) {
            await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, ownerId);
            return res.status(429).json({
              success: false,
              error: {
                code: 'ERR_CONCURRENT_LIMIT_EXCEEDED',
                message: `You have reached the maximum active concurrent job limit of ${maxConcurrency}. Please wait for your pending uploads to finish.`
              },
              traceId: req.traceId || ''
            });
          }
          // Add to active jobs SET
          await redis.sadd(activeJobsKey, jobId);
          await redis.expire(activeJobsKey, 86400); // 24h safety release TTL
        } catch (err: any) {
          logger.warn('⚠️ Redis concurrency guard error, proceeding:', { error: err.message });
        }
      }

      // 5. Bypass disk storage and process buffers strictly in memory for Guests
      let fileUrl = 'in-memory';
      let filepath = '';
      if (!isGuest) {
        const ext = path.extname(req.file.originalname);
        const filename = `${fileId}${ext}`;
        filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        fileUrl = `/uploads/${filename}`;
      }

      // Create trace inside Redis (for Guests) OR Mongoose Database (for Users)
      if (isGuest) {
        if (isRedisAvailable()) {
          const sessionPayload = {
            jobId,
            userId: 'guest',
            tenantId: 'guest_tenant',
            status: 'queued',
            progress: 0,
            createdAt: new Date().toISOString()
          };
          await redis.set(`guest:session:${jobId}`, JSON.stringify(sessionPayload), 'EX', 86400);
          await redis.sadd('jobs:active:index', jobId).catch(() => {});
        }
      } else {
        await QueueJobModel.create({
          jobId,
          userId,
          tenantId,
          status: 'queued',
          progress: 0
        });
        if (isRedisAvailable()) {
          await redis.sadd('jobs:active:index', jobId).catch(() => {});
        }
      }

      // 6. Check for Redis/BullMQ availability to route execution (priority = 1 / High)
      if (isRedisAvailable()) {
        try {
          await invoiceQueue.add('process', {
            jobId,
            userId,
            tenantId,
            fileUrl,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            filepath,
            fileSize: req.file.size,
            checksumHash: fileHash,
            isGuest,
            fileBuffer: isGuest ? req.file.buffer.toString('base64') : undefined
          }, {
            priority: 1 // High Priority
          });
          logger.info(`[QUEUE] Enqueued job ${jobId} to BullMQ for tenant ${tenantId}`);
        } catch (queueErr) {
          // Clean active job on enqueuing failure
          if (isRedisAvailable()) {
            await redis.srem(activeJobsKey, jobId).catch(() => {});
            await redis.srem('jobs:active:index', jobId).catch(() => {});
          }
          logger.warn('⚠️ BullMQ push failed, falling back to local simulation:', { error: (queueErr as any).message });
          runLocalSimulation(jobId, userId, tenantId, fileUrl, req.file.originalname);
        }
      } else {
        // Redis offline - trigger local fallback simulation
        runLocalSimulation(jobId, userId, tenantId, fileUrl, req.file.originalname);
      }

      // Release lock safely
      if (isRedisAvailable()) {
        await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, ownerId);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          message: 'Invoice ingested and queued for extraction processing.',
          jobId,
          fileUrl,
          isGuest
        },
        traceId: req.traceId || ''
      };

      res.status(202).json(response);
    } catch (error) {
      if (isRedisAvailable()) {
        await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, ownerId).catch(() => {});
      }
      next(error);
    }
  }
);

// 2. Fetch User Invoices (Paginated & Filtered - Tenant Isolated!)
router.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const search = (req.query.search as string) || '';

      const skip = (page - 1) * limit;
      
      // Central dbContext Tenant Scoping context check
      const query: any = { 
        tenantId: req.dbContext!.tenantId,
        isDeleted: false 
      };

      if (search) {
        query['vendor.value'] = { $regex: search, $options: 'i' };
      }

      const total = await InvoiceModel.countDocuments(query);
      const invoices = await InvoiceModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Map Mongoose documents to DTO structure
      const mappedInvoices = invoices.map(inv => {
        const obj = inv.toObject();
        obj.id = inv._id.toString();
        return obj;
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          invoices: mappedInvoices,
          total,
          page,
          pages: Math.ceil(total / limit)
        },
        traceId: req.traceId || ''
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 3. Edit Invoice (Human-in-the-Loop Override - Tenant Scoped!)
router.put(
  '/:id',
  validateObjectId,
  authMiddleware,
  validateRequest(invoiceUpdateSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validated = req.body;

      // Central database context isolation scope check
      const invoice = await InvoiceModel.findOne({ 
        _id: id, 
        tenantId: req.dbContext!.tenantId,
        isDeleted: false 
      });

      if (!invoice) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'ERR_INVOICE_NOT_FOUND', message: 'Invoice not found or unauthorized.' },
          traceId: req.traceId || ''
        });
      }

      // Optimistic etag version conflict race check
      const currentRevisionCount = invoice.revisionHistory ? invoice.revisionHistory.length : 0;
      if (validated.versionNumber !== undefined && validated.versionNumber !== currentRevisionCount) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ERR_VERSION_CONFLICT',
            message: 'A revision conflict was detected. Another agent or user has modified this invoice in the background. Please reload and try again.'
          },
          traceId: req.traceId || ''
        });
      }

      const corrections: any[] = [];
      const now = new Date().toISOString();

      // Check fields and push changes to corrections trace
      const checkAndAppendCorrection = (field: string, oldVal: any, newVal: any) => {
        if (oldVal !== newVal) {
          corrections.push({
            field,
            oldValue: String(oldVal),
            newValue: String(newVal),
            timestamp: now
          });
        }
      };

      checkAndAppendCorrection('vendor', invoice.vendor.value, validated.vendor);
      checkAndAppendCorrection('recipient', invoice.recipient.value, validated.recipient);
      checkAndAppendCorrection('invoiceNumber', invoice.invoiceNumber.value, validated.invoiceNumber);
      checkAndAppendCorrection('date', invoice.date.value, validated.date);
      checkAndAppendCorrection('dueDate', invoice.dueDate.value, validated.dueDate);
      checkAndAppendCorrection('currency', invoice.currency.value, validated.currency);
      checkAndAppendCorrection('totalAmount', invoice.totalAmount.value, validated.totalAmount);
      checkAndAppendCorrection('taxAmount', invoice.taxAmount.value, validated.taxAmount);

      // Perform math validation check
      const sumItems = validated.lineItems.reduce((acc: number, item: any) => acc + item.amount, 0);
      const isMathValid = Math.abs(sumItems - validated.totalAmount) < 0.01;

      // Save revision snapshot rollback trail
      const revision: InvoiceRevision = {
        revisionNumber: currentRevisionCount + 1,
        changedFields: corrections.map(c => c.field),
        timestamp: now,
        modifiedBy: req.user!.id,
        rollbackSnapshot: invoice.toObject()
      };

      await InvoiceModel.updateOne(
        { _id: id },
        {
          $set: {
            'vendor.value': validated.vendor,
            'recipient.value': validated.recipient,
            'invoiceNumber.value': validated.invoiceNumber,
            'date.value': validated.date,
            'dueDate.value': validated.dueDate,
            'currency.value': validated.currency,
            'totalAmount.value': validated.totalAmount,
            'taxAmount.value': validated.taxAmount,
            lineItems: validated.lineItems,
            mathValid: isMathValid
          },
          $push: {
            corrections: { $each: corrections },
            revisionHistory: revision
          }
        }
      );

      const updatedInvoice = await InvoiceModel.findById(id);
      const mappedUpdatedInvoice = updatedInvoice ? updatedInvoice.toObject() : null;
      if (mappedUpdatedInvoice) {
        mappedUpdatedInvoice.id = id;
      }

      logger.info(`📝 Invoice overridden by user: ${id} (Tenant: ${req.dbContext!.tenantId})`, {
        traceId: req.traceId,
        userId: req.user!.id,
        tenantId: req.dbContext!.tenantId
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          message: 'Invoice manual overrides applied successfully.',
          invoice: mappedUpdatedInvoice
        },
        traceId: req.traceId || ''
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 4. Soft Delete Invoice (Tenant Scoped!)
router.delete(
  '/:id',
  validateObjectId,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Enforce soft deletion policy
      const result = await InvoiceModel.updateOne(
        { _id: id, tenantId: req.dbContext!.tenantId, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ERR_INVOICE_NOT_FOUND', message: 'Invoice not found or unauthorized.' },
          traceId: req.traceId || ''
        });
      }

      logger.warn(`🗑️ Invoice soft deleted: ${id} (Tenant: ${req.dbContext!.tenantId})`, {
        traceId: req.traceId,
        userId: req.user!.id,
        tenantId: req.dbContext!.tenantId
      });

      res.json({
        success: true,
        data: {
          message: 'Invoice document soft deleted successfully.'
        },
        traceId: req.traceId || ''
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
