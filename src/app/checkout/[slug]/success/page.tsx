import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/db/products";
import { getOrderById } from "@/lib/db/orders";
import { SuccessContent } from "@/components/checkout/success-content";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { slug } = await params;
  const { order_id } = await searchParams;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  // Fetch order for pixel purchase event + email
  let orderData: {
    orderId: string;
    totalAmount: number;
    currency: string;
    eventId: string | null;
  } | null = null;

  if (order_id) {
    try {
      const order = await getOrderById(order_id);
      if (order) {
        const trackingParams = order.tracking_params as unknown as Record<string, unknown>;
        orderData = {
          orderId: order.id,
          totalAmount: order.total_amount,
          currency: order.currency,
          eventId: (trackingParams?.event_id as string) || null,
        };

        // Order processing (paid, UTMify, email, WhatsApp) is handled
        // by /api/payment-callback before redirecting here
      }
    } catch (err) {
      console.error("Success page order processing error:", err);
    }
  }

  // Get client-side Facebook pixel IDs
  const pixelIds = product.product_trackers
    .filter((t) => t.type === "facebook" && t.side === "client")
    .map((t) => t.tracker_id);

  return (
    <SuccessContent
      productName={product.name}
      pixelIds={pixelIds}
      orderData={orderData}
    />
  );
}
