import { NextRequest, NextResponse } from "next/server";
import { constructWhopEvent } from "@/lib/whop/verify-webhook";
import { getUserSettings } from "@/lib/db/user-settings";
import { getOrderByPaymentId, updateOrderStatus } from "@/lib/db/orders";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { fireServerTrackers } from "@/lib/trackers/server-registry";

interface WhopPayment {
  id: string;
  checkout_configuration_id?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const settings = await getUserSettings(userId);
    if (!settings?.whop_webhook_secret) {
      console.error(`Whop webhook: no settings for user ${userId}`);
      return NextResponse.json({ error: "Not configured" }, { status: 400 });
    }

    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers);

    const event = constructWhopEvent(rawBody, headers, settings.whop_webhook_secret);
    if (!event) {
      console.error(`Whop webhook: invalid signature for user ${userId}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.type !== "payment.succeeded") {
      return NextResponse.json({ received: true });
    }

    const payment = event.data as unknown as WhopPayment;
    const order = await getOrderByPaymentId(payment.checkout_configuration_id || payment.id);

    if (!order) {
      console.error(`Whop webhook: order not found for checkout ${payment.checkout_configuration_id}`);
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
    console.error("Whop webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
