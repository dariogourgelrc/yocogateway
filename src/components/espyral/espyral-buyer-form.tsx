'use client';

export interface EspyralBuyerInfo {
  name: string;
  email: string;
  phone: string;
}

interface EspyralBuyerFormProps {
  value: EspyralBuyerInfo;
  onChange: (v: EspyralBuyerInfo) => void;
}

export function EspyralBuyerForm({ value, onChange }: EspyralBuyerFormProps) {
  const set = (field: keyof EspyralBuyerInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value });

  const inputClass =
    'w-full border border-border bg-transparent px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors';

  return (
    <div className="space-y-4">
      <h2 className="font-sans text-xs tracking-[0.2em] uppercase text-foreground mb-5">Your Details</h2>
      <input
        type="text"
        placeholder="Full Name"
        value={value.name}
        onChange={set('name')}
        autoComplete="name"
        className={inputClass}
        required
      />
      <input
        type="email"
        placeholder="Email Address"
        value={value.email}
        onChange={set('email')}
        autoComplete="email"
        className={inputClass}
        required
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={value.phone}
        onChange={set('phone')}
        autoComplete="tel"
        className={inputClass}
        required
      />
    </div>
  );
}
