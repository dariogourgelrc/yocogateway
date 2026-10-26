const CURRENCY_SYMBOLS: Record<string, string> = {
  NAD: "N$",
  ZAR: "R",
};

export function formatCurrency(amountCents: number, currency: string, language: "en" | "pt" = "en"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const amount = new Intl.NumberFormat(language === "pt" ? "pt-PT" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
  return `${symbol} ${amount}`;
}
