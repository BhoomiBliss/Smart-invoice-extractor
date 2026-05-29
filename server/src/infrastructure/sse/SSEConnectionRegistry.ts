// ==============================================================================
// INFRASTRUCTURE: SSE CONNECTION REGISTRY & PUB/SUB CLIENT - INVOICEFLOW AI
// ==============================================================================

import { Response } from 'express';
import crypto from 'crypto';
import { redis, redisSubscriber } from '../redis/redis';
import logger from '../../shared/logger';
import { SSEPayload as SSEEvent } from '@multi-agent-invoice/shared';

export interface SSEClientConnection {
  connId: string;
  userId: string;
  ip: string;
  jobId: string;
  res: Response;
  connectedAt: number;
}

export class SSEConnectionRegistry {
  private static instance: SSEConnectionRegistry;
  
  // Local instance maps of client connections: connId -> Client Connection Object
  private localConnections = new Map<string, SSEClientConnection>();
  
  // O(1) Channel lookup Map: jobId -> Set of local connection IDs
  private jobChannels = new Map<string, Set<string>>();
  
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private static readonly ACQUIRE_SCRIPT = `
    local globalKey = KEYS[1]
    local userKey = KEYS[2]
    local ipKey = KEYS[3]
    local connKey = KEYS[4]

    local connId = ARGV[1]
    local userId = ARGV[2]
    local ip = ARGV[3]
    local globalLimit = tonumber(ARGV[4])
    local userLimit = tonumber(ARGV[5])
    local ipLimit = tonumber(ARGV[6])

    local globalCount = tonumber(redis.call("GET", globalKey) or "0")
    if globalCount >= globalLimit then
      return "ERR_GLOBAL_LIMIT"
    end

    local userCount = tonumber(redis.call("SCARD", userKey) or "0")
    if userCount >= userLimit then
      return "ERR_USER_LIMIT"
    end

    local ipCount = tonumber(redis.call("SCARD", ipKey) or "0")
    if ipCount >= ipLimit then
      return "ERR_IP_LIMIT"
    end

    -- Acquire slots
    redis.call("INCR", globalKey)
    redis.call("SADD", userKey, connId)
    redis.call("SADD", ipKey, connId)
    redis.call("SET", connKey, userId .. ":" .. ip, "EX", 60)
    redis.call("EXPIRE", userKey, 60)
    redis.call("EXPIRE", ipKey, 60)

    return "OK"
  `;

  private static readonly RELEASE_SCRIPT = `
    local globalKey = KEYS[1]
    local userKey = KEYS[2]
    local ipKey = KEYS[3]
    local connKey = KEYS[4]

    local connId = ARGV[1]

    local exists = redis.call("DEL", connKey)
    if exists == 1 then
      redis.call("DECR", globalKey)
      redis.call("SREM", userKey, connId)
      redis.call("SREM", ipKey, connId)
    end
    return "OK"
  `;

  private constructor() {
    this.initPubSub();
    this.startHeartbeat();
  }

  public static getInstance(): SSEConnectionRegistry {
    if (!SSEConnectionRegistry.instance) {
      SSEConnectionRegistry.instance = new SSEConnectionRegistry();
    }
    return SSEConnectionRegistry.instance;
  }

  // Initialize global Redis Subscriber singleton connection
  private initPubSub() {
    try {
      redisSubscriber.on('connect', () => {
        logger.info('📡 Redis SSE Event Pub/Sub Subscriber connected successfully');
      });

      // Subscribe to all job-level progress channels
      redisSubscriber.psubscribe('job:channel:*').catch((err) => {
        logger.error('❌ Redis psubscribe registration failed:', { error: err.message });
      });

      redisSubscriber.on('pmessage', (pattern, channel, message) => {
        try {
          // Channel shape is "job:channel:{jobId}"
          const jobId = channel.split(':')[2];
          if (!jobId) return;

          const eventPayload: SSEEvent = JSON.parse(message);
          
          this.broadcastLocal(jobId, eventPayload);
        } catch (err: any) {
          logger.error('⚠️ Failed to parse Redis Pub/Sub message payload:', { error: err.message, message });
        }
      });

      redisSubscriber.on('error', (err) => {
        logger.warn(`⚠️ Redis SSE Pub/Sub Connection Alert: ${err.message}`);
      });
    } catch (error: any) {
      logger.error('❌ Redis SSE Subscriber setup crash:', { error: error.message });
    }
  }

  // Keep-alive heartbeat sweep
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      if (this.localConnections.size === 0) return;
      
      const heartbeatPayload = 'event: heartbeat\ndata: alive\n\n';
      const pipeline = redis.pipeline();
      
      for (const [connId, client] of this.localConnections.entries()) {
        try {
          if (!client.res.writableEnded) {
            client.res.write(heartbeatPayload);
            
            // Refresh Redis TTL leases for all active local client connections
            pipeline.expire(`sse:conn:${connId}`, 60);
            pipeline.expire(`sse:user:${client.userId}`, 60);
            pipeline.expire(`sse:ip:${client.ip}`, 60);
          } else {
            // Cleanup closed connection in case close event was missed
            this.removeLocal(connId);
          }
        } catch (err) {
          this.removeLocal(connId);
        }
      }

      if (pipeline.length > 0) {
        await pipeline.exec().catch((err) => {
          logger.warn('⚠️ SSE Heartbeat lease refresh failed in Redis:', { error: err.message });
        });
      }
    }, 15000); // 15 seconds heartbeat keep-alive
  }

  /**
   * Try to acquire connection slots and register a client connection.
   */
  public async add(params: {
    userId: string;
    ip: string;
    jobId: string;
    res: Response;
  }): Promise<{ connId: string } | { error: string }> {
    const connId = crypto.randomUUID();
    const globalKey = 'sse:global:count';
    const userKey = `sse:user:${params.userId}`;
    const ipKey = `sse:ip:${params.ip.replace(/:/g, '_')}`;
    const connKey = `sse:conn:${connId}`;

    // Limits
    const GLOBAL_LIMIT = 10000;
    const USER_LIMIT = 5;
    const IP_LIMIT = 20;

    try {
      const res = await redis.eval(
        SSEConnectionRegistry.ACQUIRE_SCRIPT,
        4,
        globalKey,
        userKey,
        ipKey,
        connKey,
        connId,
        params.userId,
        params.ip,
        GLOBAL_LIMIT.toString(),
        USER_LIMIT.toString(),
        IP_LIMIT.toString()
      );

      if (res !== 'OK') {
        logger.warn(`⚠️ SSE connection rejected for user ${params.userId} from IP ${params.ip}: ${res}`);
        return { error: String(res) };
      }

      // Safe locally: Register the client connection
      const connection: SSEClientConnection = {
        connId,
        userId: params.userId,
        ip: params.ip,
        jobId: params.jobId,
        res: params.res,
        connectedAt: Date.now()
      };

      this.localConnections.set(connId, connection);

      if (!this.jobChannels.has(params.jobId)) {
        this.jobChannels.set(params.jobId, new Set<string>());
      }
      this.jobChannels.get(params.jobId)!.add(connId);

      logger.info(`[SSE] Client ${connId} registered for job ${params.jobId}. Total local connections: ${this.localConnections.size}`);
      return { connId };
    } catch (err: any) {
      logger.error('❌ Failed to register SSE client in Redis:', { error: err.message });
      return { error: 'ERR_REDIS_FAILURE' };
    }
  }

  /**
   * Clean up and release a client connection from active lists.
   */
  public async remove(connId: string) {
    this.removeLocal(connId);
  }

  /**
   * Local connection release.
   */
  private async removeLocal(connId: string) {
    const connection = this.localConnections.get(connId);
    if (!connection) return;

    this.localConnections.delete(connId);

    const jobSet = this.jobChannels.get(connection.jobId);
    if (jobSet) {
      jobSet.delete(connId);
      if (jobSet.size === 0) {
        this.jobChannels.delete(connection.jobId);
      }
    }

    try {
      if (!connection.res.writableEnded) {
        connection.res.end();
      }
    } catch (err) {}

    // Async release locks in Redis via Lua script
    const globalKey = 'sse:global:count';
    const userKey = `sse:user:${connection.userId}`;
    const ipKey = `sse:ip:${connection.ip.replace(/:/g, '_')}`;
    const connKey = `sse:conn:${connId}`;

    await redis.eval(
      SSEConnectionRegistry.RELEASE_SCRIPT,
      4,
      globalKey,
      userKey,
      ipKey,
      connKey,
      connId
    ).catch((err) => {
      logger.error(`❌ Failed to release SSE Redis slot for ${connId}:`, { error: err.message });
    });

    logger.info(`[SSE] Client ${connId} released. Total local connections: ${this.localConnections.size}`);
  }

  /**
   * Broadcast message to local connection instances listening to a specific job channel.
   */
  private broadcastLocal(jobId: string, event: SSEEvent) {
    const jobSet = this.jobChannels.get(jobId);
    if (!jobSet || jobSet.size === 0) return;

    const eventString = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
    for (const connId of jobSet) {
      const connection = this.localConnections.get(connId);
      if (connection) {
        try {
          if (!connection.res.writableEnded) {
            connection.res.write(eventString);
          }
        } catch (err) {
          this.removeLocal(connId);
        }
      }
    }
  }

  /**
   * Graceful cleanup on server stop.
   */
  public async close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const connIds = Array.from(this.localConnections.keys());
    for (const connId of connIds) {
      await this.removeLocal(connId);
    }
  }
}

export const sseRegistry = SSEConnectionRegistry.getInstance();
export default sseRegistry;
