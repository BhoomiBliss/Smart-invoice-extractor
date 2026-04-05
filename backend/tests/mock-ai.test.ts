import request from "supertest";
import app from "../src/server";
import path from "path";
import fs from "fs";

jest.mock("../src/services/extractionService", () => ({
  extractInvoiceData: jest.fn().mockResolvedValue({
    data: {
      vendor_name: "Mock Vendor",
      total: 100,
      subtotal: 90,
      tax: 10,
      items: [
        { description: "Mock Item", quantity: 1, unit_price: 100, total: 100 },
      ],
      confidence: 1,
    },
    model: "openai",
    is_fallback: false,
    latency: 100,
  }),
}));

jest.mock("../src/services/databaseService", () => ({
  saveInvoiceToCloud: jest.fn().mockResolvedValue({
    id: "123",
    vendor_name: "Mock Vendor",
  }),
}));

describe("Invoice JSON structure", () => {
  it("should return valid invoice structure", async () => {
    const imagePath = path.resolve(
      __dirname,
      "../../System Architecture/uploadimage.jpg",
    );

    if (!fs.existsSync(imagePath)) {
      return;
    }

    const res = await request(app)
      .post("/api/extract")
      .attach("invoice", imagePath);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.vendor_name).toBeDefined();
    expect(data.items).toBeInstanceOf(Array);

    expect(data).toHaveProperty("subtotal");
    expect(data).toHaveProperty("tax");
    expect(data).toHaveProperty("total");
  }, 30000);
});
