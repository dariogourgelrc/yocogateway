import { NextRequest, NextResponse } from "next/server";
import { verifyYocoWebhook } from "@/lib/yoco/verify-webhook";
import { getOrderByPaymentId, updateOrderStatus } from "@/lib/db/orders";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";
import { sendConfirmationEmail } from "@/lib/notifications/email";
import { sendWhatsAppConfirmation } from "@/lib/notifications/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("webhook-signature");

    // Verify webhook signature
    if (!verifyYocoWebhook(rawBody, signature)) {
      console.error("Yoco webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Only handle successful payments
    if (event.type !== "payment.succeeded") {
      return NextResponse.json({ received: true });
    }

    const paymentId = event.payload?.checkoutId || event.id;

    // Find the order
    const order = await getOrderByPaymentId(paymentId);
    if (!order) {
      console.error(`Yoco webhook: order not found for payment ${paymentId}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status (idempotent — may already be "paid" from success page)
    if (order.status !== "paid") {
      await updateOrderStatus(order.id, "paid");
    }

    // Fetch product and trackers for notifications + server tracking
    const product = await getProductById(order.product_id);
    const trackers = await getProductTrackers(order.product_id);

    console.log(
      `Webhook: firing orderPaid for order ${order.id}, ` +
      `trackers: ${trackers.length} total, ` +
      `server: ${trackers.filter((t) => t.side === "server").map((t) => t.type).join(",") || "none"}, ` +
      `order_items: ${order.order_items?.length ?? 0}`
    );

    // Always fire server-side trackers (UTMify orderPaid) — even if success page
    // already marked as paid, because success page doesn't fire server trackers
    await fireServerTrackers("orderPaid", order, trackers).catch((err) =>
      console.error("Server tracker onOrderPaid failed:", err)
    );

    // Send notifications only if not already sent (first time marking paid)
    if (order.status !== "paid") {
      await Promise.allSettled([
        sendConfirmationEmail(order, product),
        sendWhatsAppConfirmation(order, product),
      ]).catch((err) => console.error("Notification error:", err));
    }

    return NextResponse.json({ received: true, order_id: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
