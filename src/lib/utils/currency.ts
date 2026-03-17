const CURRENCY_SYMBOLS: Record<string, string> = {
  NAD: "N$",
  ZAR: "R",
};

export function formatCurrency(amountCents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const amount = (amountCents / 100).toFixed(2);
  return `${symbol} ${amount}`;
}
