const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

/** Parse a major-unit URL amount (for example, amount=25.50) into cents. */
export function parseCheckoutAmount(value: string | null | undefined): number | null {
  if (!value || !AMOUNT_PATTERN.test(value)) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;

  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents >= 200 ? cents : null;
}
