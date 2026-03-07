import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();
if (!process.env.OPENROUTER_API_KEY && process.env.NODE_ENV !== "test") {
  console.error("❌ OPENROUTER_API_KEY missing in .env");
  process.exit(1);
}
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: "10mb" }));
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// 🔹 Extract JSON safely
function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// 🔹 Retry logic for rate limit
async function callAI(messages: any, retries = 2) {
  try {
    const response = await openai.chat.completions.create({
      model: "qwen/qwen-2.5-vl-7b-instruct",
      messages,
      temperature: 0,
    });

    return response;
  } catch (err: any) {
    if (err.status === 429 && retries > 0) {
      console.log("⚠ Rate limit hit. Retrying in 3 seconds...");
      await new Promise((r) => setTimeout(r, 3000));
      return callAI(messages, retries - 1);
    }

    throw err;
  }
}

// 🔹 Invoice extraction API
app.post("/extract-invoice", async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: "Image is required." });
    }

    // ✅ TEST MODE (Mock response)
    if (process.env.NODE_ENV === "test") {
      return res.json({
        success: true,
        data: {
          vendor: "Test Vendor",
          tax_id: "12345",
          invoice_number: "INV-001",
          date: "2026-03-05",
          due_date: "2026-03-10",
          items: [
            {
              description: "Test Item",
              quantity: 1,
              unit_price: 100,
              total: 100,
            },
          ],
          subtotal: 100,
          tax: 10,
          shipping: 5,
          total: 115,
        },
      });
    }

    const prompt = `
You are a financial document AI specialized in invoice data extraction.

Analyze the invoice image carefully and extract ALL structured data.

Return ONLY valid JSON. Do not include explanations.

JSON FORMAT:

{
  "vendor": "Vendor or Company Name",
  "invoice_number": "string or '-'",
  "date": "YYYY-MM-DD or '-'",
  "due_date": "YYYY-MM-DD or '-'",
  "tax_id": "Tax ID / VAT ID / GST or 'Not provided'",
  "items": [
    {
      "description": "Product or service name",
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
  "currency": "USD or detected currency"
}

IMPORTANT EXTRACTION RULES:

1. Vendor
- Extract the company name at the top of the invoice.

2. Invoice Number
- Look for fields labeled:
  "Invoice #", "Invoice No", "Invoice Number"

3. Date
- Extract invoice date.

4. Due Date
- Look for "Due Date", "Payment Due".

5. Items
- Extract each row from the product table.
- Columns usually include:
  Item / Description / Qty / Unit Price / Total

6. Subtotal
- Extract value labeled "SUBTOTAL".

7. Tax
- Extract tax value labeled:
  "TAX"

8. Tax Rate
- Extract percentage like:
  6.875%

9. Shipping
- Extract values labeled:
  "Shipping"
  "S & H"
  "Delivery"

10. Discount
- Extract if present.

11. Total
- Extract final TOTAL amount.

NUMBER RULES:
- Remove currency symbols ($ € £).
- Convert numbers to numeric values.
- If missing use 0.

DATE RULES:
- Convert to YYYY-MM-DD if possible.
- If unclear return "-".

Return ONLY JSON.
`;

    const response = await callAI([
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ]);

    const rawText = response.choices?.[0]?.message?.content || "";

    const parsed = extractJSON(rawText);

    if (!parsed) {
      return res.status(500).json({
        error: "AI did not return valid JSON",
        raw_output: rawText,
      });
    }
    // 🔹 Verify totals
    if (parsed.items && Array.isArray(parsed.items)) {
      const calculatedTotal = parsed.items.reduce(
        (sum: number, item: any) => sum + Number(item.total || 0),
        0,
      );

      const invoiceTotal = Number(parsed.total || 0);

      // difference check
      const difference = Math.abs(calculatedTotal - invoiceTotal);

      if (difference > 1) {
        console.log("⚠ Total mismatch detected");

        parsed.total_mismatch = true;
        parsed.calculated_total = calculatedTotal;
      } else {
        parsed.total_mismatch = false;
      }
    }

    res.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    console.error("❌ API Error:", err.message);

    if (err.status === 429) {
      return res.status(429).json({
        error: "Rate limit reached. Wait a few seconds and try again.",
      });
    }

    res.status(500).json({
      error: "Failed to extract invoice",
      details: err.message,
    });
  }
});

export default app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}
