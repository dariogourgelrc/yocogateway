import { notFound } from "next/navigation";
import { getProductById } from "@/lib/db/products";
import { getOffersByProductId } from "@/lib/db/product-offers";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  let product;
  try {
    product = await getProductById(productId);
  } catch {
    notFound();
  }

  const offers = await getOffersByProductId(productId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Edit Product</h1>
      <ProductForm mode="edit" initialData={product} offers={offers} />
    </main>
  );
}
