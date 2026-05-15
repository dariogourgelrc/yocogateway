import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/db/orders";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";
import { sendConfirmationEmail } from "@/lib/notifications/email";
import { sendWhatsAppConfirmation } from "@/lib/notifications/whatsapp";
import { sendSaleNotification } from "@/lib/notifications/sale-alert";
import type { OrderWithItems } from "@/lib/supabase/types";

/**
 * Stripe always redirects here after successful payment.
 * Handles: mark paid → UTMify → email → WhatsApp → pixel Purchase → redirect.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id");
  const redirectTo = request.nextUrl.searchParams.get("redirect_to");

  if (!orderId || !redirectTo) {
    return NextResponse.json(
      { error: "Missing order_id or redirect_to" },
      { status: 400 }
    );
  }

  let processedOrder: OrderWithItems | null = null;
  let fbPixelIds: string[] = [];
  let productName = "";

  try {
    const order = await getOrderById(orderId);

    if (order) {
      processedOrder = order;

      if (order.status !== "paid") {
        await updateOrderStatus(order.id, "paid");
      }

      const [product, trackers] = await Promise.all([
        getProductById(order.product_id),
        getProductTrackers(order.product_id),
      ]);

      productName = product?.name || "";

      // Client-side Facebook pixel IDs — fired via HTML below before redirecting
      fbPixelIds = trackers
        .filter((t) => t.type === "facebook" && t.side === "client")
        .map((t) => t.tracker_id);

      // UTMify fires here (guaranteed — payment-callback always runs after Stripe redirect).
      // Facebook CAPI fires only from the Stripe webhook to avoid FB double-counting.
      const utmifyTrackers = trackers.filter((t) => t.type === "utmify");
      if (utmifyTrackers.length > 0) {
        await fireServerTrackers("orderPaid", order, utmifyTrackers).catch((err) =>
          console.error("payment-callback: UTMify failed:", err)
        );
      }

      await Promise.allSettled([
        sendConfirmationEmail(order, product),
        sendWhatsAppConfirmation(order, product),
        sendSaleNotification(order, product),
      ]).catch((err) =>
        console.error("payment-callback: notification failed:", err)
      );
    }
  } catch (err) {
    console.error("payment-callback: error processing order:", err);
  }

  // Build final URL with buyer prefill + UTM carry-forward
  let finalUrl = redirectTo;
  if (processedOrder) {
    try {
      const url = new URL(redirectTo);
      url.searchParams.set("prefill_name", processedOrder.buyer_name);
      url.searchParams.set("prefill_email", processedOrder.buyer_email);
      url.searchParams.set("prefill_phone", processedOrder.buyer_phone);

      const tp = processedOrder.tracking_params as unknown as Record<string, string | null>;
      for (const key of ["src", "sck", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"]) {
        if (tp[key]) url.searchParams.set(key, tp[key]);
      }

      finalUrl = url.toString();
    } catch {
      // ignore — redirect without prefill
    }
  }

  // Fire browser-side Facebook pixel Purchase before redirecting.
  // This ensures Purchase fires even when redirecting to an upsell URL
  // (which would skip the success page where the pixel would otherwise fire).
  if (fbPixelIds.length > 0 && processedOrder) {
    const tp = processedOrder.tracking_params as unknown as Record<string, unknown>;
    const eventId = (tp?.event_id as string) || processedOrder.id;
    return new NextResponse(
      buildPixelRedirectHtml(
        fbPixelIds,
        processedOrder.total_amount,
        processedOrder.currency,
        eventId,
        productName,
        finalUrl
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return NextResponse.redirect(finalUrl);
}

function buildPixelRedirectHtml(
  pixelIds: string[],
  totalAmountCents: number,
  currency: string,
  eventId: string,
  productName: string,
  redirectUrl: string
): string {
  const inits = pixelIds
    .map((id) => `fbq('init',${JSON.stringify(id)});`)
    .join("");
  const purchasePayload = JSON.stringify({
    value: parseFloat((totalAmountCents / 100).toFixed(2)),
    currency,
    content_name: productName,
    eventID: eventId,
  });
  const safeRedirectUrl = redirectUrl.replace(/"/g, "&quot;");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="1;url=${safeRedirectUrl}">
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
${inits}fbq('track','Purchase',${purchasePayload});
setTimeout(function(){window.location.replace(${JSON.stringify(redirectUrl)});},300);
</script>
</head><body></body></html>`;
}
