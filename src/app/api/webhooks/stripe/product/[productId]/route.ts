import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { getOrderByPaymentId, updateOrderStatus } from "@/lib/db/orders";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    // Look up this product's Stripe keys
    const supabase = createServerClient();
    const { data: product, error } = await supabase
      .from("products")
      .select("stripe_secret_key, stripe_webhook_secret")
      .eq("id", productId)
      .single();

    if (error || !product?.stripe_webhook_secret || !product?.stripe_secret_key) {
      console.error(`Stripe product webhook: no config for product ${productId}`);
      return NextResponse.json({ error: "Not configured" }, { status: 400 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(product.stripe_secret_key, {
        apiVersion: "2026-02-25.clover",
      });
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        product.stripe_webhook_secret
      );
    } catch {
      console.error(`Stripe product webhook: invalid signature for product ${productId}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as { id: string };
    const order = await getOrderByPaymentId(session.id);

    if (!order) {
      console.error(`Stripe product webhook: order not found for session ${session.id}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid") {
      await updateOrderStatus(order.id, "paid");
    }

    const trackers = await getProductTrackers(order.product_id);
    await fireServerTrackers("orderPaid", order, trackers).catch((err) =>
      console.error("Server tracker onOrderPaid failed:", err)
    );

    return NextResponse.json({ received: true, order_id: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe product webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
