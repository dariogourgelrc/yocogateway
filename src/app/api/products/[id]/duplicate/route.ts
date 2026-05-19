import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/server";
import { getProductById, createProduct, verifyProductOwnership } from "@/lib/db/products";
import { getOrderBumps, createOrderBump } from "@/lib/db/order-bumps";
import { getProductTrackers, createTracker } from "@/lib/db/product-trackers";
import { generateSlug } from "@/lib/utils/slug";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const owns = await verifyProductOwnership(id, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const source = await getProductById(id);
    const bumps = await getOrderBumps(id);
    const trackers = await getProductTrackers(id);

    const newName = `${source.name} (Copy)`;
    const newSlug = generateSlug(newName) + "-" + Date.now().toString(36);

    const newProduct = await createProduct({
      user_id: user.id,
      type: source.type,
      name: newName,
      slug: newSlug,
      description: source.description,
      price: source.price,
      currency: source.currency,
      image_url: source.image_url,
      delivery_url: source.delivery_url,
      upsell_url: source.upsell_url,
      back_redirect_url: source.back_redirect_url,
      regional_pricing: source.regional_pricing,
      store_name: source.store_name,
      support_email: source.support_email,
      support_phone: source.support_phone,
      remarketing_enabled: false,
      remarketing_offer_1: null,
      remarketing_offer_2: null,
      remarketing_offer_3: null,
      // Stripe keys intentionally not copied
      stripe_secret_key: null,
      stripe_publishable_key: null,
      stripe_webhook_secret: null,
      exit_intent_offer_id: null,
    });

    await Promise.all(
      bumps.map((b) =>
        createOrderBump({
          product_id: newProduct.id,
          name: b.name,
          description: b.description,
          price: b.price,
          image_url: b.image_url,
          sort_order: b.sort_order,
        })
      )
    );

    await Promise.all(
      trackers.map((t) =>
        createTracker({
          product_id: newProduct.id,
          type: t.type,
          tracker_id: t.tracker_id,
          side: t.side,
          config: t.config,
        })
      )
    );

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
