import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, createServerClient } from "@/lib/supabase/server";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

async function requireSuperAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return null;
  if (!SUPER_ADMIN_EMAIL || user.email !== SUPER_ADMIN_EMAIL) return null;
  return user;
}

// Copy all products from the admin account to another user
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { to_user_id } = await request.json();
    if (!to_user_id) {
      return NextResponse.json({ error: "to_user_id is required" }, { status: 400 });
    }

    if (to_user_id === admin.id) {
      return NextResponse.json({ error: "Cannot copy to yourself" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch all products owned by the admin
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", admin.id);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ copied: 0 });
    }

    let copied = 0;

    for (const product of products) {
      // Create unique slug by appending a short suffix
      const newSlug = `${product.slug}-${to_user_id.slice(0, 6)}`;

      const { id: _oldId, created_at: _c, updated_at: _u, ...rest } = product;

      const { data: newProduct, error: insertErr } = await supabase
        .from("products")
        .insert({ ...rest, user_id: to_user_id, slug: newSlug })
        .select()
        .single();

      if (insertErr || !newProduct) continue;

      // Copy order bumps
      const { data: bumps } = await supabase
        .from("order_bumps")
        .select("*")
        .eq("product_id", _oldId);

      if (bumps && bumps.length > 0) {
        await supabase.from("order_bumps").insert(
          bumps.map(({ id: _bid, created_at: _bc, ...b }) => ({
            ...b,
            product_id: newProduct.id,
          }))
        );
      }

      // Copy product trackers
      const { data: trackers } = await supabase
        .from("product_trackers")
        .select("*")
        .eq("product_id", _oldId);

      if (trackers && trackers.length > 0) {
        await supabase.from("product_trackers").insert(
          trackers.map(({ id: _tid, created_at: _tc, ...t }) => ({
            ...t,
            product_id: newProduct.id,
          }))
        );
      }

      // Copy offers (product_offers), giving each a unique slug
      const { data: offers } = await supabase
        .from("product_offers")
        .select("*")
        .eq("product_id", _oldId);

      if (offers && offers.length > 0) {
        await supabase.from("product_offers").insert(
          offers.map(({ id: _oid, created_at: _oc, updated_at: _ou, slug, ...o }) => ({
            ...o,
            product_id: newProduct.id,
            slug: `${slug}-${to_user_id.slice(0, 6)}`,
          }))
        );
      }

      copied++;
    }

    return NextResponse.json({ copied });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
