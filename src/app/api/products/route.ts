import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/db/products";
import { createOrderBump } from "@/lib/db/order-bumps";
import { createTracker } from "@/lib/db/product-trackers";
import { generateSlug } from "@/lib/utils/slug";
import type {
  OrderBumpInsert,
  ProductInsert,
  ProductTrackerInsert,
} from "@/lib/supabase/types";

interface CreateProductBody {
  name: string;
  slug?: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  delivery_url: string;
  upsell_url?: string | null;
  back_redirect_url?: string | null;
  order_bumps: Omit<OrderBumpInsert, "product_id">[];
  trackers: Omit<ProductTrackerInsert, "product_id">[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProductBody = await request.json();

    if (!body.name || body.price == null || !body.currency) {
      return NextResponse.json(
        { error: "Missing required fields: name, price, currency" },
        { status: 400 }
      );
    }

    const productData: ProductInsert = {
      name: body.name,
      slug: body.slug || generateSlug(body.name),
      description: body.description || "",
      price: body.price,
      currency: body.currency,
      image_url: body.image_url || "",
      delivery_url: body.delivery_url || "",
      upsell_url: body.upsell_url || null,
      back_redirect_url: body.back_redirect_url || null,
      remarketing_enabled: false,
      remarketing_offer_1: null,
      remarketing_offer_2: null,
      remarketing_offer_3: null,
    };

    const product = await createProduct(productData);

    const bumps = await Promise.all(
      (body.order_bumps || []).map((bump, index) =>
        createOrderBump({
          product_id: product.id,
          name: bump.name,
          description: bump.description || "",
          price: bump.price,
          image_url: bump.image_url || "",
          sort_order: bump.sort_order ?? index,
        })
      )
    );

    const trackers = await Promise.all(
      (body.trackers || []).map((tracker) =>
        createTracker({
          product_id: product.id,
          type: tracker.type,
          tracker_id: tracker.tracker_id,
          side: tracker.side,
          config: tracker.config || null,
        })
      )
    );

    return NextResponse.json(
      { ...product, order_bumps: bumps, product_trackers: trackers },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
