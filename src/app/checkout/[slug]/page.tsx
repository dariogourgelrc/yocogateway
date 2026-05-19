import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getProductBySlug } from "@/lib/db/products";
import { getOrderById } from "@/lib/db/orders";
import { CheckoutPage } from "@/components/checkout/checkout-page";
import type { Metadata } from "next";

const COUNTRY_CURRENCY: Record<string, string> = {
  NA: "NAD", // Namibia
  ZA: "ZAR", // South Africa
  BW: "BWP", // Botswana
};

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
  searchParams: Promise<{
    recover?: string;
    prefill_name?: string;
    prefill_email?: string;
    prefill_phone?: string;
    prefill_address?: string;
    prefill_city?: string;
    prefill_postal?: string;
    prefill_country?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    recover,
    prefill_name, prefill_email, prefill_phone,
    prefill_address, prefill_city, prefill_postal, prefill_country,
  } = await searchParams;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  // Detect country from Vercel header for initial currency selection
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "";
  const detectedCurrency = COUNTRY_CURRENCY[countryCode] || null;

  // Strip sensitive config (API tokens) from trackers before sending to client
  product.product_trackers = product.product_trackers.map(
    ({ config, ...rest }) => ({ ...rest, config: null })
  );

  // Pre-fill buyer data from abandoned order, upsell redirect, or external project
  let recoverData:
    | {
        name: string;
        email: string;
        phone: string;
        address?: { address_line: string; city: string; postal_code: string; country: string };
      }
    | undefined;

  if (prefill_name && prefill_email && prefill_phone) {
    recoverData = {
      name: prefill_name,
      email: prefill_email,
      phone: prefill_phone,
      ...(prefill_address && prefill_city
        ? {
            address: {
              address_line: prefill_address,
              city: prefill_city,
              postal_code: prefill_postal || "",
              country: prefill_country || "South Africa",
            },
          }
        : {}),
    };
  } else if (recover) {
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
      detectedCurrency={detectedCurrency}
      offerId={product.activeOffer?.id}
      recoverData={recoverData}
    />
  );
}
