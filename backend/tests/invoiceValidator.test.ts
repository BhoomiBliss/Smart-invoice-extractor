import {
  isExtractionEmpty,
  validateCalculations,
} from "../src/utils/validator";

const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

describe("isExtractionEmpty", () => {
  test("EMPTY OBJECT", () => {
    expect(isExtractionEmpty({})).toBe(true);
  });

  test("NULL INPUT", () => {
    expect(isExtractionEmpty(null as any)).toBe(true);
  });

  test("ONLY VENDOR", () => {
    expect(isExtractionEmpty({ vendor_name: "ABC Corp" })).toBe(false);
  });

  test("ONLY TOTAL", () => {
    expect(isExtractionEmpty({ total: 100 })).toBe(false);
  });

  test("ONLY ITEMS", () => {
    expect(isExtractionEmpty({ items: [{ amount: 50 }] })).toBe(false);
  });

  test("VALID DATA", () => {
    expect(
      isExtractionEmpty({
        vendor_name: "ABC",
        invoice_number: "INV-1",
        total: 100,
        invoice_date: "2024-01-01",
        items: [{ amount: 100 }],
      }),
    ).toBe(false);
  });

  test("ALL EMPTY", () => {
    expect(
      isExtractionEmpty({
        vendor_name: "",
        invoice_number: "",
        total: null,
        invoice_date: "",
        items: [],
      } as any),
    ).toBe(true);
  });
});

describe("validateCalculations", () => {
  test("PERFECT MATCH", () => {
    expect(
      validateCalculations({
        total: 100,
        items: [{ amount: 50 }, { amount: 50 }],
      }),
    ).toBe(true);
  });

  test("WITH TAX", () => {
    expect(
      validateCalculations({
        total: 110,
        subtotal: 100,
        tax: 10,
      }),
    ).toBe(true);
  });

  test("WITH SHIPPING", () => {
    expect(
      validateCalculations({
        total: 120,
        subtotal: 100,
        shipping: 20,
      }),
    ).toBe(true);
  });

  test("WITH DISCOUNT", () => {
    expect(
      validateCalculations({
        total: 90,
        subtotal: 100,
        discount: 10,
      }),
    ).toBe(true);
  });

  test("ROUNDING EPSILON", () => {
    expect(
      validateCalculations({
        total: 100,
        items: [{ amount: 99.97 }],
      }),
    ).toBe(true);
  });

  test("MISMATCH", () => {
    expect(
      validateCalculations({
        total: 200,
        items: [{ amount: 50 }, { amount: 50 }],
      }),
    ).toBe(false);
  });

  test("MISSING TOTAL", () => {
    expect(
      validateCalculations({
        items: [{ amount: 100 }],
      } as any),
    ).toBe(true);
  });

  test("INVALID TOTAL", () => {
    expect(validateCalculations({ total: "abc" } as any)).toBe(false);
  });

  test("SUBTOTAL ONLY", () => {
    expect(
      validateCalculations({
        total: 100,
        subtotal: 100,
      }),
    ).toBe(true);
  });

  test("MIXED ITEM FIELDS", () => {
    expect(
      validateCalculations({
        total: 100,
        items: [{ total: 40 }, { amount: 30 }, { line_total: 30 }],
      }),
    ).toBe(true);
  });
});

describe("fallback logic", () => {
  test("EMPTY → fallback", () => {
    const data = {} as any;
    expect(isExtractionEmpty(data)).toBe(true);
  });

  test("MISMATCH → fallback", () => {
    const data = { total: 200, items: [{ amount: 50 }] } as any;
    expect(validateCalculations(data)).toBe(false);
  });

  test("VALID → no fallback", () => {
    const data = { total: 100, items: [{ amount: 100 }] } as any;
    expect(isExtractionEmpty(data)).toBe(false);
    expect(validateCalculations(data)).toBe(true);
  });
});

describe("log validation", () => {
  test("logs missing total", () => {
    validateCalculations({ items: [{ amount: 10 }] } as any);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

test("100 items stress test", () => {
  const items = Array.from({ length: 100 }, () => ({ amount: 10 }));
  expect(validateCalculations({ total: 1000, items })).toBe(true);
});
