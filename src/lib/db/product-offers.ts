import { createServerClient } from "@/lib/supabase/server";
import type {
  ProductOffer,
  ProductOfferInsert,
  ProductOfferUpdate,
} from "@/lib/supabase/types";

export async function getOffersByProductId(
  productId: string
): Promise<ProductOffer[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_offers")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch offers for product "${productId}": ${error.message}`
    );
  }

  return data as ProductOffer[];
}

export async function getOfferById(id: string): Promise<ProductOffer | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch offer "${id}": ${error.message}`);
  }

  return data as ProductOffer | null;
}

export async function getOfferBySlug(
  slug: string
): Promise<ProductOffer | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_offers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch offer by slug "${slug}": ${error.message}`
    );
  }

  return data as ProductOffer | null;
}

export async function createOffer(
  offer: ProductOfferInsert
): Promise<ProductOffer> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_offers")
    .insert(offer)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create offer: ${error.message}`);
  }

  return data as ProductOffer;
}

export async function updateOffer(
  id: string,
  updates: ProductOfferUpdate
): Promise<ProductOffer> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_offers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update offer "${id}": ${error.message}`);
  }

  return data as ProductOffer;
}

export async function deleteOffer(id: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("product_offers")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete offer "${id}": ${error.message}`);
  }
}
