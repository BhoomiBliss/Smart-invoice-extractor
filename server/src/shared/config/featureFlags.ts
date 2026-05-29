// ==============================================================================
// FEATURE FLAGS CONFIGURATION - INVOICEFLOW AI
// ==============================================================================

export const featureFlags = {
  // AI processing flags
  ENABLE_MULTI_PROVIDER: true,
  ENABLE_MULTI_AGENT: false,        // Deferred to Phase 2
  ENABLE_AI_ANALYTICS: false,       // Deferred to Phase 2
  
  // Enterprise workflow flags
  ENABLE_SUPPORT_CENTER: false,     // Deferred to Phase 2
  ENABLE_WEBHOOKS: false,           // Deferred to Phase 2
  ENABLE_EXPORT_ASYNC: true,        // Phase 1 Async Exporter
  
  // Development simulation flags
  DEV_SIMULATE_OCR: process.env.NODE_ENV === 'development',
  DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT === 'true'
};

export default featureFlags;
