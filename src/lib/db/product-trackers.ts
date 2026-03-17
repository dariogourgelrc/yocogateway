import { createServerClient } from "@/lib/supabase/server";
import type {
  ProductTracker,
  ProductTrackerInsert,
} from "@/lib/supabase/types";

export async function getProductTrackers(
  productId: string
): Promise<ProductTracker[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_trackers")
    .select("*")
    .eq("product_id", productId);

  if (error) {
    throw new Error(
      `Failed to fetch trackers for product "${productId}": ${error.message}`
    );
  }

  return data as ProductTracker[];
}

export async function createTracker(
  tracker: ProductTrackerInsert
): Promise<ProductTracker> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("product_trackers")
    .insert(tracker)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tracker: ${error.message}`);
  }

  return data as ProductTracker;
}

export async function deleteTracker(id: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("product_trackers")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete tracker "${id}": ${error.message}`);
  }
}
