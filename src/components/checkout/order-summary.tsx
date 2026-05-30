import type { Product, OrderBump } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/currency";

interface OrderSummaryProps {
  product: Product;
  selectedBumps: OrderBump[];
  total: number;
}

export function OrderSummary({ product, selectedBumps, total }: OrderSummaryProps) {
  const isPhysical = product.type === "physical";

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-8 h-8 rounded object-cover"
          />
          <span className="flex-1 text-gray-700">{product.name}</span>
          {isPhysical && (
            <span className="font-medium text-gray-900">
              {formatCurrency(product.price, product.currency)}
            </span>
          )}
        </div>
        {selectedBumps.map((bump) => (
          <div key={bump.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 text-gray-700">+ {bump.name}</span>
            {isPhysical && (
              <span className="font-medium text-gray-900">
                {formatCurrency(bump.price, product.currency)}
              </span>
            )}
          </div>
        ))}
      </div>
      {isPhysical && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-base font-bold text-gray-900">
            {formatCurrency(total, product.currency)}
          </span>
        </div>
      )}
    </div>
  );
}
