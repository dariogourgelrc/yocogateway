"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";

export interface OrderBumpData {
  id?: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  sort_order: number;
}

interface OrderBumpFormProps {
  index: number;
  data: OrderBumpData;
  onChange: (index: number, data: OrderBumpData) => void;
  onRemove: (index: number) => void;
}

export function OrderBumpForm({
  index,
  data,
  onChange,
  onRemove,
}: OrderBumpFormProps) {
  const update = (field: keyof OrderBumpData, value: string | number) => {
    onChange(index, { ...data, [field]: value });
  };

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Order Bump #{index + 1}
        </h4>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onRemove(index)}
        >
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Premium Support"
        />
        <Input
          label="Price"
          type="number"
          min={0}
          step="0.01"
          value={data.price}
          onChange={(e) => update("price", e.target.value)}
          placeholder="49.99"
        />
      </div>

      <Textarea
        label="Description"
        value={data.description}
        onChange={(e) => update("description", e.target.value)}
        placeholder="What the buyer gets with this bump"
      />

      <ImageUpload
        label="Image"
        value={data.image_url}
        onChange={(url) => update("image_url", url)}
      />
    </div>
  );
}
