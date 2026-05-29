// ==============================================================================
// INFRASTRUCTURE: BULLMQ SINGLETON QUEUES FACTORY - INVOICEFLOW AI
// ==============================================================================

import { Queue } from 'bullmq';
import { redis } from '../redis/redis';

// High-Priority OCR Extractions Ingestion Queue
export const invoiceQueue = new Queue('invoice-processing', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

// Decoupled Async Spreadsheet Exporter Queue (prevents blocking OCR workers)
export const exportQueue = new Queue('invoice-export', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

// Browser heartbeats and dynamic notification streams Queue
export const notificationQueue = new Queue('notifications', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});
