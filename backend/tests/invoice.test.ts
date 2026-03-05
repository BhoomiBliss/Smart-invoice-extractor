/// <reference types="jest" />

import request from "supertest";
import app from "../src/server";

describe("Invoice API", () => {

  test("should return error if no image provided", async () => {
    const res = await request(app)
      .post("/extract-invoice")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Image is required.");
  });

  test("should return extracted invoice data", async () => {

    const res = await request(app)
      .post("/extract-invoice")
      .send({
        base64Image: "testimagebase64"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("vendor");
  });

});