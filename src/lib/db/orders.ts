import { createServerClient } from "@/lib/supabase/server";
import type { Order, OrderInsert, OrderWithItems } from "@/lib/supabase/types";

export async function createOrder(order: OrderInsert): Promise<Order> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

  return data as Order;
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to update order "${id}" status to "${status}": ${error.message}`
    );
  }

  return data as Order;
}

export async function getOrderById(
  id: string
): Promise<OrderWithItems | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch order "${id}": ${error.message}`);
  }

  return data as OrderWithItems | null;
}

export async function getOrderByPaymentId(
  yocoPaymentId: string
): Promise<OrderWithItems | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("yoco_payment_id", yocoPaymentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // not found
    }
    throw new Error(
      `Failed to fetch order by payment id "${yocoPaymentId}": ${error.message}`
    );
  }

  return data as OrderWithItems;
}

export interface RemarketingOrderRow extends Order {
  product_name: string;
  product_slug: string;
  remarketing_enabled: boolean;
  remarketing_offer_1: string | null;
  remarketing_offer_2: string | null;
  remarketing_offer_3: string | null;
}

// Remarketing: get pending orders older than 30min but younger than 7 days
export async function getPendingOrdersForRemarketing(): Promise<
  RemarketingOrderRow[]
> {
  const supabase = createServerClient();

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, products!inner(name, slug, remarketing_enabled, remarketing_offer_1, remarketing_offer_2, remarketing_offer_3)"
    )
    .eq("status", "pending")
    .lte("created_at", thirtyMinAgo)
    .gte("created_at", sevenDaysAgo);

  if (error) {
    throw new Error(
      `Failed to fetch pending orders for remarketing: ${error.message}`
    );
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const products = row.products as {
      name: string;
      slug: string;
      remarketing_enabled: boolean;
      remarketing_offer_1: string | null;
      remarketing_offer_2: string | null;
      remarketing_offer_3: string | null;
    };
    const { products: _, ...order } = row;
    return {
      ...(order as unknown as Order),
      product_name: products.name,
      product_slug: products.slug,
      remarketing_enabled: products.remarketing_enabled,
      remarketing_offer_1: products.remarketing_offer_1,
      remarketing_offer_2: products.remarketing_offer_2,
      remarketing_offer_3: products.remarketing_offer_3,
    };
  });
}

export async function getSentRemarketingEmails(
  orderIds: string[]
): Promise<{ order_id: string; email_number: number }[]> {
  if (orderIds.length === 0) return [];
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("remarketing_emails")
    .select("order_id, email_number")
    .in("order_id", orderIds);

  if (error) {
    throw new Error(`Failed to fetch remarketing emails: ${error.message}`);
  }

  return data || [];
}

export async function recordRemarketingEmail(
  orderId: string,
  emailNumber: number
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("remarketing_emails")
    .insert({ order_id: orderId, email_number: emailNumber });

  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Failed to record remarketing email: ${error.message}`);
  }
}
