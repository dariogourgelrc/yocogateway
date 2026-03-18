import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/db/orders";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";
import { sendConfirmationEmail } from "@/lib/notifications/email";
import { sendWhatsAppConfirmation } from "@/lib/notifications/whatsapp";

/**
 * Yoco always redirects here after successful payment.
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
      ]).catch((err) =>
        console.error("payment-callback: notification failed:", err)
      );
    }
  } catch (err) {
    console.error("payment-callback: error processing order:", err);
    // Don't block the redirect — webhook will handle as backup
  }

  // Always redirect, even if processing failed
  return NextResponse.redirect(redirectTo);
}
