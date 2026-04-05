"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractInvoiceData = extractInvoiceData;
const extractionAgent_1 = require("./extractionAgent");
// Thin extraction service wrapper used by higher-level code and mocked in tests.
// Implementation delegates to `extractionAgent` for file parsing. Tests will
// typically mock `extractInvoiceData`, so keep this minimal and non-invasive.
async function extractInvoiceData(filePath, mimeType) {
    // Delegate to low-level agent which decides between text/pdf/image processing.
    const result = await (0, extractionAgent_1.extractionAgent)(filePath, mimeType);
    return result;
}
