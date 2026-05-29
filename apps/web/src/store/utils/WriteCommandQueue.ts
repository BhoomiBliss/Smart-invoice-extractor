export interface WriteCommand {
  invoiceId: string;
  fieldPath: string;
  payload: any;
  writeKey: string;
  timestamp: number;
  execute: () => Promise<any>;
}

/**
 * BATCHED COALESCING WRITE COMMAND QUEUE - INVOICEFLOW AI
 * Mutexes sequential writes per invoiceId, enforces strict FIFO order,
 * coalesces rapid writes, and deduplicates redundant command updates.
 */
export class WriteCommandQueue {
  private static instance: WriteCommandQueue;
  
  // Per-invoice task list: invoiceId -> Array of commands
  private queues = new Map<string, WriteCommand[]>();
  // Active execution state per invoiceId
  private executing = new Map<string, boolean>();

  // Coalescing buffers and timers
  private coalescingTimers = new Map<string, NodeJS.Timeout>();
  private pendingBatches = new Map<string, WriteCommand[]>();

  public static getInstance(): WriteCommandQueue {
    if (!WriteCommandQueue.instance) {
      WriteCommandQueue.instance = new WriteCommandQueue();
    }
    return WriteCommandQueue.instance;
  }

  /**
   * Enqueues a write command, coalescing or deduplicating if possible, and triggers the worker loop.
   */
  public enqueue(
    invoiceId: string,
    fieldPath: string,
    payload: any,
    executeFn: () => Promise<any>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const serializedPayload = JSON.stringify(payload);
      
      // Hash payload for deduplication key
      let hash = 2166136261;
      for (let i = 0; i < serializedPayload.length; i++) {
        hash ^= serializedPayload.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const payloadHash = (hash >>> 0).toString(16);
      
      const writeKey = `${invoiceId}:${fieldPath}:${payloadHash}`;

      const command: WriteCommand = {
        invoiceId,
        fieldPath,
        payload,
        writeKey,
        timestamp: Date.now(),
        execute: async () => {
          try {
            const res = await executeFn();
            resolve(res);
            return res;
          } catch (err) {
            reject(err);
            throw err;
          }
        }
      };

      if (!this.pendingBatches.has(invoiceId)) {
        this.pendingBatches.set(invoiceId, []);
      }
      const batch = this.pendingBatches.get(invoiceId)!;

      // Deduplication layer: If a command with the exact same writeKey (invoiceId + field + payload hash)
      // already exists in the batch, replace it to avoid typing spam
      const existingIndex = batch.findIndex(c => c.writeKey === writeKey);
      if (existingIndex !== -1) {
        batch[existingIndex] = command;
      } else {
        // Coalescing layer (same-field within 800ms of typing)
        const lastIndex = batch.length - 1;
        if (lastIndex >= 0 && batch[lastIndex].fieldPath === fieldPath && Date.now() - batch[lastIndex].timestamp < 800) {
          batch[lastIndex] = command;
        } else {
          batch.push(command);
        }
      }

      // If there's an active coalescing timer for this invoice, do not set another one
      if (this.coalescingTimers.has(invoiceId)) {
        return;
      }

      // Establish a 50ms tick coalescing window to merge multiple updates into a single batch
      const timer = setTimeout(() => {
        this.coalescingTimers.delete(invoiceId);
        this.flushBatchToQueue(invoiceId);
      }, 50);

      this.coalescingTimers.set(invoiceId, timer);
    });
  }

  /**
   * Flushes the pending batch commands into the main execution queue, coalescing multiple field updates.
   */
  private flushBatchToQueue(invoiceId: string) {
    const batch = this.pendingBatches.get(invoiceId);
    if (!batch || batch.length === 0) return;

    this.pendingBatches.set(invoiceId, []); // Reset batch

    if (!this.queues.has(invoiceId)) {
      this.queues.set(invoiceId, []);
    }
    const queue = this.queues.get(invoiceId)!;

    // Coalesce: Since Zustand stores the full latest state, executing the LATEST enqueued command
    // in the batch will send the final merged state of all fields.
    const latestCommand = batch[batch.length - 1];

    // Deduplicate against the existing queue to avoid duplicate executing writes
    const duplicateIndex = queue.findIndex(c => c.writeKey === latestCommand.writeKey);
    if (duplicateIndex !== -1) {
      queue[duplicateIndex] = latestCommand;
      console.log(`[WRITE-QUEUE] Deduplicated command in queue for key: ${latestCommand.writeKey}`);
    } else {
      queue.push(latestCommand);
      console.log(`[WRITE-QUEUE] Enqueued coalesced command for key: ${latestCommand.writeKey}`);
    }

    // Trigger sequential queue runner
    this.run(invoiceId);
  }

  /**
   * Forces an immediate, blocking write (e.g. navigation, manual save flushes).
   * Places the command at the front of the queue and triggers synchronous run.
   */
  public async forceFlush(invoiceId: string, executeFn: () => Promise<any>): Promise<any> {
    // Clear any active coalescing timers
    if (this.coalescingTimers.has(invoiceId)) {
      clearTimeout(this.coalescingTimers.get(invoiceId)!);
      this.coalescingTimers.delete(invoiceId);
    }

    // Flush any pending batches first
    this.flushBatchToQueue(invoiceId);

    const command: WriteCommand = {
      invoiceId,
      fieldPath: 'force_flush',
      payload: {},
      writeKey: `${invoiceId}:flush:${Date.now()}`,
      timestamp: Date.now(),
      execute: executeFn
    };

    if (!this.queues.has(invoiceId)) {
      this.queues.set(invoiceId, []);
    }

    // Prepend to queue to execute immediately next
    this.queues.get(invoiceId)!.unshift(command);
    return this.run(invoiceId);
  }

  private async run(invoiceId: string): Promise<any> {
    if (this.executing.get(invoiceId)) {
      return;
    }

    const queue = this.queues.get(invoiceId);
    if (!queue || queue.length === 0) return;

    this.executing.set(invoiceId, true);
    let finalResult = null;

    try {
      while (queue.length > 0) {
        const cmd = queue.shift();
        if (cmd) {
          console.log(`[WRITE-QUEUE] Executing sequential command: ${cmd.writeKey}`);
          finalResult = await cmd.execute();
        }
      }
    } catch (err: any) {
      console.error(`[WRITE-QUEUE] Sequential write failed for invoice ${invoiceId}:`, err.message);
      throw err;
    } finally {
      this.executing.set(invoiceId, false);
    }

    return finalResult;
  }
}

export const writeCommandQueue = WriteCommandQueue.getInstance();
export default writeCommandQueue;
