import fs from "fs";
const pdfParse = require("pdf-parse");

export type InvoiceResult = {
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    total?: number; // fallback/legacy
  }>;
  notes: string | null;
  validation?: {
    items_total: number;
    expected_total: number;
    difference: number;
    is_match: boolean;
  };
  corrected_total?: number;
};

export async function extractionAgent(filePath: string, mimeType: string) {
  console.log("🚀 Agent started:", mimeType);

  const buffer = fs.readFileSync(filePath);

  // TEXT PDF
  if (mimeType === "application/pdf") {
    let text = "";

    try {
      const data = await pdfParse(buffer);
      text = data.text?.trim() || "";
      console.log("📄 PDF text length:", text.length);
    } catch (err) {
      console.warn("⚠️ pdf-parse failed");
    }

    // TEXT PDF → send as text
    if (text.length > 50) {
      return {
        type: "text",
        content: text.slice(0, 10000), // Larger buffer for text
      };
    }

    // SCANNED PDF → send as base64
    console.log("🖼️ Scanned PDF → sending as Vision input");
    return {
      type: "image",
      content: buffer.toString("base64"),
      mime: "application/pdf",
    };
  }

  // IMAGE FILE
  return {
    type: "image",
    content: buffer.toString("base64"),
    mime: mimeType,
  };
}
