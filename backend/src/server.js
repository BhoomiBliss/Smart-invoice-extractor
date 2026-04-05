"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const extractController_1 = require("./controllers/extractController");
const authMiddleware_1 = require("./middleware/authMiddleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    console.error("❌ ERROR:", message);
});
process.on("uncaughtException", (err) => {
    console.error("❌ ERROR:", err.message);
});
// create uploads folder
if (!fs_1.default.existsSync("uploads")) {
    fs_1.default.mkdirSync("uploads");
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// route (multer must run before auth so multipart body is parsed)
app.post("/api/extract", extractController_1.uploadMiddleware, authMiddleware_1.authenticate, extractController_1.extractController);
// 🔥 MUST INCLUDE HEALTH CHECK
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// error handler
app.use((err, req, res, next) => {
    // 🧩 STEP 5 — HANDLE MULTER ERROR SAFELY
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
        console.error("❌ Multer Error: Unexpected field", err.field);
        return res.status(400).json({
            success: false,
            error: "Invalid file field. Expected 'file'",
        });
    }
    console.error("Unhandled Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
});
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log("✅ Multi-model fallback + Auth + DB isolation active");
    });
}
exports.default = app;
