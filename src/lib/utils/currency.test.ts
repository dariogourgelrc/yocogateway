import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats NAD currency correctly", () => {
    expect(formatCurrency(100, "NAD")).toBe("N$ 1.00");
  });

  it("formats ZAR currency correctly", () => {
    expect(formatCurrency(100, "ZAR")).toBe("R 1.00");
  });

  it("formats zero amount", () => {
    expect(formatCurrency(0, "NAD")).toBe("N$ 0.00");
  });

  it("formats large amounts", () => {
    expect(formatCurrency(9999, "ZAR")).toBe("R 99.99");
  });

  it("falls back to currency code for unknown currencies", () => {
    expect(formatCurrency(500, "USD")).toBe("USD 5.00");
  });
});
