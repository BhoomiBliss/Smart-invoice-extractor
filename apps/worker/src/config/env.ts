import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root folder
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configurations
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_db',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // LLM Provider API Keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  
  // Langfuse Observability keys
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY || '',
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY || '',
  LANGFUSE_HOST: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
};

export default env;
