import request from "supertest";
import app from "../src/server";

describe("POST /extract-invoice", () => {

  it("should return error if image missing", async () => {

    const res = await request(app)
      .post("/extract-invoice")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Image is required.");
  });


  it("should return invoice JSON in test mode", async () => {

    const res = await request(app)
      .post("/extract-invoice")
      .send({ base64Image: "fakeimagebase64" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveProperty("vendor");
    expect(res.body.data).toHaveProperty("items");
    expect(res.body.data).toHaveProperty("total");
  });

});