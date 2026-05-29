// ==============================================================================
// INFRASTRUCTURE: REDIS CONNECTION FACTORY - INVOICEFLOW AI
// ==============================================================================

import IORedis from 'ioredis';
import env from '../config/env';
import logger from '../../shared/logger';

// Enforce maxRetriesPerRequest = null to prevent BullMQ connection fail crashes
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true
});

export const redisPublisher = redis.duplicate();
export const redisSubscriber = redis.duplicate();

let isRedisConnected = false;

redis.on('connect', () => {
  isRedisConnected = true;
  logger.info('✅ Redis Main client connection initialized successfully');
});

redis.on('error', (err) => {
  isRedisConnected = false;
  logger.warn(`⚠️ Redis Main Connection Alert: ${err.message}`);
});

export const isRedisAvailable = (): boolean => isRedisConnected;
export const getRedisConnection = (): IORedis => redis;
export default redis;
