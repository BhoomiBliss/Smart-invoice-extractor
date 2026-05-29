// ==============================================================================
// INFRASTRUCTURE: EVENT EMITTER BUS - INVOICEFLOW AI
// ==============================================================================

import { EventEmitter } from 'events';

export const eventBus = new EventEmitter();

// Core enterprise workflow events types
export enum EventType {
  INVOICE_UPLOADED = 'invoice.uploaded',
  INVOICE_COMPLETED = 'invoice.completed',
  INVOICE_FAILED = 'invoice.failed',
  EXPORT_GENERATED = 'export.generated',
  USER_SUSPENDED = 'user.suspended'
}

export default eventBus;
