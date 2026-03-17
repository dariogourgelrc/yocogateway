import { formatCurrency } from "@/lib/utils/currency";

interface CurrencyDisplayProps {
  amountCents: number;
  currency: string;
  className?: string;
}

export function CurrencyDisplay({
  amountCents,
  currency,
  className = "",
}: CurrencyDisplayProps) {
  return <span className={className}>{formatCurrency(amountCents, currency)}</span>;
}
