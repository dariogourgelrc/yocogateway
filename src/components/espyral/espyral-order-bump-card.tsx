'use client';
import type { OrderBump } from '@/lib/supabase/types';

interface Props {
  bump: OrderBump;
  currency: string;
  checked: boolean;
  onToggle: (id: string) => void;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function EspyralOrderBumpCard({ bump, currency, checked, onToggle }: Props) {
  return (
    <label className={`flex gap-4 p-4 border cursor-pointer transition-colors ${checked ? 'border-foreground bg-cream/30' : 'border-border hover:border-foreground/40'}`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={() => onToggle(bump.id)}
      />
      {/* Custom checkbox */}
      <div className={`flex-shrink-0 w-5 h-5 border mt-0.5 flex items-center justify-center transition-colors ${checked ? 'bg-foreground border-foreground' : 'border-border'}`}>
        {checked && (
          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-sm text-foreground">{bump.name}</p>
          <span className="font-sans text-sm text-foreground flex-shrink-0">{formatPrice(bump.price, currency)}</span>
        </div>
        {bump.description && (
          <p className="font-sans text-xs text-muted-foreground mt-1 leading-relaxed">{bump.description}</p>
        )}
      </div>
    </label>
  );
}
