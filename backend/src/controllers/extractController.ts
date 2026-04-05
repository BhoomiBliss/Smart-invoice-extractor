/// <reference path="../types/express.d.ts" />
import { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import OpenAI from "openai";
import { saveInvoiceToCloud } from "../services/databaseService";
import { InvoiceResult } from "../services/extractionAgent";
import { extractInvoiceData } from "../services/extractionService";

const upload = multer({ dest: "uploads/" });

export const uploadMiddleware = upload.single("file");

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_API_KEY
    ? "https://openrouter.ai/api/v1"
    : undefined,
});

// 🧠 COMPACT EXTRACTION ENGINE PROMPT (RULE 3)
const INVOICE_SYSTEM_PROMPT = "Extract invoice JSON. No explanation. vendor_name, invoice_number, invoice_date, total, tax, shipping, subtotal, items (description, quantity, unit_price, amount). Return only JSON.";

export async function extractController(req: Request, res: Response) {
  const file = req.file;
  const userId = req.userId;

  console.log("STEP 1: Request received");
  console.log("USER:", userId ? "AUTH" : "GUEST");
  console.log("FILE:", file);
  console.log("BODY:", req.body);

  if (!file) {
    console.error("❌ STEP 1 FAILED: No file found in req.file");
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  console.log("STEP 2: File parsed");
  console.log("STEP 3: Extraction started");

  const filePath = file.path;
  const fileBuffer = fs.readFileSync(filePath);

  try {
    const serviceResult = await extractInvoiceData(filePath, file.mimetype);

    // If the extraction service already returned a final parsed payload (tests mock this),
    // use it directly. Otherwise `serviceResult` is the input object for the AI.
    if (serviceResult && (serviceResult as any).data) {
      const aiResponse = {
        model: (serviceResult as any).model || "unknown",
      } as any;
      const result = (serviceResult as any).data as InvoiceResult;

      // 🧠 FINANCIAL VALIDATION ENGINE
      const itemsTotal = (result.items || []).reduce(
        (sum: number, i: any) => {
          const itemAmount = parseFloat(String(i.amount ?? (parseFloat(String(i.quantity || 0)) * parseFloat(String(i.unit_price || 0))))) || 0;
          return sum + itemAmount;
        },
        0,
      );
      const expectedTotal = parseFloat(String(result.total || 0));
      const difference = itemsTotal - expectedTotal;
      const isMatch = Math.abs(difference) <= 1;

      result.validation = {
        items_total: itemsTotal,
        expected_total: expectedTotal,
        difference: difference,
        is_match: isMatch,
      };

      result.corrected_total = itemsTotal;

      if (!result.total && result.items?.length > 0) {
        result.total = itemsTotal;
      }
      if (!result.vendor_name) result.vendor_name = "Unknown Vendor";

      let cloudSynced = false;
      if (userId) {
        const cloudRecord = await saveInvoiceToCloud(
          result,
          fileBuffer,
          file.mimetype,
          userId,
          {
            model: aiResponse.model,
            is_fallback: false,
          },
        );
        cloudSynced = Boolean(cloudRecord);
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log("STEP 4: Extraction done");
      console.log("STEP 5: Response sent");

      return res.json({
        success: true,
        data: result,
        model: aiResponse.model,
        cloudSynced,
      });
    }

    const input = serviceResult as any;

    // 🧩 STEP 4 — LIMIT INPUT SIZE (RULE 4)
    const safeInput = input.type === "text" ? input.content.slice(0, 2500) : input.content;

    const callAI = async (contentToUse: string, tokens: number = 600) => {
      console.log(`🧠 AI Dispatch: ${tokens} tokens quota`);

      let messages: any[] = [
        { role: "system", content: INVOICE_SYSTEM_PROMPT },
      ];

      if (input.type === "text") {
        messages.push({
          role: "user",
          content: `JSON Extract: \n\n${contentToUse}`,
        });
      } else {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract invoice JSON.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mime};base64,${contentToUse}`,
              },
            },
          ],
        });
      }

      return await openai.chat.completions.create({
        // 🧩 STEP 5 — DYNAMIC MODEL (RULE 5)
        model: process.env.OPENROUTER_API_KEY ? "openrouter/auto" : (process.env.PRIMARY_MODEL || "gpt-4o-mini"),
        messages,
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: tokens,
      });
    };

    let aiResponse;
    try {
      // 🧩 STEP 2 — SAFE TOKEN FALLBACK (RULE 2)
      aiResponse = await callAI(safeInput, 600);
    } catch (err: any) {
      console.error("⚠️ Primary extraction failed, triggering fallback...");
      try {
        aiResponse = await callAI(safeInput, 400); // Retry with lower tokens
      } catch (retryErr) {
        throw new Error("API Limit Reached: Could not extract data even with minimal tokens.");
      }
    }

    const content = aiResponse.choices[0].message.content || "{}";
    const result = JSON.parse(content) as InvoiceResult;

    if (!result || Object.keys(result).length === 0) {
      console.error("❌ STEP 4 FAILED: AI returned empty JSON");
      return res.status(500).json({
        success: false,
        error: "Empty extraction result",
      });
    }

    // 🧠 FINANCIAL VALIDATION ENGINE
    const itemsTotal = (result.items || []).reduce(
      (sum: number, i: any) => {
        const itemAmount = parseFloat(String(i.amount ?? (parseFloat(String(i.quantity || 0)) * parseFloat(String(i.unit_price || 0))))) || 0;
        return sum + itemAmount;
      },
      0,
    );

    const expectedTotal = parseFloat(String(result.total || 0));
    const difference = itemsTotal - expectedTotal;
    const isMatch = Math.abs(difference) <= 1;

    result.validation = {
      items_total: itemsTotal,
      expected_total: expectedTotal,
      difference: difference,
      is_match: isMatch,
    };

    result.corrected_total = itemsTotal;

    if (isMatch) {
      console.log("✅ Total matched");
    } else {
      console.warn(
        `❌ Mismatch: Items Sum ${itemsTotal}, Invoice Total ${expectedTotal}`,
      );
    }

    if (!result.total && result.items?.length > 0) {
      result.total = itemsTotal;
    }
    if (!result.vendor_name) result.vendor_name = "Unknown Vendor";

    let cloudSynced = false;
    if (userId) {
      const cloudRecord = await saveInvoiceToCloud(
        result,
        fileBuffer,
        file.mimetype,
        userId,
        {
          model: aiResponse.model,
          is_fallback: false,
        },
      );
      cloudSynced = Boolean(cloudRecord);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log("STEP 4: Extraction done");
    console.log("STEP 5: Response sent");

    return res.json({
      success: true,
      data: result,
      model: aiResponse.model,
      cloudSynced,
    });
  } catch (error: any) {
    console.error("❌ EXTRACTION FAILED:", error.message);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(500).json({
      success: false,
      error: "Extraction failed: " + error.message,
    });
  }
}
