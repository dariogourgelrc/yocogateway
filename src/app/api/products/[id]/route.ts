import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/server";
import {
  updateProduct,
  deleteProduct,
  verifyProductOwnership,
} from "@/lib/db/products";
import {
  getOrderBumps,
  createOrderBump,
  updateOrderBump,
  deleteOrderBump,
} from "@/lib/db/order-bumps";
import {
  getProductTrackers,
  createTracker,
  deleteTracker,
} from "@/lib/db/product-trackers";
import type {
  OrderBumpInsert,
  ProductTrackerInsert,
  ProductUpdate,
} from "@/lib/supabase/types";

interface UpdateProductBody {
  type?: "digital" | "physical";
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  delivery_url?: string;
  upsell_url?: string | null;
  back_redirect_url?: string | null;
  regional_pricing?: Record<string, number>;
  store_name?: string;
  support_email?: string;
  support_phone?: string;
  remarketing_enabled?: boolean;
  remarketing_offer_1?: string | null;
  remarketing_offer_2?: string | null;
  remarketing_offer_3?: string | null;
  order_bumps?: (Omit<OrderBumpInsert, "product_id"> & { id?: string })[];
  trackers?: (Omit<ProductTrackerInsert, "product_id"> & { id?: string })[];
}

export async function PUT(
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

    const body: UpdateProductBody = await request.json();

    const productUpdates: ProductUpdate = {};
    if (body.type !== undefined) productUpdates.type = body.type;
    if (body.name !== undefined) productUpdates.name = body.name;
    if (body.slug !== undefined) productUpdates.slug = body.slug;
    if (body.description !== undefined) productUpdates.description = body.description;
    if (body.price !== undefined) productUpdates.price = body.price;
    if (body.currency !== undefined) productUpdates.currency = body.currency;
    if (body.image_url !== undefined) productUpdates.image_url = body.image_url;
    if (body.delivery_url !== undefined) productUpdates.delivery_url = body.delivery_url;
    if (body.upsell_url !== undefined) productUpdates.upsell_url = body.upsell_url;
    if (body.back_redirect_url !== undefined)
      productUpdates.back_redirect_url = body.back_redirect_url;
    if (body.regional_pricing !== undefined)
      productUpdates.regional_pricing = body.regional_pricing;
    if (body.store_name !== undefined) productUpdates.store_name = body.store_name;
    if (body.support_email !== undefined) productUpdates.support_email = body.support_email;
    if (body.support_phone !== undefined) productUpdates.support_phone = body.support_phone;
    if (body.remarketing_enabled !== undefined)
      productUpdates.remarketing_enabled = body.remarketing_enabled;
    if (body.remarketing_offer_1 !== undefined)
      productUpdates.remarketing_offer_1 = body.remarketing_offer_1;
    if (body.remarketing_offer_2 !== undefined)
      productUpdates.remarketing_offer_2 = body.remarketing_offer_2;
    if (body.remarketing_offer_3 !== undefined)
      productUpdates.remarketing_offer_3 = body.remarketing_offer_3;

    const product = await updateProduct(id, productUpdates);

    // Sync order bumps
    if (body.order_bumps !== undefined) {
      const existingBumps = await getOrderBumps(id);
      const incomingIds = new Set(
        body.order_bumps.filter((b) => b.id).map((b) => b.id!)
      );

      for (const existing of existingBumps) {
        if (!incomingIds.has(existing.id)) {
          await deleteOrderBump(existing.id);
        }
      }

      for (let i = 0; i < body.order_bumps.length; i++) {
        const bump = body.order_bumps[i];
        if (bump.id) {
          await updateOrderBump(bump.id, {
            name: bump.name,
            description: bump.description,
            price: bump.price,
            image_url: bump.image_url,
            sort_order: bump.sort_order ?? i,
          });
        } else {
          await createOrderBump({
            product_id: id,
            name: bump.name,
            description: bump.description || "",
            price: bump.price,
            image_url: bump.image_url || "",
            sort_order: bump.sort_order ?? i,
          });
        }
      }
    }

    // Sync trackers
    if (body.trackers !== undefined) {
      const existingTrackers = await getProductTrackers(id);
      for (const tracker of existingTrackers) {
        await deleteTracker(tracker.id);
      }
      for (const tracker of body.trackers) {
        await createTracker({
          product_id: id,
          type: tracker.type,
          tracker_id: tracker.tracker_id,
          side: tracker.side,
          config: tracker.config || null,
        });
      }
    }

    return NextResponse.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
