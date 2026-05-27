"use client";

export interface ShippingInfo {
  address_line: string;
  city: string;
  postal_code: string;
  country: string;
}

interface ShippingFormProps {
  value: ShippingInfo;
  onChange: (value: ShippingInfo) => void;
}

export function ShippingForm({ value, onChange }: ShippingFormProps) {
  const set = (field: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-900">Shipping address</p>

      <input
        type="text"
        placeholder="Address (street and number)"
        value={value.address_line}
        onChange={set("address_line")}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="City"
          value={value.city}
          onChange={set("city")}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <input
          type="text"
          placeholder="ZIP / Postal code"
          value={value.postal_code}
          onChange={set("postal_code")}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <input
        type="text"
        placeholder="Country"
        value={value.country}
        onChange={set("country")}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
      />
    </div>
  );
}
