import { createServerClient } from "@/lib/supabase/server";
import type {
  OrderBump,
  OrderBumpInsert,
  OrderBumpUpdate,
} from "@/lib/supabase/types";

export async function getOrderBumps(productId: string): Promise<OrderBump[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("order_bumps")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch order bumps for product "${productId}": ${error.message}`
    );
  }

  return data as OrderBump[];
}

export async function createOrderBump(
  bump: OrderBumpInsert
): Promise<OrderBump> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("order_bumps")
    .insert(bump)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order bump: ${error.message}`);
  }

  return data as OrderBump;
}

export async function updateOrderBump(
  id: string,
  updates: OrderBumpUpdate
): Promise<OrderBump> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("order_bumps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update order bump "${id}": ${error.message}`);
  }

  return data as OrderBump;
}

export async function deleteOrderBump(id: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase.from("order_bumps").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete order bump "${id}": ${error.message}`);
  }
}
