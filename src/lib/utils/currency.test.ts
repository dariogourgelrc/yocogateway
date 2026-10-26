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

  it("formats USD with the dollar symbol", () => {
    expect(formatCurrency(500, "USD")).toBe("$ 5.00");
  });

  it("formats Spanish decimal separators", () => {
    expect(formatCurrency(500, "USD", "es")).toBe("$ 5,00");
  });
});
