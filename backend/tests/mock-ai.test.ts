import request from "supertest";
import app from "../src/server";

describe("Invoice JSON structure", () => {

  it("should return valid invoice structure", async () => {

    const res = await request(app)
      .post("/extract-invoice")
      .send({ base64Image: "mockimage" });

    const data = res.body.data;

    expect(data.vendor).toBeDefined();
    expect(data.items).toBeInstanceOf(Array);

    expect(data).toHaveProperty("subtotal");
    expect(data).toHaveProperty("tax");
    expect(data).toHaveProperty("shipping");
    expect(data).toHaveProperty("total");

  });

});