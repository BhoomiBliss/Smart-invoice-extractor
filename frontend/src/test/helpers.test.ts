import { describe, expect, it } from "vitest";
import { buildCSV, parseCurrency } from "../utils/helpers";

describe("helpers", () => {
  it("parseCurrency strips symbols", () => {
    expect(parseCurrency("$1,234.50")).toBe(1234.5);
    expect(parseCurrency("INR 9,000")).toBe(9000);
    expect(parseCurrency(undefined)).toBe(0);
  });

  it("buildCSV creates csv text", () => {
    const csv = buildCSV([
      { description: 'Desk "Pro"', quantity: 2, unit_price: 50, total: 100 }
    ]);

    expect(csv).toContain("Description,Quantity,Unit Price,Total");
    expect(csv).toContain('"Desk ""Pro""",2,50.00,100.00');
  });
});
