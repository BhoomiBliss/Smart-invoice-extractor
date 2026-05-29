// ==============================================================================
// ATOMIC JOB STATE MACHINE - INVOICEFLOW AI
// ==============================================================================

import { PipelineEvent, PIPELINE_EVENTS } from './events';

export interface RedisClientInterface {
  eval(script: string, numKeys: number, ...args: any[]): Promise<any>;
}

export interface JobStateSnapshot {
  jobId: string;
  state: string;
  progress: number;
  message: string;
  version: number;
  traceId: string;
  updatedAt: string;
  result?: string;
}

export class JobStateMachine {
  private redis: RedisClientInterface;

  constructor(redisClient: RedisClientInterface) {
    this.redis = redisClient;
  }

  /**
   * Atomic Lua script for state transition validation & event streaming.
   * Ensures CAS protection, order validation, stream appending, pubsub fanout, and TTL setup.
   */
  private static readonly TRANSITION_SCRIPT = `
    local jobKey = KEYS[1]
    local streamKey = KEYS[2]
    local pubsubChannel = KEYS[3]

    local nextState = ARGV[1]
    local nextProgress = tonumber(ARGV[2])
    local nextMessage = ARGV[3]
    local expectedVersion = tonumber(ARGV[4])
    local traceId = ARGV[5]
    local timestamp = ARGV[6]
    local resultJson = ARGV[7] or ""
    local jobId = ARGV[8]

    -- 1. Read current state and version
    local currentState = redis.call("HGET", jobKey, "state")
    local currentVersionStr = redis.call("HGET", jobKey, "version")
    local currentVersion = tonumber(currentVersionStr or "0")

    -- 2. Validate version (CAS check)
    if currentVersion ~= expectedVersion then
      return "ERR_VERSION_MISMATCH: expected " .. expectedVersion .. " but found " .. currentVersion
    end

    -- 3. Check allowed transitions helper
    local function isTransitionAllowed(curr, next)
      if curr == next then return true end
      if next == "FAILED" then return true end
      if curr == "FAILED" or curr == "COMPLETED" then
        return false -- Terminal states cannot transition
      end
      if not curr or curr == "" or curr == "CREATED" then
        return next == "QUEUED" or next == "PROCESSING"
      end
      if curr == "QUEUED" then
        return next == "PROCESSING" or next == "FAILED"
      end
      if curr == "PROCESSING" then
        return next == "OCR_RUNNING" or next == "OCR_DONE" or next == "VALIDATING" or next == "FAILED"
      end
      if curr == "OCR_RUNNING" or curr == "OCR_DONE" then
        return next == "VALIDATING" or next == "VALIDATED" or next == "FAILED"
      end
      if curr == "VALIDATING" or curr == "VALIDATED" then
        return next == "COMPLETED" or next == "FAILED"
      end
      if curr == "RECOVERING" then
        return next == "PROCESSING" or next == "QUEUED" or next == "FAILED"
      end
      if curr == "RETRYING" then
        return next == "QUEUED" or next == "PROCESSING" or next == "FAILED"
      end
      return false
    end

    if not isTransitionAllowed(currentState, nextState) then
      return "ERR_INVALID_TRANSITION: " .. (currentState or "nil") .. " -> " .. nextState
    end

    -- 4. Calculate next version
    local nextVersion = currentVersion + 1

    -- 5. Perform HSET atomically
    redis.call("HSET", jobKey, 
      "state", nextState,
      "progress", tostring(nextProgress),
      "message", nextMessage,
      "version", tostring(nextVersion),
      "traceId", traceId,
      "updatedAt", timestamp
    )

    if resultJson ~= "" then
      redis.call("HSET", jobKey, "result", resultJson)
    end

    -- 6. Append to STREAM with maxlen trimming (~1000)
    redis.call("XADD", streamKey, "MAXLEN", "~", "1000", "*",
      "event", nextState,
      "progress", tostring(nextProgress),
      "message", nextMessage,
      "version", tostring(nextVersion),
      "traceId", traceId,
      "updatedAt", timestamp,
      "result", resultJson
    )

    -- 7. Publish realtime event to Pub/Sub
    local pubSubMessage = '{"event":"' .. nextState .. '","progress":' .. nextProgress .. ',"message":"' .. nextMessage .. '","jobId":"' .. jobId .. '","traceId":"' .. traceId .. '","version":' .. nextVersion .. ',"updatedAt":"' .. timestamp .. '"}'
    redis.call("PUBLISH", pubsubChannel, pubSubMessage)

    -- 8. Set 24h expiration (86400s) on job keys if nextState is terminal (COMPLETED or FAILED)
    if nextState == "COMPLETED" or nextState == "FAILED" then
      redis.call("EXPIRE", jobKey, 86400)
      redis.call("EXPIRE", streamKey, 86400)
    end

    return "OK:" .. tostring(nextVersion) .. ":" .. nextState
  `;

  /**
   * Safely execute state transition with CAS protection.
   */
  public async transition(params: {
    jobId: string;
    nextState: string;
    progress: number;
    message: string;
    expectedVersion: number;
    traceId: string;
    result?: any;
  }): Promise<{ version: number; state: string }> {
    const jobKey = `job:${params.jobId}`;
    const streamKey = `job:event:${params.jobId}`;
    const pubsubChannel = `job:channel:${params.jobId}`;

    const timestamp = new Date().toISOString();
    const resultJson = params.result ? JSON.stringify(params.result) : '';

    const res = await this.redis.eval(
      JobStateMachine.TRANSITION_SCRIPT,
      3,
      jobKey,
      streamKey,
      pubsubChannel,
      params.nextState,
      params.progress.toString(),
      params.message,
      params.expectedVersion.toString(),
      params.traceId,
      timestamp,
      resultJson,
      params.jobId
    );

    if (typeof res === 'string') {
      if (res.startsWith('ERR_')) {
        throw new Error(res);
      }
      if (res.startsWith('OK:')) {
        const parts = res.split(':');
        return {
          version: parseInt(parts[1], 10),
          state: parts[2]
        };
      }
    }

    throw new Error(`Unexpected Redis response: ${res}`);
  }
}
