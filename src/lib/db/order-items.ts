import { createServerClient } from "@/lib/supabase/server";
import type { OrderItem, OrderItemInsert } from "@/lib/supabase/types";

export async function createOrderItems(
  items: OrderItemInsert[]
): Promise<OrderItem[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("order_items")
    .insert(items)
    .select();

  if (error) {
    throw new Error(`Failed to create order items: ${error.message}`);
  }

  return data as OrderItem[];
}
