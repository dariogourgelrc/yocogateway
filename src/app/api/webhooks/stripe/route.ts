import { NextRequest, NextResponse } from "next/server";
import { constructStripeEvent } from "@/lib/stripe/verify-webhook";
import { getOrderByPaymentId, updateOrderStatus } from "@/lib/db/orders";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";
import { sendConfirmationEmail } from "@/lib/notifications/email";
import { sendWhatsAppConfirmation } from "@/lib/notifications/whatsapp";
import { sendSaleNotification } from "@/lib/notifications/sale-alert";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    const event = constructStripeEvent(rawBody, signature);
    if (!event) {
      console.error("Stripe webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Only handle successful checkout sessions
    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const sessionId = session.id;

    // Find the order
    const order = await getOrderByPaymentId(sessionId);
    if (!order) {
      console.error(`Stripe webhook: order not found for session ${sessionId}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status (idempotent — may already be "paid" from payment-callback)
    if (order.status !== "paid") {
      await updateOrderStatus(order.id, "paid");
    }

    // Fetch product and trackers for notifications + server tracking
    const product = await getProductById(order.product_id);
    const trackers = await getProductTrackers(order.product_id);

    console.log(
      `Stripe webhook: firing orderPaid for order ${order.id}, ` +
      `trackers: ${trackers.length} total, ` +
      `server: ${trackers.filter((t) => t.side === "server").map((t) => t.type).join(",") || "none"}`
    );

    // Always fire server-side trackers (UTMify orderPaid)
    await fireServerTrackers("orderPaid", order, trackers).catch((err) =>
      console.error("Server tracker onOrderPaid failed:", err)
    );

    // Send notifications only if not already sent (first time marking paid)
    if (order.status !== "paid") {
      await Promise.allSettled([
        sendConfirmationEmail(order, product),
        sendWhatsAppConfirmation(order, product),
        sendSaleNotification(order, product),
      ]).catch((err) => console.error("Notification error:", err));
    }

    return NextResponse.json({ received: true, order_id: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
