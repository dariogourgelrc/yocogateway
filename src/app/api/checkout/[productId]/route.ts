import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/db/products";
import { getOfferById } from "@/lib/db/product-offers";
import { getOrderBumps } from "@/lib/db/order-bumps";
import { getProductTrackers } from "@/lib/db/product-trackers";
import { createOrder } from "@/lib/db/orders";
import { createOrderItems } from "@/lib/db/order-items";
import { createYocoSession } from "@/lib/yoco/create-session";
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

    // Validate email format
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

    // If an offer is specified, use its price and back_redirect_url
    let basePrice = product.price;
    let backRedirectUrl = product.back_redirect_url;
    if (body.offer_id) {
      const offer = await getOfferById(body.offer_id);
      if (offer && offer.product_id === productId) {
        basePrice = offer.price;
        if (offer.back_redirect_url) {
          backRedirectUrl = offer.back_redirect_url;
        }
      }
    }

    // Filter to only selected bumps
    const selectedBumpIds = new Set(body.selected_bump_ids || []);
    const selectedBumps = allBumps.filter((b) => selectedBumpIds.has(b.id));

    // Calculate total
    const total =
      basePrice +
      selectedBumps.reduce((sum, bump) => sum + bump.price, 0);

    // Merge tracking params with event_id for CAPI dedup
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
      currency: product.currency,
      tracking_params: trackingParams,
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

    // Build line items for Yoco checkout display
    // Use a generic name for the main product to prevent the merchant name showing up in payment receipts.
    // Can be customized via NEXT_PUBLIC_PAYMENT_DISPLAY_NAME.
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

    // Create Yoco payment session
    const yocoSession = await createYocoSession({
      amountInCents: total,
      currency: "ZAR", // Yoco only supports ZAR; NAD is pegged 1:1
      successUrl: product.upsell_url || `${appUrl}/checkout/${product.slug}/success?order_id=${order.id}`,
      cancelUrl: backRedirectUrl || `${appUrl}/checkout/${product.slug}/cancel`,
      failureUrl: `${appUrl}/checkout/${product.slug}/cancel`,
      lineItems,
      metadata: { orderId: order.id },
    });

    // Update order with yoco_payment_id
    const supabase = createServerClient();
    await supabase
      .from("orders")
      .update({ yoco_payment_id: yocoSession.id })
      .eq("id", order.id);

    // Fire server trackers (orderCreated)
    const orderWithItems = {
      ...order,
      yoco_payment_id: yocoSession.id,
      order_items: orderItems,
    };

    // Fire in background — don't block the checkout response
    fireServerTrackers("orderCreated", orderWithItems, trackers).catch(
      (err) => console.error("Server tracker onOrderCreated failed:", err)
    );

    return NextResponse.json({
      order_id: order.id,
      redirect_url: yocoSession.redirectUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
