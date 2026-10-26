"use client";
import { getCheckoutCopy, type CheckoutLanguage } from "@/lib/i18n/checkout-copy";

export interface ShippingInfo {
  address_line: string;
  city: string;
  postal_code: string;
  country: string;
}

interface ShippingFormProps {
  value: ShippingInfo;
  onChange: (value: ShippingInfo) => void;
  language?: CheckoutLanguage;
}

export function ShippingForm({ value, onChange, language = "en" }: ShippingFormProps) {
  const copy = getCheckoutCopy(language);
  const set = (field: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-900">{copy.shippingAddress}</p>

      <input
        type="text"
        placeholder={copy.addressLine}
        value={value.address_line}
        onChange={set("address_line")}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder={copy.city}
          value={value.city}
          onChange={set("city")}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <input
          type="text"
          placeholder={copy.postalCode}
          value={value.postal_code}
          onChange={set("postal_code")}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <input
        type="text"
        placeholder={copy.country}
        value={value.country}
        onChange={set("country")}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
      />
    </div>
  );
}
