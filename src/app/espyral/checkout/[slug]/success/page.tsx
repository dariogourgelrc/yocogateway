import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/db/products';
import { getOrderById } from '@/lib/db/orders';
import { EspyralSuccessContent } from '@/components/espyral/espyral-success-content';

export const dynamic = 'force-dynamic';

export default async function EspyralSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order_id?: string; lang?: string }>;
}) {
  const { slug } = await params;
  const { order_id, lang } = await searchParams;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  let buyerEmail: string | undefined;
  if (order_id) {
    try {
      const order = await getOrderById(order_id);
      if (order) buyerEmail = order.buyer_email;
    } catch {
      // ignore
    }
  }

  return <EspyralSuccessContent productName={product.name} buyerEmail={buyerEmail} language={lang === 'pt' || lang === 'es' ? lang : lang === 'en' ? 'en' : product.checkout_language} />;
}
