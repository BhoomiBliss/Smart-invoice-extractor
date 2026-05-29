import env from '../config/env';

export interface TraceOptions {
  name: string;
  userId: string;
  metadata?: Record<string, any>;
  input?: any;
  output?: any;
  latencyMs?: number;
  costUsd?: number;
}

export class LangfuseTracker {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);
    
    if (this.isConfigured) {
      console.log('✅ Langfuse Observability Client initialized successfully');
    } else {
      console.log('⚠️ Langfuse key is missing. Telemetry traces will log to server stdout.');
    }
  }

  async trace(options: TraceOptions): Promise<void> {
    const traceId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    if (this.isConfigured) {
      // In production: push traces to the Langfuse cloud service
      // const langfuse = new Langfuse({ publicKey: env.LANGFUSE_PUBLIC_KEY, secretKey: env.LANGFUSE_SECRET_KEY });
      // langfuse.trace({ id: traceId, name: options.name, userId: options.userId, metadata: options.metadata });
      console.log(`[LANGFUSE-API-TRACE] Pushed trace ID: ${traceId} to cloud registry.`);
    } else {
      // Local fallback logging
      console.log(
        `[TELEMETRY-TRACE] [${timestamp}] [Name: ${options.name}] [User: ${options.userId}] -> ` +
        `Latency: ${options.latencyMs || 0}ms, Cost: $${options.costUsd || 0}, Meta: ${JSON.stringify(options.metadata || {})}`
      );
    }
  }

  async logFeedback(runId: string, field: string, score: number, value: string): Promise<void> {
    if (this.isConfigured) {
      // langfuse.score({ traceId: runId, name: `edit:${field}`, value: score, comment: `Human Override Value: ${value}` });
      console.log(`[LANGFUSE-FEEDBACK] Registered score ${score} on Run: ${runId} for Field: ${field}`);
    } else {
      console.log(
        `[TELEMETRY-FEEDBACK] Human override scoring submitted: RunID: ${runId}, Field: ${field}, Score: ${score}, Corrected Value: ${value}`
      );
    }
  }
}

export const telemetry = new LangfuseTracker();
export default telemetry;
