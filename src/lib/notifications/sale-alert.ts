import type { Order, Product } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/currency";

export async function sendSaleNotification(order: Order, product: Product) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  const total = formatCurrency(order.total_amount, order.currency);

  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: {
      Title: "New Sale!",
      Tags: "money_with_wings",
    },
    body: `from PaySA Online\nYou received a sale of ${total}`,
  });
}
