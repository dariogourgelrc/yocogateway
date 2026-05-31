import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/db/products';
import { EspyralCheckoutPage } from '@/components/espyral/espyral-checkout-page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Build title from slug without a DB call — avoids duplicate Supabase round-trip
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    title: `${name} — Espyral Couture`,
    description: 'Secure checkout — Espyral Couture luxury menswear.',
  };
}

export default async function EspyralCheckoutRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ prefill_name?: string; prefill_email?: string; prefill_phone?: string }>;
}) {
  const { slug } = await params;
  const { prefill_name, prefill_email, prefill_phone } = await searchParams;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  // Strip tracker config before sending to client
  product.product_trackers = product.product_trackers.map(({ config: _config, ...rest }) => ({ ...rest, config: null }));

  const prefillData = prefill_name && prefill_email && prefill_phone
    ? { name: prefill_name, email: prefill_email, phone: prefill_phone }
    : undefined;

  return (
    // Suspense required for useSearchParams() inside EspyralCheckoutPage
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EspyralCheckoutPage
        product={product}
        offerId={product.activeOffer?.id}
        prefillData={prefillData}
      />
    </Suspense>
  );
}
