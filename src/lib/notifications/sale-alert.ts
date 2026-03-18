import type { Order, Product } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/currency";

export async function sendSaleNotification(order: Order, product: Product) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  const total = formatCurrency(order.total_amount, order.currency);

  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      title: "New Sale! 💰",
      message: `${product.name}\n${total} from ${order.buyer_name}`,
      tags: ["money_with_wings"],
    }),
  });
}
