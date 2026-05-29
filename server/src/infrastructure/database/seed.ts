// ==============================================================================
// DATABASE SEEDING PROCESS - INVOICEFLOW AI
// ==============================================================================

import bcrypt from 'bcryptjs';
import { UserModel } from '@multi-agent-invoice/database';
import logger from '../../shared/logger';
import env from '../config/env';

export const seedDatabase = async () => {
  // STRICT SECURITY HARDENING: Seed only in non-production environments
  if (env.NODE_ENV === 'production') {
    logger.info('🛡️ Production environment detected. Bypassing database auto-seeding.');
    return;
  }

  try {
    const saltRounds = 10;

    // 1. Seed Dynamic Admin profile from process.env with secure fallback
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoiceflow.ai';
    const adminPassword = process.env.ADMIN_PASSWORD || 'StrongPass@123';
    const adminExists = await UserModel.findOne({ email: adminEmail });
    if (!adminExists) {
      const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);
      await UserModel.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminPasswordHash,
        role: 'admin',
        tenantId: 'tenant_admin_default',
        quotaLimit: 999999
      });
      logger.info(`👤 Seeded Default System Administrator profile: ${adminEmail}`);
    }

    // 2. Seed Default User profile for standard business flows
    const userEmail = 'user@b.com';
    const userExists = await UserModel.findOne({ email: userEmail });
    if (!userExists) {
      const userPasswordHash = await bcrypt.hash('user123', saltRounds);
      await UserModel.create({
        name: 'Standard Business User',
        email: userEmail,
        password: userPasswordHash,
        role: 'user',
        tenantId: 'tenant_user_default',
        quotaLimit: 100
      });
      logger.info('👤 Seeded Default Business User profile: user@b.com');
    }
  } catch (error: any) {
    logger.error('❌ Database seeder failed:', { error: error.message });
  }
};

export default seedDatabase;
