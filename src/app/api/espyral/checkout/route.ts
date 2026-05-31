import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createStripeSession } from "@/lib/stripe/create-session";
import { createOrder } from "@/lib/db/orders";
import { createOrderItems } from "@/lib/db/order-items";
import type { OrderItemInsert } from "@/lib/supabase/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, buyer_name, buyer_email, buyer_phone, currency, discount_percent } = body;
    const discountMultiplier = discount_percent ? 1 - discount_percent / 100 : 1;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array" },
        { status: 400, headers: CORS }
      );
    }
    if (!buyer_name || !buyer_email || !buyer_phone) {
      return NextResponse.json(
        { error: "Missing required fields: buyer_name, buyer_email, buyer_phone" },
        { status: 400, headers: CORS }
      );
    }

    const supabase = createServerClient();
    const slugs: string[] = items.map((i: { slug: string }) => i.slug);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("slug", slugs);

    if (productsError || !products?.length) {
      return NextResponse.json(
        { error: "Products not found" },
        { status: 404, headers: CORS }
      );
    }

    const primary = products[0];
    const stripeSecretKey: string | null = primary.stripe_secret_key;
    const stripePublishableKey: string | null = primary.stripe_publishable_key;

    if (!stripeSecretKey || !stripePublishableKey) {
      return NextResponse.json(
        { error: "Payment not configured for this product" },
        { status: 503, headers: CORS }
      );
    }

    const activeCurrency: string = currency || primary.currency;

    type CartItem = { slug: string; qty?: number; size?: string };
    const itemsWithData = (items as CartItem[])
      .map((item) => {
        const product = products.find((p) => p.slug === item.slug);
        if (!product) return null;
        const basePrice: number =
          product.regional_pricing?.[activeCurrency] ?? product.price;
        const unitPrice = Math.round(basePrice * discountMultiplier);
        return { ...item, product, unitPrice };
      })
      .filter(Boolean) as Array<{
        slug: string;
        qty?: number;
        size?: string;
        product: (typeof products)[number];
        unitPrice: number;
      }>;

    const total = itemsWithData.reduce(
      (sum, i) => sum + i.unitPrice * (i.qty ?? 1),
      0
    );

    const order = await createOrder({
      product_id: primary.id,
      yoco_payment_id: null,
      status: "pending",
      buyer_name,
      buyer_email,
      buyer_phone,
      total_amount: total,
      currency: activeCurrency,
      tracking_params: {
        src: null, sck: null, utm_source: null,
        utm_campaign: null, utm_medium: null,
        utm_content: null, utm_term: null,
      },
      shipping_address: null,
    });

    const orderItems: OrderItemInsert[] = itemsWithData.map((i) => ({
      order_id: order.id,
      type: "product" as const,
      reference_id: i.product.id,
      name: i.size ? `${i.product.name} (${i.size})` : i.product.name,
      price: i.unitPrice * (i.qty ?? 1),
    }));
    await createOrderItems(orderItems);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://paysaonline.com";

    const successUrl =
      process.env.NEXT_PUBLIC_ESPYRAL_SUCCESS_URL ||
      "https://espyralcouture.shop/checkout/success";

    const finalDestination = `${successUrl}?order_id=${order.id}`;
    const returnUrl = `${appUrl}/api/payment-callback?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}&redirect_to=${encodeURIComponent(finalDestination)}`;

    const lineItems = itemsWithData.map((i) => ({
      displayName: `EC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      quantity: i.qty ?? 1,
      pricingDetails: { price: i.unitPrice },
    }));

    const session = await createStripeSession({
      stripeSecretKey,
      amountInCents: total,
      currency: activeCurrency,
      returnUrl,
      customerEmail: buyer_email,
      lineItems,
      metadata: { orderId: order.id },
    });

    await supabase
      .from("orders")
      .update({ yoco_payment_id: session.id })
      .eq("id", order.id);

    return NextResponse.json(
      {
        client_secret: session.clientSecret,
        stripe_publishable_key: stripePublishableKey,
        order_id: order.id,
      },
      { headers: CORS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/espyral/checkout]", message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
