import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  traceId: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  role?: string;
}

export const contextStore = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return contextStore.getStore();
}

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return contextStore.run(context, fn);
}
