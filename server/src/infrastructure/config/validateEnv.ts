// ==============================================================================
// INFRASTRUCTURE: STARTUP CONFIGURATION VALIDATOR - INVOICEFLOW AI
// ==============================================================================

const REQUIRED_KEYS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
  'PORT'
];

const OPTIONAL_KEYS = [
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'OPENROUTER_API_KEY_1',
  'OPENROUTER_API_KEY_2',
  'LANGFUSE_PUBLIC_KEY',
  'LANGFUSE_SECRET_KEY'
];

export function validateEnv(): void {
  const missingRequired = REQUIRED_KEYS.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missingRequired.length > 0) {
    console.error('\n❌ [STARTUP-ERROR] Boot verification failed: Missing critical environment variables!');
    missingRequired.forEach((key) => {
      console.error(`   - ${key} is required but undefined.`);
    });
    console.error('   Please check your root monorepo .env file and restart the API Gateway server.\n');
    process.exit(1); // Crash loudly and early to prevent half-functional deployments
  }

  const missingOptional = OPTIONAL_KEYS.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missingOptional.length > 0) {
    console.warn('\n⚠️  [STARTUP-WARNING] Missing optional/telemetry variables (reduced pipeline capacity):');
    missingOptional.forEach((key) => {
      console.warn(`   - ${key} is undefined.`);
    });
    console.log('   Continuing with basic single-key capabilities...\n');
  } else {
    console.log('✅ [STARTUP] Environment configuration fully validated (multi-key pools loaded).');
  }
}

export default validateEnv;
