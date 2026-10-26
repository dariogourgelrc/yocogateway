import { Input } from "@/components/ui/input";
import { getCheckoutCopy, type CheckoutLanguage } from "@/lib/i18n/checkout-copy";

export interface BuyerInfo {
  name: string;
  email: string;
  phone: string;
}

interface BuyerFormProps {
  value: BuyerInfo;
  onChange: (info: BuyerInfo) => void;
  errors?: Partial<Record<keyof BuyerInfo, string>>;
  language?: CheckoutLanguage;
}

export function BuyerForm({ value, onChange, errors, language = "en" }: BuyerFormProps) {
  const copy = getCheckoutCopy(language);
  const update = (field: keyof BuyerInfo, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{copy.details}</h2>
      <Input
        label={copy.fullName}
        value={value.name}
        onChange={(e) => update("name", e.target.value)}
        placeholder="John Doe"
        error={errors?.name}
        required
      />
      <Input
        label={copy.email}
        type="email"
        value={value.email}
        onChange={(e) => update("email", e.target.value)}
        placeholder="john@example.com"
        error={errors?.email}
        required
      />
      <Input
        label={copy.phone}
        type="tel"
        value={value.phone}
        onChange={(e) => update("phone", e.target.value)}
        placeholder="+264 81 123 4567"
        error={errors?.phone}
        required
      />
    </div>
  );
}
