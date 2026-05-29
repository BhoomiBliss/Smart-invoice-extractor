// ==============================================================================
// GLOBAL CONSTANTS - INVOICEFLOW AI
// ==============================================================================

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.70;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
] as const;

export const PIPELINE_STAGES = [
  'queued',
  'processing',
  'ocr_running',
  'parsing',
  'validation',
  'completed',
  'failed'
] as const;

export const USER_ROLES = ['admin', 'manager', 'viewer', 'user', 'support', 'ops'] as const;

export const GUEST_DAILY_LIMIT = 3;
export const USER_DAILY_LIMIT = 100;
export const PREMIUM_DAILY_LIMIT = 1000;
export const ADMIN_DAILY_LIMIT = 9999999;
