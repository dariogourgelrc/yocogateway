import type { Product, OrderBump } from "@/lib/supabase/types";

interface OrderSummaryProps {
  product: Product;
  selectedBumps: OrderBump[];
  total: number;
}

export function OrderSummary({
  product,
  selectedBumps,
}: OrderSummaryProps) {
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
          <span className="text-gray-700">{product.name}</span>
        </div>
        {selectedBumps.map((bump) => (
          <div key={bump.id} className="flex items-center gap-2 text-sm">
            <span className="text-gray-700">+ {bump.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
