import { NextRequest, NextResponse } from "next/server";
import { constructWhopEvent } from "@/lib/whop/verify-webhook";
import { createServerClient } from "@/lib/supabase/server";
import { getOrderByPaymentId, updateOrderStatus } from "@/lib/db/orders";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";

interface WhopPayment {
  id: string;
  checkout_configuration_id?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const supabase = createServerClient();
    const { data: product, error } = await supabase
      .from("products")
      .select("whop_webhook_secret")
      .eq("id", productId)
      .single();

    if (error || !product?.whop_webhook_secret) {
      console.error(`Whop product webhook: no config for product ${productId}`);
      return NextResponse.json({ error: "Not configured" }, { status: 400 });
    }

    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers);

    const event = constructWhopEvent(rawBody, headers, product.whop_webhook_secret);
    if (!event) {
      console.error(`Whop product webhook: invalid signature for product ${productId}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.type !== "payment.succeeded") {
      return NextResponse.json({ received: true });
    }

    const payment = event.data as unknown as WhopPayment;
    const order = await getOrderByPaymentId(payment.checkout_configuration_id || payment.id);

    if (!order) {
      console.error(`Whop product webhook: order not found for checkout ${payment.checkout_configuration_id}`);
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
    console.error("Whop product webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
