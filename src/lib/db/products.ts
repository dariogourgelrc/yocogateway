import { createServerClient } from "@/lib/supabase/server";
import type {
  Product,
  ProductInsert,
  ProductOffer,
  ProductUpdate,
  ProductWithBumps,
  ProductWithBumpsAndTrackers,
} from "@/lib/supabase/types";

export interface ResolvedProduct extends ProductWithBumpsAndTrackers {
  activeOffer?: ProductOffer;
}

export async function getProductBySlug(
  slug: string
): Promise<ResolvedProduct> {
  const supabase = createServerClient();

  // First try to find a product with this slug
  const { data, error } = await supabase
    .from("products")
    .select("*, order_bumps(*), product_trackers(*)")
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "order_bumps", ascending: true })
    .maybeSingle();

  if (data) {
    return data as ResolvedProduct;
  }

  // If no product found, try to find an offer with this slug
  const { data: offer, error: offerError } = await supabase
    .from("product_offers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!offer) {
    throw new Error(
      `No product or offer found for slug "${slug}"`
    );
  }

  // Fetch the parent product with bumps and trackers
  const { data: parent, error: parentError } = await supabase
    .from("products")
    .select("*, order_bumps(*), product_trackers(*)")
    .eq("id", offer.product_id)
    .order("sort_order", { referencedTable: "order_bumps", ascending: true })
    .single();

  if (parentError) {
    throw new Error(
      `Failed to fetch parent product for offer "${slug}": ${parentError.message}`
    );
  }

  const resolved = parent as ResolvedProduct;
  resolved.activeOffer = offer as ProductOffer;
  // Override price and back_redirect_url from the offer
  resolved.price = offer.price;
  if (offer.back_redirect_url) {
    resolved.back_redirect_url = offer.back_redirect_url;
  }

  return resolved;
}

export async function getProductById(
  id: string
): Promise<ProductWithBumpsAndTrackers> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, order_bumps(*), product_trackers(*)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "order_bumps", ascending: true })
    .single();

  if (error) {
    throw new Error(`Failed to fetch product by id "${id}": ${error.message}`);
  }

  return data as ProductWithBumpsAndTrackers;
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data as Product[];
}

export async function getProductsByUserId(userId: string): Promise<Product[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products for user: ${error.message}`);
  }

  return data as Product[];
}

export async function verifyProductOwnership(
  productId: string,
  userId: string
): Promise<boolean> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function createProduct(
  product: ProductInsert
): Promise<Product> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return data as Product;
}

export async function updateProduct(
  id: string,
  updates: ProductUpdate
): Promise<Product> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update product "${id}": ${error.message}`);
  }

  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete product "${id}": ${error.message}`);
  }
}
