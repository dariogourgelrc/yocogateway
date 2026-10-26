'use client';
import { getCheckoutCopy, type CheckoutLanguage } from '@/lib/i18n/checkout-copy';

export interface EspyralBuyerInfo {
  name: string;
  email: string;
  phone: string;
}

interface EspyralBuyerFormProps {
  value: EspyralBuyerInfo;
  onChange: (v: EspyralBuyerInfo) => void;
  language: CheckoutLanguage;
}

export function EspyralBuyerForm({ value, onChange, language }: EspyralBuyerFormProps) {
  const copy = getCheckoutCopy(language);
  const set = (field: keyof EspyralBuyerInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value });

  const inputClass =
    'w-full border border-border bg-transparent px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors';

  return (
    <div className="space-y-4">
      <h2 className="font-sans text-xs tracking-[0.2em] uppercase text-foreground mb-5">{copy.details}</h2>
      <input
        type="text"
        placeholder={copy.fullName}
        value={value.name}
        onChange={set('name')}
        autoComplete="name"
        className={inputClass}
        required
      />
      <input
        type="email"
        placeholder={copy.email}
        value={value.email}
        onChange={set('email')}
        autoComplete="email"
        className={inputClass}
        required
      />
      <input
        type="tel"
        placeholder={copy.phone}
        value={value.phone}
        onChange={set('phone')}
        autoComplete="tel"
        className={inputClass}
        required
      />
    </div>
  );
}
