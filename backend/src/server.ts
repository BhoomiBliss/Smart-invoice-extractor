import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENROUTER_API_KEY && process.env.NODE_ENV !== "test") {
  console.error("OPENROUTER_API_KEY missing in .env");
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5000",
    "X-Title": "Smart Invoice Extractor",
  },
});

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  vendor: string;
  tax_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  total_mismatch?: boolean;
  calculated_total?: number;
}

interface ExtractResponse {
  success: boolean;
  data?: InvoiceData;
  table?: InvoiceItem[];
  error?: string;
  details?: string;
  raw_output?: string;
  model_used?: string;
}

const PRIMARY_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemma-3-27b-it:free";

function sanitizeString(value: unknown, fallback = "-"): string {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function sanitizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]+/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeAIContent(content: unknown): string {
  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          if (typeof part.text === "string") return part.text;
          if (part.type === "text" && typeof part.text === "string") {
            return part.text;
          }
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function ensureImageDataUrl(base64Image: string): string {
  const trimmed = base64Image.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function extractFirstJsonObject(text: string): string | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function repairJson(text: string): string {
  return text
    .trim()
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ");
}

function extractJSON(text: string): InvoiceData | null {
  if (!text || text.trim().length < 2) {
    console.warn("Empty AI response");
    return null;
  }

  const jsonCandidate = extractFirstJsonObject(text);
  if (!jsonCandidate) {
    console.warn("No JSON object found in AI response");
    return null;
  }

  const repaired = repairJson(jsonCandidate);

  try {
    const parsed = JSON.parse(repaired) as Partial<InvoiceData> & {
      items?: unknown;
    };

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

    const safeItems: InvoiceItem[] = rawItems.map((item: any) => ({
      description: sanitizeString(item?.description),
      quantity: sanitizeNumber(item?.quantity),
      unit_price: sanitizeNumber(item?.unit_price),
      total: sanitizeNumber(item?.total),
    }));

    let subtotal = sanitizeNumber(parsed.subtotal);
    if (subtotal === 0 && safeItems.length > 0) {
      subtotal = safeItems.reduce((sum, item) => sum + item.total, 0);
    }

    const tax = sanitizeNumber(parsed.tax);
    const shipping = sanitizeNumber(parsed.shipping);
    const discount = sanitizeNumber(parsed.discount);

    let total = sanitizeNumber(parsed.total);
    if (total === 0) {
      total = subtotal + tax + shipping - discount;
    }

    return {
      vendor: sanitizeString(parsed.vendor),
      tax_id: sanitizeString(parsed.tax_id),
      invoice_number: sanitizeString(parsed.invoice_number),
      date: sanitizeString(parsed.date),
      due_date: sanitizeString(parsed.due_date),
      items: safeItems,
      subtotal,
      tax_rate: sanitizeNumber(parsed.tax_rate),
      tax,
      shipping,
      discount,
      total,
      currency: sanitizeString(parsed.currency),
    };
  } catch (err) {
    console.error("JSON parse error:", err);
    console.error("JSON candidate:", repaired);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callInvoiceModelOnce(
  model: string,
  imageUrl: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  console.log(`Calling OpenRouter AI with model: ${model}`);

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: systemPrompt + "\n\n" + userPrompt,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ] as any,
      },
    ],
  });

  console.log("===== OPENROUTER RAW RESPONSE =====");
  console.dir(response, { depth: 8 });

  const choice = response.choices?.[0];
  if (!choice) {
    throw new Error("No choices returned by model.");
  }

  const content = choice.message?.content;
  const normalized = normalizeAIContent(content);

  if (!normalized) {
    throw new Error("Model returned empty content.");
  }

  return normalized;
}

async function callInvoiceModelWithRetry(
  model: string,
  imageUrl: string,
  systemPrompt: string,
  userPrompt: string,
  maxAttempts = 3
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} with model ${model}`);
      return await callInvoiceModelOnce(
        model,
        imageUrl,
        systemPrompt,
        userPrompt
      );
    } catch (err: any) {
      lastError = err;
      const message = err?.message || "Unknown error";
      console.error(`Attempt ${attempt} failed:`, message);

      const retryable =
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("empty content") ||
        message.includes("No choices") ||
        message.includes("timeout") ||
        message.includes("network");

      if (!retryable || attempt === maxAttempts) {
        throw err;
      }

      await sleep(1000 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown retry failure");
}

app.post(
  "/extract-invoice",
  async (req: Request, res: Response<ExtractResponse>) => {
    try {
      console.log("/extract-invoice route hit");

      const { base64Image } = req.body as { base64Image?: string };

      if (!base64Image || typeof base64Image !== "string") {
        return res.status(400).json({
          success: false,
          error: "Image is required.",
        });
      }

      const imageUrl = ensureImageDataUrl(base64Image);

      console.log("Incoming image length:", base64Image.length);
      console.log("Image URL prefix:", imageUrl.slice(0, 60));
      console.log("Primary model:", PRIMARY_MODEL);

      if (process.env.NODE_ENV === "test") {
        const mockData: InvoiceData = {
          vendor: "Test Vendor Inc.",
          tax_id: "TAX123456",
          invoice_number: "INV-2026-001",
          date: "2026-03-11",
          due_date: "2026-04-10",
          items: [
            {
              description: "Premium Widget",
              quantity: 2,
              unit_price: 49.99,
              total: 99.98,
            },
            {
              description: "Setup Fee",
              quantity: 1,
              unit_price: 25,
              total: 25,
            },
          ],
          subtotal: 124.98,
          tax_rate: 8,
          tax: 10,
          shipping: 12.5,
          discount: 0,
          total: 147.48,
          currency: "USD",
          calculated_total: 147.48,
          total_mismatch: false,
        };

        return res.json({
          success: true,
          data: mockData,
          table: mockData.items,
          model_used: "test-mode",
        });
      }

      const systemPrompt = `
You are an expert invoice OCR and data extraction assistant.
Read the invoice image carefully and return exactly one valid JSON object.
Do not return markdown.
Do not return code fences.
Do not return explanations.
Do not return extra text.

Rules:
- Use "-" for missing text fields
- Use 0 for missing numeric fields
- All numeric values must be numbers
- items must always be an array
- Preserve invoice values exactly as shown when readable
- Do not invent fields or values
`.trim();

      const userPrompt = `
Extract these fields from the invoice image and return exactly this JSON shape:

{
  "vendor": "",
  "tax_id": "",
  "invoice_number": "",
  "date": "",
  "due_date": "",
  "items": [
    {
      "description": "",
      "quantity": 0,
      "unit_price": 0,
      "total": 0
    }
  ],
  "subtotal": 0,
  "tax_rate": 0,
  "tax": 0,
  "shipping": 0,
  "discount": 0,
  "total": 0,
  "currency": ""
}
`.trim();

      let rawText = "";
      let parsed: InvoiceData | null = null;

      try {
        rawText = await callInvoiceModelWithRetry(
          PRIMARY_MODEL,
          imageUrl,
          systemPrompt,
          userPrompt,
          3
        );
      } catch (err: any) {
        console.error("Model call failed:", err);
        return res.status(500).json({
          success: false,
          error: "Invoice extraction failed",
          details: err?.message || "Model call failed",
          model_used: PRIMARY_MODEL,
        });
      }

      console.log(`AI RAW RESPONSE (${rawText.length} chars):`);
      console.log(rawText || "[EMPTY RESPONSE]");

      parsed = extractJSON(rawText);

      if (!parsed) {
        console.error("Invalid AI output:", rawText);

        return res.status(500).json({
          success: false,
          error: "AI did not return valid JSON",
          details: rawText || "Empty model response",
          raw_output:
            rawText.length > 1000 ? `${rawText.slice(0, 1000)}...` : rawText,
          model_used: PRIMARY_MODEL,
        });
      }

      const calculatedTotal =
        sanitizeNumber(parsed.subtotal) +
        sanitizeNumber(parsed.tax) +
        sanitizeNumber(parsed.shipping) -
        sanitizeNumber(parsed.discount);

      parsed.calculated_total = calculatedTotal;
      parsed.total_mismatch =
        Math.abs(calculatedTotal - sanitizeNumber(parsed.total)) > 0.01;

      console.log("Extraction successful with model:", PRIMARY_MODEL);

      return res.json({
        success: true,
        data: parsed,
        table: parsed.items,
        model_used: PRIMARY_MODEL,
      });
    } catch (err: any) {
      console.error("Full server error:");
      console.dir(err, { depth: 10 });

      const status = err?.status || err?.response?.status || 500;
      const details =
        err?.error?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Unknown error";

      return res.status(status >= 400 ? status : 500).json({
        success: false,
        error: "Extraction failed",
        details,
      });
    }
  }
);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Server error",
    details: err.message || "Unknown server error",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    console.log(`Health: http://localhost:${port}/health`);
    console.log(`Primary Model: ${PRIMARY_MODEL}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  });
}

export default app;