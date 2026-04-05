"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractionAgent = extractionAgent;
const fs_1 = __importDefault(require("fs"));
const pdfParse = require("pdf-parse");
async function extractionAgent(filePath, mimeType) {
    console.log("🚀 Agent started:", mimeType);
    const buffer = fs_1.default.readFileSync(filePath);
    // TEXT PDF
    if (mimeType === "application/pdf") {
        let text = "";
        try {
            const data = await pdfParse(buffer);
            text = data.text?.trim() || "";
            console.log("📄 PDF text length:", text.length);
        }
        catch (err) {
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
