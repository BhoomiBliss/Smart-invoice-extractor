// ==============================================================================
// PIPELINE: TESSERACT LOCAL OCR + MISTRAL STRUCTURING - INVOICEFLOW AI
// ==============================================================================

import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import { ParsedInvoiceDTO } from './modelRouter';
import { mapToParsedInvoiceDTO } from './GeminiProvider';

export function getEmptyTemplate(): ParsedInvoiceDTO {
  return {
    vendor: { value: '', confidence: 0.05 },
    recipient: { value: '', confidence: 0.05 },
    invoiceNumber: { value: '', confidence: 0.05 },
    date: { value: '', confidence: 0.05 },
    dueDate: { value: '', confidence: 0.05 },
    currency: { value: 'INR', confidence: 0.1 },
    totalAmount: { value: 0, confidence: 0.05 },
    taxAmount: { value: 0, confidence: 0.05 },
    lineItems: [],
    summary: 'AI extraction limits reached. Local OCR text extracted. Please fill fields manually.'
  };
}

export async function runTesseractFallback(
  buffer: Buffer,
  openrouterKey: string
): Promise<ParsedInvoiceDTO> {
  console.log('[TESSERACT-PROVIDER] Executing local Tesseract OCR raw text extraction...');
  
  let ocrText = '';
  try {
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    ocrText = text;
    console.log(`[TESSERACT-PROVIDER] Successfully extracted ${ocrText.length} characters of raw text.`);
  } catch (err: any) {
    console.error('[TESSERACT-PROVIDER] Local Tesseract OCR extraction failed:', err.message);
    return getEmptyTemplate();
  }

  if (!openrouterKey || ocrText.trim().length === 0) {
    console.warn('[TESSERACT-PROVIDER] No OpenRouter key available or OCR text is empty. Serving empty template fallback.');
    const emptyTemplate = getEmptyTemplate();
    if (ocrText.trim().length > 0) {
      emptyTemplate.summary = `OCR extracted successfully but LLM structuring was bypassed. Raw text preview: ${ocrText.slice(0, 100)}...`;
    }
    return emptyTemplate;
  }

  try {
    console.log('[TESSERACT-PROVIDER] Sending raw OCR text to Mistral-7B on OpenRouter for JSON structuring...');
    const client = new OpenAI({
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://invoiceflow.ai',
        'X-Title': 'InvoiceFlow AI'
      }
    });

    const response = await client.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [
        {
          role: 'user',
          content: `You are an expert invoice data parser. The following is raw OCR text extracted from an invoice:
---
${ocrText}
---
Convert this raw text into a JSON invoice object with the fields:
vendor, recipient, invoiceNumber, date, dueDate, currency, lineItems, subtotal, taxAmount, totalAmount, summary.
Return ONLY valid JSON. No markdown, no code block fences, no extra text.
JSON structure:
{
  "vendor": string,
  "recipient": string,
  "invoiceNumber": string,
  "date": string (ISO format YYYY-MM-DD or null),
  "dueDate": string (ISO format YYYY-MM-DD or null),
  "currency": string (ISO currency code, e.g., INR, USD, EUR),
  "lineItems": [{ "description": string, "quantity": number, "price": number, "amount": number }],
  "subtotal": number,
  "taxAmount": number,
  "totalAmount": number,
  "summary": string
}
If any field is missing, use null (or empty list for lineItems).`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '{}';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return mapToParsedInvoiceDTO(parsed);
  } catch (err: any) {
    console.error('[TESSERACT-PROVIDER] OpenRouter OCR structuring failed, returning empty template:', err.message);
    const fallbackTemplate = getEmptyTemplate();
    fallbackTemplate.summary = `OCR raw text extracted, but structuring failed. Raw text preview: ${ocrText.slice(0, 150)}...`;
    return fallbackTemplate;
  }
}
export default runTesseractFallback;
