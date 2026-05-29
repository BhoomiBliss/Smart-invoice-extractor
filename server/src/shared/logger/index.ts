// ==============================================================================
// STRUCTURED JSON LOGGER - INVOICEFLOW AI
// ==============================================================================

import { getRequestContext } from '@multi-agent-invoice/shared';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  traceId?: string;
  requestId?: string;
  jobId?: string;
  userId?: string;
  tenantId?: string;
  providerName?: string;
  workerNode?: string;
  processingLatency?: number;
  [key: string]: any;
}

class PinoLogger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const store = getRequestContext();
    const logPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(store || {}),
      ...(context || {})
    };

    if (this.isProduction) {
      return JSON.stringify(logPayload);
    }

    // Colorized and readable formatting for development mode
    const colors = {
      info: '\x1b[32m[INFO]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
      debug: '\x1b[36m[DEBUG]\x1b[0m'
    };

    const ctxStr = context && Object.keys(context).length > 0
      ? ` \x1b[2m${JSON.stringify(context)}\x1b[0m`
      : '';

    return `${logPayload.timestamp} ${colors[level]}: ${message}${ctxStr}`;
  }

  public info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, context));
  }

  public warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  public error(message: string, context?: LogContext) {
    console.error(this.formatMessage('error', message, context));
  }

  public debug(message: string, context?: LogContext) {
    console.log(this.formatMessage('debug', message, context));
  }
}

export const logger = new PinoLogger();
export default logger;
