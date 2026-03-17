import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/db/products";
import { getOrderById } from "@/lib/db/orders";
import { CheckoutPage } from "@/components/checkout/checkout-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: `${product.name} — Checkout`,
      description: product.description,
    };
  } catch {
    return { title: "Checkout" };
  }
}

export default async function CheckoutPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ recover?: string }>;
}) {
  const { slug } = await params;
  const { recover } = await searchParams;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  // Strip sensitive config (API tokens) from trackers before sending to client
  product.product_trackers = product.product_trackers.map(
    ({ config, ...rest }) => ({ ...rest, config: null })
  );

  // Pre-fill buyer data from abandoned order
  let recoverData: { name: string; email: string; phone: string } | undefined;
  if (recover) {
    try {
      const order = await getOrderById(recover);
      if (order && order.status === "pending") {
        recoverData = {
          name: order.buyer_name,
          email: order.buyer_email,
          phone: order.buyer_phone,
        };
      }
    } catch {
      // ignore — just don't pre-fill
    }
  }

  return (
    <CheckoutPage
      product={product}
      offerId={product.activeOffer?.id}
      recoverData={recoverData}
    />
  );
}
