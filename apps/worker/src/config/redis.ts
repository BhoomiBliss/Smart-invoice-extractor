import Redis from 'ioredis';
import env from './env';

let redisConnection: Redis | null = null;
let redisAvailable = false;

const initRedis = () => {
  try {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 5000,
      lazyConnect: true // Prevent immediate crash if Redis is unavailable
    });

    redisConnection.on('connect', () => {
      redisAvailable = true;
      console.log('✅ Redis connection initialized successfully in Worker');
    });

    redisConnection.on('error', (err) => {
      redisAvailable = false;
      console.warn(`⚠️ Redis Connection Alert in Worker: ${err.message}`);
    });

    // Manually trigger lazy connection without blocking execution
    redisConnection.connect().catch((err) => {
      redisAvailable = false;
      console.warn(`⚠️ Redis Initial Connection failed in Worker: ${err.message}`);
    });
  } catch (error: any) {
    redisAvailable = false;
    console.warn(`⚠️ Redis setup failed in Worker: ${error.message}`);
  }
};

initRedis();

export const getRedisConnection = (): Redis | null => redisConnection;
export const isRedisAvailable = (): boolean => redisAvailable;
export default redisConnection;
