import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENROUTER_API_KEY) {
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

// Invoice extraction endpoint
app.post("/extract-invoice", async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image)
      return res.status(400).json({ error: "Image is required." });

    const prompt = `
You are a smart invoice parser. Extract the following fields from the image:
1. Vendor Name
2. Tax ID (if available, else return "Not provided in the image")
3. Items as a list of objects with numeric fields: quantity, unit_price, total
4. Subtotal (sum of all item totals)
5. Total (final total including taxes if mentioned, else equal to subtotal)

Return strictly valid JSON, with this structure:

{
  "vendor": "Vendor Name",
  "tax_id": "Tax ID or Not provided in the image",
  "items": [
    {
      "description": "item description",
      "quantity": 2,
      "unit_price": 120,
      "total": 240
    }
  ],
  "subtotal": 240,
  "total": 240
}
Do not include any markdown, explanations, or extra text.
`;

    const response = await openai.chat.completions.create({
      model: "qwen/qwen-2-vl-7b-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content || "";
    const cleanJson = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleanJson);
    } catch (err) {
      console.error("JSON parse error:", err, cleanJson);
      return res
        .status(500)
        .json({
          error: "Failed to parse AI output as JSON",
          rawText: cleanJson,
        });
    }

    res.json({ success: true, data });
  } catch (err: any) {
    console.error("API Error:", err.response?.data || err.message);
    res
      .status(500)
      .json({ error: "Failed to extract invoice", details: err.message });
  }
});

app.listen(port, () =>
  console.log(`🚀 Server running on http://localhost:${port}`),
);
