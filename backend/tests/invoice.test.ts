import request from "supertest";
import app from "../src/server";
import path from "path";
import fs from "fs";

jest.mock("../src/services/extractionService", () => ({
  extractInvoiceData: jest.fn().mockResolvedValue({
    data: { vendor_name: "Mock Vendor", total: 100, items: [] },
    model: "openai",
    is_fallback: false,
    latency: 100,
  }),
}));

jest.mock("../src/services/databaseService", () => ({
  saveInvoiceToCloud: jest.fn().mockResolvedValue(true),
}));

describe("POST /api/extract", () => {
  it("should return error if no file uploaded", async () => {
    const res = await request(app).post("/api/extract").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No file uploaded");
  });

  it("should extract invoice data from an image", async () => {
    const imagePath = path.resolve(
      __dirname,
      "../../System Architecture/uploadimage.jpg",
    );

    // Check if image exists before test
    if (!fs.existsSync(imagePath)) {
      console.warn(
        "Skipping image extraction test: sample image not found at",
        imagePath,
      );
      return;
    }

    const res = await request(app)
      .post("/api/extract")
      .attach("invoice", imagePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("vendor_name");
  }, 30000); // Higher timeout for AI extraction
});
