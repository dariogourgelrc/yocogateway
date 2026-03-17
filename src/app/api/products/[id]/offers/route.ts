import { NextRequest, NextResponse } from "next/server";
import {
  getOffersByProductId,
  createOffer,
  updateOffer,
  deleteOffer,
} from "@/lib/db/product-offers";
import type { ProductOfferInsert } from "@/lib/supabase/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const offers = await getOffersByProductId(id);
    return NextResponse.json(offers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const offer = await createOffer({
      product_id: id,
      name: body.name,
      slug: body.slug,
      price: body.price,
      back_redirect_url: body.back_redirect_url || null,
      sort_order: body.sort_order ?? 0,
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    if (!body.offer_id) {
      return NextResponse.json(
        { error: "offer_id is required" },
        { status: 400 }
      );
    }

    const offer = await updateOffer(body.offer_id, {
      name: body.name,
      slug: body.slug,
      price: body.price,
      back_redirect_url: body.back_redirect_url,
      sort_order: body.sort_order,
    });

    return NextResponse.json(offer);
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
    const { offer_id } = await request.json();

    if (!offer_id) {
      return NextResponse.json(
        { error: "offer_id is required" },
        { status: 400 }
      );
    }

    await deleteOffer(offer_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
