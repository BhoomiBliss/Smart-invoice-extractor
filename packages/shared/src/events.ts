// ==============================================================================
// PIPELINE EVENT CONTRACT REGISTRY - INVOICEFLOW AI
// ==============================================================================

export const PIPELINE_EVENTS = {
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_UPDATED: 'INVOICE_UPDATED',
  JOB_QUEUED: 'JOB_QUEUED',
  JOB_PROCESSING: 'JOB_PROCESSING',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_FAILED: 'JOB_FAILED',
  OCR_RUNNING: 'OCR_RUNNING',
  VALIDATING: 'VALIDATING'
} as const;

export type PipelineEvent = typeof PIPELINE_EVENTS[keyof typeof PIPELINE_EVENTS];
