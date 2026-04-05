import { extractionAgent } from "./extractionAgent";

// Thin extraction service wrapper used by higher-level code and mocked in tests.
// Implementation delegates to `extractionAgent` for file parsing. Tests will
// typically mock `extractInvoiceData`, so keep this minimal and non-invasive.
export async function extractInvoiceData(filePath: string, mimeType: string) {
  // Delegate to low-level agent which decides between text/pdf/image processing.
  const result = await extractionAgent(filePath, mimeType);
  return result;
}
