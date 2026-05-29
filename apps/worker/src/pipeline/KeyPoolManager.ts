// ==============================================================================
// PIPELINE: KEY POOL ROTATION MANAGER - INVOICEFLOW AI
// ==============================================================================

import { isRedisAvailable, getRedisConnection } from '../config/redis';

type KeyStatus = 'available' | 'rate_limited' | 'failed';

interface KeyState {
  key: string;
  status: KeyStatus;
  cooldownUntil: number; // timestamp ms
  failCount: number;
}

export class KeyPoolManager {
  private pools: Map<string, KeyState[]> = new Map();
  private cursor: Map<string, number> = new Map();

  /**
   * Registers a list of API keys under a specific provider name
   */
  registerPool(provider: string, keys: string[]) {
    const uniqueKeys = Array.from(new Set(keys)).filter(Boolean);
    this.pools.set(
      provider,
      uniqueKeys.map(k => ({
        key: k,
        status: 'available',
        cooldownUntil: 0,
        failCount: 0
      }))
    );
    this.cursor.set(provider, 0);
    console.log(`[KEY-POOL] Registered ${uniqueKeys.length} keys for provider: ${provider}`);
  }

  /**
   * Selects the next available key for a provider in a round-robin manner
   */
  async getNextKey(provider: string): Promise<string | null> {
    const pool = this.pools.get(provider) ?? [];
    if (pool.length === 0) return null;

    const now = Date.now();
    
    // Automatically transition keys out of cooldown/error status if their timer has expired
    pool.forEach(k => {
      if (k.status !== 'available' && now > k.cooldownUntil) {
        console.log(`[KEY-POOL] Restoring key status to AVAILABLE for provider ${provider} (cooldown expired)`);
        k.status = 'available';
      }
    });

    const available = pool.filter(k => k.status === 'available');
    if (available.length === 0) {
      console.warn(`[KEY-POOL] 🚨 All keys in pool for provider ${provider} are currently exhausted!`);
      return null;
    }

    let idx = 0;
    if (isRedisAvailable()) {
      try {
        const redis = getRedisConnection();
        if (redis) {
          const cursorKey = `keypool:cursor:${provider}`;
          const currentCursor = await redis.incr(cursorKey);
          idx = currentCursor % available.length;
        } else {
          const currentCursor = this.cursor.get(provider) ?? 0;
          idx = currentCursor % available.length;
          this.cursor.set(provider, idx + 1);
        }
      } catch (err: any) {
        const currentCursor = this.cursor.get(provider) ?? 0;
        idx = currentCursor % available.length;
        this.cursor.set(provider, idx + 1);
      }
    } else {
      const currentCursor = this.cursor.get(provider) ?? 0;
      idx = currentCursor % available.length;
      this.cursor.set(provider, idx + 1);
    }

    return available[idx].key;
  }

  /**
   * Marks a specific key as rate-limited (HTTP 429), initiating a 60-second cooldown
   */
  markRateLimited(provider: string, key: string) {
    const pool = this.pools.get(provider) ?? [];
    const entry = pool.find(k => k.key === key);
    if (entry) {
      entry.status = 'rate_limited';
      entry.cooldownUntil = Date.now() + 60_000; // 60s cooldown
      console.warn(`[KEY-POOL] ⚠️ Key marked as RATE_LIMITED (429) for provider ${provider}. Cooldown initialized for 60s.`);
    }
  }

  /**
   * Marks a specific key as failed (HTTP 500 / Network Error), initiating a 5-minute cooldown
   */
  markFailed(provider: string, key: string) {
    const pool = this.pools.get(provider) ?? [];
    const entry = pool.find(k => k.key === key);
    if (entry) {
      entry.failCount += 1;
      entry.status = 'failed';
      entry.cooldownUntil = Date.now() + 300_000; // 5 min cooldown on major errors
      console.error(`[KEY-POOL] ❌ Key marked as FAILED for provider ${provider} (Fail Count: ${entry.failCount}). 5-minute cooldown initialized.`);
    }
  }
}

// Singleton export — shared across all workers
export const keyPool = new KeyPoolManager();
export default keyPool;
