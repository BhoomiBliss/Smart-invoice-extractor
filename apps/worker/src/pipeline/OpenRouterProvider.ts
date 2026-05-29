// ==============================================================================
// PIPELINE: OPENROUTER VISION FALLBACK EXTRACTOR - INVOICEFLOW AI
// ==============================================================================

import OpenAI from 'openai';
import { ParsedInvoiceDTO } from './modelRouter';
import { EXTRACTION_PROMPT, mapToParsedInvoiceDTO } from './GeminiProvider';

export async function runOpenRouterExtraction(
  buffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<ParsedInvoiceDTO> {
  console.log('[OPENROUTER-PROVIDER] Starting OpenRouter Qwen-2.5-VL Vision extraction...');

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    // OpenRouter requires these headers for identification
    defaultHeaders: {
      'HTTP-Referer': 'https://invoiceflow.ai',
      'X-Title': 'InvoiceFlow AI'
    }
  });

  const base64Data = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const response = await client.chat.completions.create({
    model: 'qwen/qwen2.5-vl-7b-instruct:free',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: EXTRACTION_PROMPT
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl
            }
          }
        ]
      }
    ],
    max_tokens: 1500,
    temperature: 0.1
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '{}';
  console.log('[OPENROUTER-PROVIDER] Received response from OpenRouter.');

  // Strict cleaning of markdown code blocks (e.g. ```json ... ```) per Qwen model issue
  const cleanJson = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  return mapToParsedInvoiceDTO(parsed);
}
export default runOpenRouterExtraction;
