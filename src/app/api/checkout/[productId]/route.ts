import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/db/products";
import { getOfferById } from "@/lib/db/product-offers";
import { getOrderBumps } from "@/lib/db/order-bumps";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { createOrder } from "@/lib/db/orders";
import { createOrderItems } from "@/lib/db/order-items";
import { getUserSettings } from "@/lib/db/user-settings";
import { createStripeSession } from "@/lib/stripe/create-session";
import { fireServerTrackers } from "@/lib/trackers/server-registry";
import { createServerClient } from "@/lib/supabase/server";
import type {
  CreateOrderRequest,
  OrderItemInsert,
  TrackingParams,
} from "@/lib/supabase/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body: CreateOrderRequest = await request.json();

    // Sanitize inputs
    const buyerName = (body.buyer_name || "").trim();
    const buyerEmail = (body.buyer_email || "").trim().toLowerCase();
    const buyerPhone = (body.buyer_phone || "").trim();

    if (!buyerName || !buyerEmail || !buyerPhone) {
      return NextResponse.json(
        { error: "Missing required fields: buyer_name, buyer_email, buyer_phone" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Fetch product
    const product = await getProductById(productId);
    const allBumps = await getOrderBumps(productId);
    const trackers = await getProductTrackers(productId);

    // Resolve the product owner's Stripe key
    if (!product.user_id) {
      return NextResponse.json(
        { error: "Product has no owner configured" },
        { status: 500 }
      );
    }

    const userSettings = await getUserSettings(product.user_id);
    if (!userSettings?.stripe_secret_key) {
      return NextResponse.json(
        { error: "Payment not configured for this product" },
        { status: 500 }
      );
    }

    // For physical products, require shipping address
    if (product.type === "physical") {
      const addr = body.shipping_address;
      if (!addr?.address_line || !addr?.city || !addr?.postal_code || !addr?.country) {
        return NextResponse.json(
          { error: "Shipping address is required for physical products" },
          { status: 400 }
        );
      }
    }

    // Resolve currency and price (regional pricing support)
    let activeCurrency = product.currency;
    let basePrice = product.price;
    if (
      body.currency &&
      body.currency !== product.currency &&
      product.regional_pricing?.[body.currency]
    ) {
      activeCurrency = body.currency;
      basePrice = product.regional_pricing[body.currency];
    }

    // If an offer is specified, use its price (overrides regional)
    if (body.offer_id) {
      const offer = await getOfferById(body.offer_id);
      if (offer && offer.product_id === productId) {
        basePrice = offer.price;
      }
    }

    // Filter to only selected bumps
    const selectedBumpIds = new Set(body.selected_bump_ids || []);
    const selectedBumps = allBumps.filter((b) => selectedBumpIds.has(b.id));

    // Calculate total
    const total =
      basePrice + selectedBumps.reduce((sum, bump) => sum + bump.price, 0);

    const trackingParams: TrackingParams & { event_id?: string } = {
      ...(body.tracking_params || {
        src: null,
        sck: null,
        utm_source: null,
        utm_campaign: null,
        utm_medium: null,
        utm_content: null,
        utm_term: null,
      }),
    };

    // Create order
    const order = await createOrder({
      product_id: productId,
      yoco_payment_id: null,
      status: "pending",
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      total_amount: total,
      currency: activeCurrency,
      tracking_params: trackingParams,
      shipping_address: body.shipping_address || null,
    });

    // Create order items (snapshots)
    const items: OrderItemInsert[] = [
      {
        order_id: order.id,
        type: "product",
        reference_id: product.id,
        name: product.name,
        price: basePrice,
      },
      ...selectedBumps.map((bump) => ({
        order_id: order.id,
        type: "order_bump" as const,
        reference_id: bump.id,
        name: bump.name,
        price: bump.price,
      })),
    ];
    const orderItems = await createOrderItems(items);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentDisplayName =
      process.env.NEXT_PUBLIC_PAYMENT_DISPLAY_NAME || "QuoraTech";

    const lineItems = [
      {
        displayName: paymentDisplayName,
        quantity: 1,
        pricingDetails: { price: basePrice },
      },
      ...selectedBumps.map((bump) => ({
        displayName: bump.name,
        quantity: 1,
        pricingDetails: { price: bump.price },
      })),
    ];

    const finalDestination =
      product.upsell_url ||
      `${appUrl}/checkout/${product.slug}/success?order_id=${order.id}`;

    const returnUrl = `${appUrl}/api/payment-callback?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}&redirect_to=${encodeURIComponent(finalDestination)}`;

    // Create Stripe session with the product owner's key
    const stripeSession = await createStripeSession({
      stripeSecretKey: userSettings.stripe_secret_key,
      amountInCents: total,
      currency: activeCurrency,
      returnUrl,
      customerEmail: buyerEmail,
      lineItems,
      metadata: { orderId: order.id },
    });

    // Update order with payment session id
    const supabase = createServerClient();
    await supabase
      .from("orders")
      .update({ yoco_payment_id: stripeSession.id })
      .eq("id", order.id);

    // Fire server trackers
    const orderWithItems = {
      ...order,
      yoco_payment_id: stripeSession.id,
      order_items: orderItems,
    };

    await fireServerTrackers("orderCreated", orderWithItems, trackers).catch(
      (err) => console.error("Server tracker onOrderCreated failed:", err)
    );

    return NextResponse.json({
      order_id: order.id,
      client_secret: stripeSession.clientSecret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
