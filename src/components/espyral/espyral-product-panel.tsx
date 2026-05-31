import type { OrderBump } from '@/lib/supabase/types';
import { EspyralOrderBumpCard } from './espyral-order-bump-card';

interface Props {
  product: {
    name: string;
    description: string;
    image_url: string;
    price: number;
    currency: string;
    order_bumps: OrderBump[];
  };
  selectedBumps: Set<string>;
  total: number;
  formValid: boolean;
  onToggleBump: (id: string) => void;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function EspyralProductPanel({ product, selectedBumps, total, formValid, onToggleBump }: Props) {
  return (
    <div className="space-y-6">
      {/* Product image */}
      {product.image_url && (
        <div className="bg-[hsl(var(--cream))] aspect-[3/4] overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Product info */}
      <div className="space-y-2">
        <h1 className="font-serif text-2xl text-foreground leading-tight">{product.name}</h1>
        {product.description && (
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground">Product</span>
        <span className="font-sans text-sm text-foreground">{formatPrice(product.price, product.currency)}</span>
      </div>

      {/* Order bumps — shown after form is valid */}
      {product.order_bumps.length > 0 && formValid && (
        <div className="space-y-3">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-foreground">Add to your order</p>
          {product.order_bumps.map((bump) => (
            <EspyralOrderBumpCard
              key={bump.id}
              bump={bump}
              currency={product.currency}
              checked={selectedBumps.has(bump.id)}
              onToggle={onToggleBump}
            />
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between border-t border-foreground pt-4">
        <span className="font-serif text-base text-foreground">Total</span>
        <span className="font-serif text-lg text-foreground">{formatPrice(total, product.currency)}</span>
      </div>
    </div>
  );
}
