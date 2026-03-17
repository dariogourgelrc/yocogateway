import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/lib/db/products";
import { getOffersByProductId } from "@/lib/db/product-offers";
import { OffersForm } from "@/components/admin/offers-form";

export const dynamic = "force-dynamic";

export default async function OffersPage({
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
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to products
        </Link>
        <h1 className="text-2xl font-bold mt-2">Offers</h1>
        <p className="text-gray-500 text-sm mt-1">{product.name}</p>
      </div>
      <OffersForm
        productId={productId}
        productName={product.name}
        currency={product.currency}
        existingOffers={offers}
      />
    </main>
  );
}
