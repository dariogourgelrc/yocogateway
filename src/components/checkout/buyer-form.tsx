import { Input } from "@/components/ui/input";

export interface BuyerInfo {
  name: string;
  email: string;
  phone: string;
}

interface BuyerFormProps {
  value: BuyerInfo;
  onChange: (info: BuyerInfo) => void;
  errors?: Partial<Record<keyof BuyerInfo, string>>;
}

export function BuyerForm({ value, onChange, errors }: BuyerFormProps) {
  const update = (field: keyof BuyerInfo, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Your details</h2>
      <Input
        label="Full name"
        value={value.name}
        onChange={(e) => update("name", e.target.value)}
        placeholder="John Doe"
        error={errors?.name}
        required
      />
      <Input
        label="Email"
        type="email"
        value={value.email}
        onChange={(e) => update("email", e.target.value)}
        placeholder="john@example.com"
        error={errors?.email}
        required
      />
      <Input
        label="Phone"
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
