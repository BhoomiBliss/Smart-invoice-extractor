// ==============================================================================
// PIPELINE: GEMINI AI PRIMARY EXTRACTOR - INVOICEFLOW AI
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedInvoiceDTO } from './modelRouter';

export const EXTRACTION_PROMPT = `
You are an expert invoice data extractor. Analyze this invoice document carefully.
Return ONLY a valid JSON object. No markdown, no explanation, no backticks.
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
  "summary": string (1-2 sentence plain English summary)
}
If any field is unclear or missing, use null (or empty list for lineItems) for that field. Do not guess or invent data.`;

/**
 * Converts a raw parsed JSON object from the AI into a standard ParsedInvoiceDTO wrapper
 */
export function mapToParsedInvoiceDTO(raw: any): ParsedInvoiceDTO {
  const safeGet = (val: any) => (val !== undefined && val !== null ? String(val) : '');
  
  const totalVal = raw.totalAmount !== undefined && raw.totalAmount !== null 
    ? (typeof raw.totalAmount === 'number' ? raw.totalAmount : parseFloat(String(raw.totalAmount))) 
    : 0;

  const taxVal = raw.taxAmount !== undefined && raw.taxAmount !== null 
    ? (typeof raw.taxAmount === 'number' ? raw.taxAmount : parseFloat(String(raw.taxAmount))) 
    : 0;

  const rawLineItems = Array.isArray(raw.lineItems) ? raw.lineItems : [];
  const lineItems = rawLineItems.map((item: any) => {
    const qty = item.quantity !== undefined && item.quantity !== null 
      ? (typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity))) 
      : 1;
    
    // Support unitPrice fallback
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = rawPrice !== undefined && rawPrice !== null 
      ? (typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice))) 
      : 0;
    
    const amount = item.amount !== undefined && item.amount !== null 
      ? (typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount))) 
      : qty * price;

    return {
      description: safeGet(item.description) || 'Line item description',
      quantity: isNaN(qty) ? 1 : qty,
      price: isNaN(price) ? 0 : price,
      amount: isNaN(amount) ? 0 : amount
    };
  });

  return {
    vendor: { value: safeGet(raw.vendor), confidence: raw.vendor ? 0.98 : 0.1 },
    recipient: { value: safeGet(raw.recipient), confidence: raw.recipient ? 0.98 : 0.1 },
    invoiceNumber: { value: safeGet(raw.invoiceNumber), confidence: raw.invoiceNumber ? 0.99 : 0.1 },
    date: { value: safeGet(raw.date), confidence: raw.date ? 0.95 : 0.1 },
    dueDate: { value: safeGet(raw.dueDate), confidence: raw.dueDate ? 0.95 : 0.1 },
    currency: { value: safeGet(raw.currency || 'INR'), confidence: raw.currency ? 0.98 : 0.1 },
    totalAmount: { value: isNaN(totalVal as number) ? 0 : (totalVal as number), confidence: raw.totalAmount !== undefined ? 0.98 : 0.1 },
    taxAmount: { value: isNaN(taxVal as number) ? 0 : (taxVal as number), confidence: raw.taxAmount !== undefined ? 0.95 : 0.1 },
    lineItems,
    summary: safeGet(raw.summary) || 'Invoice extraction completed successfully.'
  };
}

export async function runGeminiExtraction(
  buffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<ParsedInvoiceDTO> {
  console.log('[GEMINI-PROVIDER] Starting Gemini 1.5 Flash structured extraction...');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const base64Data = buffer.toString('base64');
  
  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    },
    EXTRACTION_PROMPT
  ]);

  const text = result.response.text().trim();
  console.log('[GEMINI-PROVIDER] Received raw JSON response.');
  
  // Strict regex cleaning of markdown JSON fences (per senior review guidelines)
  const cleanJson = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  
  return mapToParsedInvoiceDTO(parsed);
}
