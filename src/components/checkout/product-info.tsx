import { formatCurrency } from "@/lib/utils/currency";
import type { Product } from "@/lib/supabase/types";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const showDescription =
    product.description && product.description.trim() !== "" &&
    product.description !== product.name;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-10 w-10 rounded object-cover"
          />
          <h1 className="text-lg font-bold text-gray-900">{product.name}</h1>
        </div>
        {showDescription && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {product.description}
          </p>
        )}
      </div>
      <p className="text-lg font-bold text-gray-900 shrink-0">
        {formatCurrency(product.price, product.currency)}
      </p>
    </div>
  );
}
