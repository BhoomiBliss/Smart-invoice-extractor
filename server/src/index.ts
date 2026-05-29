// ==============================================================================
// ENTRY POINT: INVOICEFLOW AI API GATEWAY SERVER
// ==============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import path from 'path';
import { connectDatabase } from '@multi-agent-invoice/database';
import env from './infrastructure/config/env';
import validateEnv from './infrastructure/config/validateEnv';
import logger from './shared/logger';
import seedDatabase from './infrastructure/database/seed';

// Validate env vars early on bootstrap
validateEnv();

// Layered Route Imports
import authRoutes from './api/routes/auth.routes';
import invoiceRoutes from './api/routes/invoice.routes';
import queueRoutes from './api/routes/queue.routes';
import adminRoutes from './api/routes/admin.routes';
import telemetryRoutes from './api/routes/telemetry.routes';
import healthRoutes from './api/routes/health.routes';

// Layered Middleware Imports
import errorMiddleware from './api/middleware/error.middleware';

const app = express();

// Secure Express headers (LOW-02)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"]
    }
  }
}));

// Apply explicit whitelisted CORS settings (MED-02)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://invoiceflow.vercel.app'
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '1mb' }));

// Serve uploads folder locally to access file resources (located at Monorepo level)
const uploadsLocalPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsLocalPath));

// Trace Correlation ID Middleware - logs request and trace UUIDs for every run
app.use((req: any, res: any, next: any) => {
  req.requestId = crypto.randomUUID();
  req.traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Trace-ID', req.traceId);
  next();
});

// Layered API Routes Mounting - v1 endpoints prefix
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/jobs', queueRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/health', healthRoutes); // Diagnostic diagnostic endpoints

// Base health indicator
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      env: env.NODE_ENV,
      timestamp: new Date().toISOString()
    },
    traceId: (req as any).traceId || ''
  });
});

// Central Error Boundary Middleware
app.use(errorMiddleware);

const startServer = async () => {
  try {
    await connectDatabase(env.MONGODB_URI);
    
    // Seed credentials only in development / non-production configurations
    await seedDatabase();

    app.listen(env.PORT, () => {
      logger.info(`🚀 Modular Express API Gateway active at: http://localhost:${env.PORT}`);
    });
  } catch (err: any) {
    logger.error('❌ Failed to boot Express Gateway Server:', { error: err.message });
    process.exit(1);
  }
};

startServer();
