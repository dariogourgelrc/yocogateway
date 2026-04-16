import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserSettings } from "@/lib/db/user-settings";
import { getOrderByPaymentId, updateOrderStatus } from "@/lib/db/orders";
import { getProductById } from "@/lib/db/products";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Look up this user's webhook secret
    const settings = await getUserSettings(userId);
    if (!settings?.stripe_webhook_secret || !settings?.stripe_secret_key) {
      console.error(`Stripe webhook: no settings for user ${userId}`);
      return NextResponse.json({ error: "Not configured" }, { status: 400 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify signature with the user's webhook secret
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(settings.stripe_secret_key, {
        apiVersion: "2026-02-25.clover",
      });
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        settings.stripe_webhook_secret
      );
    } catch {
      console.error(`Stripe webhook: invalid signature for user ${userId}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as { id: string };
    const order = await getOrderByPaymentId(session.id);

    if (!order) {
      console.error(`Stripe webhook: order not found for session ${session.id}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid") {
      await updateOrderStatus(order.id, "paid");
    }

    const product = await getProductById(order.product_id);
    const trackers = await getProductTrackers(order.product_id);

    await fireServerTrackers("orderPaid", order, trackers).catch((err) =>
      console.error("Server tracker onOrderPaid failed:", err)
    );

    return NextResponse.json({ received: true, order_id: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
