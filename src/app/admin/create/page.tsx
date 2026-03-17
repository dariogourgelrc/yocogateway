import { ProductForm } from "@/components/admin/product-form";

export default function CreateProductPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Create Product</h1>
      <ProductForm mode="create" />
    </main>
  );
}
