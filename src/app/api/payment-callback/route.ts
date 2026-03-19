import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/db/orders";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";
import { sendConfirmationEmail } from "@/lib/notifications/email";
import { sendWhatsAppConfirmation } from "@/lib/notifications/whatsapp";
import { sendSaleNotification } from "@/lib/notifications/sale-alert";

/**
 * Stripe always redirects here after successful payment.
 * This route handles: mark paid → UTMify → email → WhatsApp → redirect.
 * Then redirects to upsell or success page.
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

  try {
    const order = await getOrderById(orderId);

    if (order && order.status === "pending") {
      await updateOrderStatus(order.id, "paid");

      const product = await getProductById(order.product_id);
      const trackers = await getProductTrackers(order.product_id);

      // Fire server trackers (UTMify orderPaid)
      await fireServerTrackers("orderPaid", order, trackers).catch((err) =>
        console.error("payment-callback: server tracker failed:", err)
      );

      // Send notifications
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
    // Don't block the redirect — webhook will handle as backup
  }

  // Append buyer data + UTMs to upsell URLs so the next checkout auto-fills
  let finalUrl = redirectTo;
  try {
    const order = orderId ? await getOrderById(orderId) : null;
    if (order) {
      const url = new URL(redirectTo);
      url.searchParams.set("prefill_name", order.buyer_name);
      url.searchParams.set("prefill_email", order.buyer_email);
      url.searchParams.set("prefill_phone", order.buyer_phone);

      // Carry UTMs forward so upsell orders track the same campaign
      const tp = order.tracking_params as unknown as Record<string, string | null>;
      const utmKeys = ["src", "sck", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"];
      for (const key of utmKeys) {
        if (tp[key]) {
          url.searchParams.set(key, tp[key]);
        }
      }

      finalUrl = url.toString();
    }
  } catch {
    // ignore — just redirect without prefill
  }

  // Always redirect, even if processing failed
  return NextResponse.redirect(finalUrl);
}
