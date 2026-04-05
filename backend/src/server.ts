import "dotenv/config";

import express from "express";
import cors from "cors";
import fs from "fs";
import {
  extractController,
  uploadMiddleware,
} from "./controllers/extractController";
import { authenticate } from "./middleware/authMiddleware";

const app = express();
const PORT = process.env.PORT || 5001;

process.on("unhandledRejection", (reason: unknown) => {
  const message =
    reason instanceof Error ? reason.message : String(reason ?? "");
  console.error("❌ ERROR:", message);
});

process.on("uncaughtException", (err: Error) => {
  console.error("❌ ERROR:", err.message);
});

// create uploads folder
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use(cors());
app.use(express.json());

// route (multer must run before auth so multipart body is parsed)
app.post("/api/extract", uploadMiddleware, authenticate, extractController);

// 🔥 MUST INCLUDE HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// error handler
app.use((err: any, req: any, res: any, next: any) => {
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

export default app;
