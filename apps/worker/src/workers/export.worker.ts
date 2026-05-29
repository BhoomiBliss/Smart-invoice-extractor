// ==============================================================================
// WORKER: SPREADSHEET EXPORTS GENERATOR - INVOICEFLOW AI
// ==============================================================================

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import crypto from 'crypto';
import { getBullMQConnectionOptions } from './invoice.worker';
import env from '../config/env';

let worker: Worker | null = null;

const sanitizeCellValue = (value: string): string => {
  if (typeof value !== 'string') return value;
  // Neutralize CSV cell formula injection (starting with =, +, -, @)
  if (value.startsWith('=') || value.startsWith('+') || value.startsWith('-') || value.startsWith('@')) {
    return `'${value}`;
  }
  return value;
};

const sanitizeFilename = (filename: string): string => {
  // Prevent path traversal and malicious filenames
  return filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
};

export const startExportWorker = () => {
  const connectionOptions = getBullMQConnectionOptions(env.REDIS_URL);

  // Concurrency matches Phase D constraint (Export Concurrency = 2)
  worker = new Worker(
    'invoice-export',
    async (job) => {
      const { tenantId, invoiceId, format, revisionNumber, invoiceData } = job.data;
      
      console.log(`[EXPORT-WORKER] Received spreadsheet export job: ${job.id} for tenant: ${tenantId}`);

      // Calculate SHA-256 version-bound tenant-isolated export hash
      const dataToHash = `${tenantId}:${invoiceId}:${format}:${revisionNumber || 1}`;
      const exportHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
      const cacheKey = `export:cache:${exportHash}`;

      // Check Redis cache for matching export
      const cacheLookupRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
      try {
        const cached = await cacheLookupRedis.get(cacheKey);
        if (cached) {
          console.log(`✨ Export Cache Hit! Serving cached export for hash: ${exportHash}`);
          return JSON.parse(cached);
        }
      } catch (err: any) {
        console.warn(`⚠️ Redis export cache lookup failed: ${err.message}`);
      } finally {
        await cacheLookupRedis.quit();
      }

      // Neutralize formula injection in cells
      const sanitizedData = invoiceData ? JSON.parse(JSON.stringify(invoiceData)) : {};
      if (sanitizedData.vendor && typeof sanitizedData.vendor.value === 'string') {
        sanitizedData.vendor.value = sanitizeCellValue(sanitizedData.vendor.value);
      }
      if (sanitizedData.recipient && typeof sanitizedData.recipient.value === 'string') {
        sanitizedData.recipient.value = sanitizeCellValue(sanitizedData.recipient.value);
      }
      if (sanitizedData.invoiceNumber && typeof sanitizedData.invoiceNumber.value === 'string') {
        sanitizedData.invoiceNumber.value = sanitizeCellValue(sanitizedData.invoiceNumber.value);
      }
      if (Array.isArray(sanitizedData.lineItems)) {
        sanitizedData.lineItems.forEach((item: any) => {
          if (item.description) {
            item.description = sanitizeCellValue(item.description);
          }
        });
      }

      // Simulate export spreadsheet compilation latency
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const safeFilename = sanitizeFilename(`export_${invoiceId}_v${revisionNumber || 1}`);
      const result = { success: true, url: `/downloads/${safeFilename}.${format}` };

      // Write-through cache to Redis (24h TTL)
      const cacheWriteRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
      try {
        await cacheWriteRedis.set(cacheKey, JSON.stringify(result), 'EX', 86400);
        console.log(`💾 Export written to write-through cache: ${cacheKey}`);
      } catch (err: any) {
        console.warn(`⚠️ Failed to write export cache to Redis: ${err.message}`);
      } finally {
        await cacheWriteRedis.quit();
      }

      console.log(`[EXPORT-WORKER] Successfully generated spreadsheet export for job: ${job.id}`);
      return result;
    },
    {
      connection: connectionOptions,
      concurrency: 2,
      lockDuration: 60000,
      stalledInterval: 30000,
      maxStalledCount: 2,
      drainDelay: 5
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EXPORT-WORKER] Export job completed for task: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EXPORT-WORKER] Export job failed for task: ${job?.id}. Error:`, err.message);
  });

  console.log('🚀 Export Processing Worker active [concurrency=2]');
};

export const stopExportWorker = async () => {
  if (worker) {
    await worker.close();
    console.log('[EXPORT-WORKER] Gracefully terminated worker.');
  }
};
