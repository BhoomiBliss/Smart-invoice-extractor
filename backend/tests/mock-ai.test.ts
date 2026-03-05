/// <reference types="jest" />

import request from "supertest";
import app from "../src/server";

describe("Invoice API - Mock AI Test", () => {

  test("should process invoice and return JSON structure", async () => {

    const fakeImage = "fakebase64image";

    const res = await request(app)
      .post("/extract-invoice")
      .send({
        base64Image: fakeImage
      });

    expect(res.statusCode).toBe(200);

    expect(res.body).toHaveProperty("success");

    expect(res.body.data).toHaveProperty("vendor");

    expect(res.body.data).toHaveProperty("items");

    expect(Array.isArray(res.body.data.items)).toBe(true);

  });

});