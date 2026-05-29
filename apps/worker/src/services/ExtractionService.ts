// ==============================================================================
// SERVICES: CIRCUIT-BREAKER EXTRACTION SERVICE ORCHESTRATOR - INVOICEFLOW AI
// ==============================================================================

import { Langfuse } from 'langfuse';
import { keyPool } from '../pipeline/KeyPoolManager';
import { runGeminiExtraction } from '../pipeline/GeminiProvider';
import { runOpenRouterExtraction } from '../pipeline/OpenRouterProvider';
import { runTesseractFallback, getEmptyTemplate } from '../pipeline/TesseractProvider';
import { ParsedInvoiceDTO } from '../pipeline/modelRouter';

// Initialize Langfuse observability client safely
const hasTelemetryKeys = !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || 'pk-mock-key',
  secretKey: process.env.LANGFUSE_SECRET_KEY || 'sk-mock-key',
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

export async function extractInvoice(
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string,
  jobId: string,
  userId: string
): Promise<{ dto: ParsedInvoiceDTO; routeUsed: 'gemini' | 'openrouter' | 'tesseract' }> {
  console.log(`[EXTRACTION-SERVICE] Starting AI pipeline extraction for Job: ${jobId}, User: ${userId}`);

  // Create a Langfuse trace for audit logging & pricing intelligence
  let trace: any = null;
  if (hasTelemetryKeys) {
    try {
      trace = langfuse.trace({
        name: 'invoice-extraction',
        id: jobId,
        userId: userId,
        metadata: { originalName, mimeType }
      });
    } catch (e: any) {
      console.warn('⚠️ Failed to initialize Langfuse trace:', e.message);
    }
  }

  // ==========================================
  // ROUTE A — Gemini 1.5 Flash (Primary)
  // ==========================================
  const geminiKey = await keyPool.getNextKey('gemini');
  if (geminiKey) {
    console.log('[EXTRACTION-SERVICE] Selected Route A (Gemini 1.5 Flash)');
    
    let span: any = null;
    if (trace) {
      try {
        span = trace.span({
          name: 'route-a-gemini',
          metadata: { model: 'gemini-1.5-flash' }
        });
      } catch (e) {
        // ignore telemetry errors
      }
    }
    
    const startTime = Date.now();
    try {
      const dto = await runGeminiExtraction(fileBuffer, mimeType, geminiKey);
      
      if (span) {
        try {
          span.end({
            output: dto,
            metadata: { latencyMs: Date.now() - startTime, success: true }
          });
          trace.update({ output: dto });
        } catch (e) {}
      }
      
      return { dto, routeUsed: 'gemini' };
    } catch (err: any) {
      console.warn(`[EXTRACTION-SERVICE] Gemini Route A key failed. Error: ${err.message}. Tagging and rotating...`);
      
      if (span) {
        try {
          span.end({
            level: 'ERROR',
            statusMessage: err.message,
            metadata: { latencyMs: Date.now() - startTime, success: false }
          });
        } catch (e) {}
      }

      // Mark the key status based on HTTP error code
      const isRateLimit = err.status === 429 || String(err.message).includes('429');
      if (isRateLimit) {
        keyPool.markRateLimited('gemini', geminiKey);
      } else {
        keyPool.markFailed('gemini', geminiKey);
      }

      // RETRY: Fetch next Gemini key from rotation pool
      const nextGeminiKey = await keyPool.getNextKey('gemini');
      if (nextGeminiKey) {
        console.log('[EXTRACTION-SERVICE] Retrying Route A with backup Gemini key...');
        
        let retrySpan: any = null;
        if (trace) {
          try {
            retrySpan = trace.span({
              name: 'route-a-gemini-retry',
              metadata: { model: 'gemini-1.5-flash' }
            });
          } catch (e) {}
        }
        
        const retryStart = Date.now();
        try {
          const dto = await runGeminiExtraction(fileBuffer, mimeType, nextGeminiKey);
          
          if (retrySpan) {
            try {
              retrySpan.end({
                output: dto,
                metadata: { latencyMs: Date.now() - retryStart, success: true }
              });
              trace.update({ output: dto });
            } catch (e) {}
          }
          
          return { dto, routeUsed: 'gemini' };
        } catch (retryErr: any) {
          console.warn(`[EXTRACTION-SERVICE] Gemini backup key failed. Error: ${retryErr.message}`);
          
          if (retrySpan) {
            try {
              retrySpan.end({
                level: 'ERROR',
                statusMessage: retryErr.message,
                metadata: { latencyMs: Date.now() - retryStart, success: false }
              });
            } catch (e) {}
          }

          const isBackupRateLimit = retryErr.status === 429 || String(retryErr.message).includes('429');
          if (isBackupRateLimit) {
            keyPool.markRateLimited('gemini', nextGeminiKey);
          } else {
            keyPool.markFailed('gemini', nextGeminiKey);
          }
        }
      }
    }
  } else {
    console.log('[EXTRACTION-SERVICE] Route A (Gemini) skipped: No available Gemini keys found.');
  }

  // ==========================================
  // ROUTE B — OpenRouter Vision Fallback
  // ==========================================
  console.log('[EXTRACTION-SERVICE] Cascading to Route B (OpenRouter Vision Fallback)...');
  const orKey = await keyPool.getNextKey('openrouter');
  if (orKey) {
    let span: any = null;
    if (trace) {
      try {
        span = trace.span({
          name: 'route-b-openrouter-vision',
          metadata: { model: 'qwen/qwen2.5-vl-7b-instruct:free' }
        });
      } catch (e) {}
    }
    
    const startTime = Date.now();
    try {
      const dto = await runOpenRouterExtraction(fileBuffer, mimeType, orKey);
      
      if (span) {
        try {
          span.end({
            output: dto,
            metadata: { latencyMs: Date.now() - startTime, success: true }
          });
          trace.update({ output: dto });
        } catch (e) {}
      }
      
      return { dto, routeUsed: 'openrouter' };
    } catch (err: any) {
      console.warn(`[EXTRACTION-SERVICE] OpenRouter Route B failed. Error: ${err.message}. Tagging and rotating...`);
      
      if (span) {
        try {
          span.end({
            level: 'ERROR',
            statusMessage: err.message,
            metadata: { latencyMs: Date.now() - startTime, success: false }
          });
        } catch (e) {}
      }

      const isRateLimit = err.status === 429 || String(err.message).includes('429');
      if (isRateLimit) {
        keyPool.markRateLimited('openrouter', orKey);
      } else {
        keyPool.markFailed('openrouter', orKey);
      }
    }
  } else {
    console.log('[EXTRACTION-SERVICE] Route B (OpenRouter) skipped: No available keys found.');
  }

  // ==========================================
  // ROUTE C — Local Tesseract OCR + Mistral Structuring
  // ==========================================
  console.log('[EXTRACTION-SERVICE] Cascading to Route C (Local Tesseract OCR + OpenRouter formatting)...');
  
  let span: any = null;
  if (trace) {
    try {
      span = trace.span({
        name: 'route-c-tesseract-mistral',
        metadata: { model: 'tesseract-ocr + mistral-7b' }
      });
    } catch (e) {}
  }
  
  const startTime = Date.now();
  const orKeyForOcr = (await keyPool.getNextKey('openrouter')) || '';
  
  try {
    const dto = await runTesseractFallback(fileBuffer, orKeyForOcr);
    
    if (span) {
      try {
        span.end({
          output: dto,
          metadata: { latencyMs: Date.now() - startTime, success: true }
        });
        trace.update({ output: dto });
      } catch (e) {}
    }
    
    return { dto, routeUsed: 'tesseract' };
  } catch (err: any) {
    console.error(`[EXTRACTION-SERVICE] Route C failed entirely. Returning empty schema fallback. Error: ${err.message}`);
    
    if (span) {
      try {
        span.end({
          level: 'ERROR',
          statusMessage: err.message,
          metadata: { latencyMs: Date.now() - startTime, success: false }
        });
      } catch (e) {}
    }

    const emptyTemplate = getEmptyTemplate();
    if (trace) {
      try {
        trace.update({ output: emptyTemplate });
      } catch (e) {}
    }
    return { dto: emptyTemplate, routeUsed: 'tesseract' };
  }
}
export default extractInvoice;
