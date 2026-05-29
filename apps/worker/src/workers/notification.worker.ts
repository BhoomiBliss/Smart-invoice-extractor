import { Worker } from 'bullmq';
import { getBullMQConnectionOptions } from './invoice.worker';
import env from '../config/env';

let worker: Worker | null = null;

export const startNotificationWorker = () => {
  const connectionOptions = getBullMQConnectionOptions(env.REDIS_URL);

  // Concurrency matches Phase D constraint (Notification Concurrency = 10)
  worker = new Worker(
    'notifications',
    async (job) => {
      console.log(`[NOTIFICATION-WORKER] Received notification job: ${job.id}`);
      // Simulated processing
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { sent: true };
    },
    {
      connection: connectionOptions,
      concurrency: 10,
      lockDuration: 60000,
      stalledInterval: 30000,
      maxStalledCount: 2,
      drainDelay: 5
    }
  );

  worker.on('completed', (job) => {
    console.log(`[NOTIFICATION-WORKER] Notification job completed for task: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[NOTIFICATION-WORKER] Notification job failed for task: ${job?.id}. Error:`, err.message);
  });

  console.log('🚀 Notification Worker active [concurrency=10]');
};

export const stopNotificationWorker = async () => {
  if (worker) {
    await worker.close();
    console.log('[NOTIFICATION-WORKER] Gracefully terminated worker.');
  }
};
