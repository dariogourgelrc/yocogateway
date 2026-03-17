import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { IntegrationsForm } from "@/components/admin/integrations-form";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
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

  const trackers = await getProductTrackers(productId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to products
        </Link>
        <h1 className="text-2xl font-bold mt-2">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">{product.name}</p>
      </div>
      <IntegrationsForm productId={productId} existingTrackers={trackers} />
    </main>
  );
}
