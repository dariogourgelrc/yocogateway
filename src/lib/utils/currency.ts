const CURRENCY_SYMBOLS: Record<string, string> = {
  NAD: "N$",
  ZAR: "R",
  USD: "$",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatCurrency(amountCents: number, currency: string, language: "en" | "pt" | "es" = "en"): string {
  const symbol = getCurrencySymbol(currency);
  const locale = language === "pt" ? "pt-PT" : language === "es" ? "es-ES" : "en-US";
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
  return `${symbol} ${amount}`;
}
