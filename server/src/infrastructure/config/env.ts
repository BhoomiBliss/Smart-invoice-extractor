// ==============================================================================
// ENVIRONMENTAL CONFIGURATIONS - INVOICEFLOW AI
// ==============================================================================

import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables from root folder (.env is 4 levels up from src/infrastructure/config)
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configurations
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_db',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT session configs
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_invoice_intelligence_platform',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // LLM Provider API Keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  
  // Langfuse Observability keys
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY || '',
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY || '',
  LANGFUSE_HOST: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  
  // Storage keys (Supabase S3 bucket fallbacks)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'invoice-bucket'
};

export default env;
