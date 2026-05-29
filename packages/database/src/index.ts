// ==============================================================================
// DATABASE ENTRY POINT - INVOICEFLOW AI
// ==============================================================================

import mongoose from 'mongoose';

export * from './models/User';
export * from './models/Invoice';
export * from './models/AuditLog';
export * from './models/QueueJob';
export * from './models/Telemetry';
export * from './models/UsageMetric';
export * from './models/SupportTicket';

export const connectDatabase = async (uri: string): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    console.log(`✅ MongoDB connected successfully to ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB database connection error:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
  console.log('✅ MongoDB disconnected successfully');
};
