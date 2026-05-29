import mongoose from 'mongoose';
import { connectDatabase } from '@multi-agent-invoice/database';
import env from './config/env';
import { isRedisAvailable } from './config/redis';
import { keyPool } from './pipeline/KeyPoolManager';
import { startInvoiceWorker, stopInvoiceWorker } from './workers/invoice.worker';
import { startExportWorker, stopExportWorker } from './workers/export.worker';
import { startNotificationWorker, stopNotificationWorker } from './workers/notification.worker';
import { RecoveryWorker } from './workers/RecoveryWorker';

let recoveryWorker: RecoveryWorker | null = null;

const startWorkerApp = async () => {
  try {
    console.log('⚡ Initializing InvoiceFlow AI Worker App...');
    await connectDatabase(env.MONGODB_URI);
    console.log('✅ Database connected in Worker App');
    
    // Register rotated API key pools
    keyPool.registerPool('gemini', [
      process.env.GEMINI_API_KEY_1 || '',
      process.env.GEMINI_API_KEY_2 || '',
      process.env.GEMINI_API_KEY_3 || '',
      process.env.GEMINI_API_KEY || ''
    ]);

    keyPool.registerPool('openrouter', [
      process.env.OPENROUTER_API_KEY_1 || '',
      process.env.OPENROUTER_API_KEY_2 || '',
      process.env.OPENROUTER_API_KEY || ''
    ]);
    
    // Connect to BullMQ only if Redis broker is online
    if (isRedisAvailable()) {
      startInvoiceWorker();
      startExportWorker();
      startNotificationWorker();
      
      recoveryWorker = new RecoveryWorker();
      recoveryWorker.start();
      
      console.log('🚀 All asynchronous distributed workers are online & listening to queues');
    } else {
      console.warn('⚠️ Redis offline. BullMQ workers are idling. Check connection settings.');
    }
  } catch (error) {
    console.error('❌ Failed to start Worker runtime application:', error);
  }
};

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\n⚡ Shutting down worker application gracefully...');
  try {
    if (recoveryWorker) {
      await recoveryWorker.stop();
    }
    await stopInvoiceWorker();
    await stopExportWorker();
    await stopNotificationWorker();
    await mongoose.connection.close();
    console.log('👋 Database and Redis connections cleanly closed. Exit.');
    process.exit(0);
  } catch (err: any) {
    console.error('⚠️ Error during graceful worker shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startWorkerApp();
