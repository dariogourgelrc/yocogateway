import { formatCurrency } from "@/lib/utils/currency";
import type { OrderBump } from "@/lib/supabase/types";

interface OrderBumpCardProps {
  bump: OrderBump;
  currency: string;
  checked: boolean;
  onToggle: (bumpId: string) => void;
}

export function OrderBumpCard({
  bump,
  currency,
  checked,
  onToggle,
}: OrderBumpCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
        checked
          ? "border-black bg-gray-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(bump.id)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
      />
      <div className="flex flex-1 gap-3">
        {bump.image_url && (
          <img
            src={bump.image_url}
            alt={bump.name}
            className="h-16 w-16 rounded object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900">{bump.name}</p>
            <p className="font-semibold text-gray-900 flex-shrink-0">
              + {formatCurrency(bump.price, currency)}
            </p>
          </div>
          {bump.description && (
            <p className="mt-1 text-sm text-gray-500">{bump.description}</p>
          )}
        </div>
      </div>
    </label>
  );
}
