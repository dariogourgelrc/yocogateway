import { formatCurrency } from "@/lib/utils/currency";
import type { Product, OrderBump } from "@/lib/supabase/types";

interface OrderSummaryProps {
  product: Product;
  selectedBumps: OrderBump[];
  total: number;
}

export function OrderSummary({
  product,
  selectedBumps,
  total,
}: OrderSummaryProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-8 h-8 rounded object-cover"
            />
            <span className="text-gray-700">Subtotal</span>
          </div>
          <span className="text-gray-900">
            {formatCurrency(product.price, product.currency)}
          </span>
        </div>
        {selectedBumps.map((bump) => (
          <div key={bump.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{bump.name}</span>
            <span className="text-gray-900">
              {formatCurrency(bump.price, product.currency)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 pt-3">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(total, product.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
