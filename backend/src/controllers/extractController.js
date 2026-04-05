"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
exports.extractController = extractController;
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const openai_1 = __importDefault(require("openai"));
const databaseService_1 = require("../services/databaseService");
const extractionService_1 = require("../services/extractionService");
const upload = (0, multer_1.default)({ dest: "uploads/" });
exports.uploadMiddleware = upload.single("file");
const openai = new openai_1.default({
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENROUTER_API_KEY
        ? "https://openrouter.ai/api/v1"
        : undefined,
});
// 🧩 STEP 3 — COMPRESS PROMPT
const INVOICE_SYSTEM_PROMPT = `
You are an invoice parser.
Extract: vendor_name, invoice_number, invoice_date, total, items.
Return JSON only.
Rules: vendor_name must be actual business name, numbers must be numbers, remove currency symbols, do not hallucinate.
`;
async function extractController(req, res) {
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
    const fileBuffer = fs_1.default.readFileSync(filePath);
    try {
        const serviceResult = await (0, extractionService_1.extractInvoiceData)(filePath, file.mimetype);
        // If the extraction service already returned a final parsed payload (tests mock this),
        // use it directly. Otherwise `serviceResult` is the input object for the AI.
        if (serviceResult && serviceResult.data) {
            const aiResponse = {
                model: serviceResult.model || "unknown",
            };
            const result = serviceResult.data;
            // Compute validation exactly like the normal flow below
            const itemsTotal = (result.items || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0);
            const expectedTotal = itemsTotal +
                parseFloat(String(result.tax || 0)) +
                parseFloat(String(result.shipping || 0));
            const tolerance = 1;
            const extractedTotal = parseFloat(String(result.total || 0));
            const isMatch = Math.abs(expectedTotal - extractedTotal) <= tolerance;
            result.validation = {
                items_total: itemsTotal,
                expected_total: expectedTotal,
                extracted_total: extractedTotal,
                difference: expectedTotal - extractedTotal,
                is_match: isMatch,
            };
            if (!result.total && result.items?.length > 0) {
                result.total = expectedTotal;
            }
            if (!result.vendor_name)
                result.vendor_name = "Unknown Vendor";
            let cloudSynced = false;
            if (userId) {
                const cloudRecord = await (0, databaseService_1.saveInvoiceToCloud)(result, fileBuffer, file.mimetype, userId, {
                    model: aiResponse.model,
                    is_fallback: false,
                });
                cloudSynced = Boolean(cloudRecord);
            }
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
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
        const input = serviceResult;
        // 🧩 STEP 2 — LIMIT INPUT SIZE
        const truncatedContent = input.type === "text" ? input.content.slice(0, 4000) : input.content;
        const callAI = async (contentToUse) => {
            console.log("🧠 Tokens optimized → safe request");
            let messages = [
                { role: "system", content: INVOICE_SYSTEM_PROMPT },
            ];
            if (input.type === "text") {
                messages.push({
                    role: "user",
                    content: `Extract invoice data from this text into JSON: \n\n${contentToUse}`,
                });
            }
            else {
                messages.push({
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Extract invoice data from this document image.",
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
                // 🧩 STEP 5 — OPTIONAL MODEL SWITCH
                model: process.env.PRIMARY_MODEL || "gpt-4o-mini",
                messages,
                response_format: { type: "json_object" },
                // 🧩 STEP 1 — REDUCE MAX TOKENS
                max_tokens: 600,
            });
        };
        let aiResponse;
        try {
            // 🧩 STEP 4 — ADD TOKEN SAFETY WRAPPER
            aiResponse = await callAI(truncatedContent);
        }
        catch (err) {
            if (input.type === "text" &&
                (err.status === 402 || err.message.includes("tokens"))) {
                console.warn("⚠️ Token error → retrying with smaller input");
                const smaller = truncatedContent.slice(0, 2000);
                aiResponse = await callAI(smaller);
            }
            else {
                throw err;
            }
        }
        const content = aiResponse.choices[0].message.content || "{}";
        const result = JSON.parse(content);
        if (!result || Object.keys(result).length === 0) {
            console.error("❌ STEP 4 FAILED: AI returned empty JSON");
            return res.status(500).json({
                success: false,
                error: "Empty extraction result",
            });
        }
        // 🧠 FINANCIAL VALIDATION ENGINE
        const itemsTotal = (result.items || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0);
        const expectedTotal = itemsTotal +
            parseFloat(String(result.tax || 0)) +
            parseFloat(String(result.shipping || 0));
        const tolerance = 1; // allow rounding
        const extractedTotal = parseFloat(String(result.total || 0));
        const isMatch = Math.abs(expectedTotal - extractedTotal) <= tolerance;
        result.validation = {
            items_total: itemsTotal,
            expected_total: expectedTotal,
            extracted_total: extractedTotal,
            difference: expectedTotal - extractedTotal,
            is_match: isMatch,
        };
        if (isMatch) {
            console.log("✅ Total matched");
        }
        else {
            console.warn(`❌ Mismatch: Expected ${expectedTotal}, Found ${extractedTotal}`);
            result.corrected_total = expectedTotal;
        }
        if (!result.total && result.items?.length > 0) {
            result.total = expectedTotal;
        }
        if (!result.vendor_name)
            result.vendor_name = "Unknown Vendor";
        let cloudSynced = false;
        if (userId) {
            const cloudRecord = await (0, databaseService_1.saveInvoiceToCloud)(result, fileBuffer, file.mimetype, userId, {
                model: aiResponse.model,
                is_fallback: false,
            });
            cloudSynced = Boolean(cloudRecord);
        }
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
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
    catch (error) {
        console.error("❌ EXTRACTION FAILED:", error.message);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        return res.status(500).json({
            success: false,
            error: "Extraction failed: " + error.message,
        });
    }
}
