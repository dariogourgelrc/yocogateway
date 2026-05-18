import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSentRemarketingEmails, recordRemarketingEmail } from "@/lib/db/orders";
import { sendPhysicalShippingEmail, sendPhysicalDelayEmail } from "@/lib/notifications/physical-followup-emails";
import type { Order } from "@/lib/supabase/types";

// Reuse the remarketing_emails table with high email_numbers to avoid conflicts:
// 21 = physical shipping update email (~3h after purchase)
// 22 = physical delay notice email (~48h after purchase)
const EMAIL_SHIPPING = 21;
const EMAIL_DELAY = 22;

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

interface PhysicalOrderRow extends Order {
  product_name: string;
  store_name: string | null;
  support_email: string | null;
  support_phone: string | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const fourteenDaysAgo = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();

  const { data: rawOrders, error } = await supabase
    .from("orders")
    .select("*, products!inner(name, type, store_name, support_email, support_phone)")
    .eq("status", "paid")
    .gte("created_at", fourteenDaysAgo);

  if (error) {
    console.error("physical-followup cron: DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter to physical product orders only
  const orders: PhysicalOrderRow[] = (rawOrders || [])
    .filter((row: Record<string, unknown>) => {
      const products = row.products as { type: string } | null;
      return products?.type === "physical";
    })
    .map((row: Record<string, unknown>) => {
      const products = row.products as {
        name: string;
        store_name: string | null;
        support_email: string | null;
        support_phone: string | null;
      };
      const { products: _, ...order } = row;
      return {
        ...(order as unknown as Order),
        product_name: products.name,
        store_name: products.store_name,
        support_email: products.support_email,
        support_phone: products.support_phone,
      };
    });

  if (orders.length === 0) {
    return NextResponse.json({ sent: 0, message: "No physical orders in window" });
  }

  const orderIds = orders.map((o) => o.id);
  const sentEmails = await getSentRemarketingEmails(orderIds);
  const sentSet = new Set(sentEmails.map((e) => `${e.order_id}:${e.email_number}`));

  const now = Date.now();
  let sent = 0;

  for (const order of orders) {
    const ageMs = now - new Date(order.created_at).getTime();
    const supportEmail =
      order.support_email || process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "";
    const supportPhone = order.support_phone || process.env.SUPPORT_WHATSAPP || "";
    const whatsAppLink = supportPhone
      ? `https://wa.me/${supportPhone.replace(/[^0-9]/g, "")}`
      : "";

    const info = {
      orderId: order.id,
      buyerName: order.buyer_name,
      buyerEmail: order.buyer_email,
      totalAmount: order.total_amount,
      currency: order.currency,
      shippingAddress: order.shipping_address as {
        address_line: string;
        city: string;
        postal_code: string;
        country: string;
      } | null,
      productName: order.product_name,
      storeName: order.store_name || order.product_name,
      supportEmail,
      supportPhone,
      whatsAppLink,
    };

    // Email 2 — shipping update (~3h after purchase)
    if (ageMs >= THREE_HOURS_MS && !sentSet.has(`${order.id}:${EMAIL_SHIPPING}`)) {
      await sendPhysicalShippingEmail(info).catch((err) =>
        console.error(`physical-followup: shipping email failed for ${order.id}:`, err)
      );
      await recordRemarketingEmail(order.id, EMAIL_SHIPPING);
      sent++;
    }

    // Email 3 — delay notice (~48h after purchase)
    if (ageMs >= FORTY_EIGHT_HOURS_MS && !sentSet.has(`${order.id}:${EMAIL_DELAY}`)) {
      await sendPhysicalDelayEmail(info).catch((err) =>
        console.error(`physical-followup: delay email failed for ${order.id}:`, err)
      );
      await recordRemarketingEmail(order.id, EMAIL_DELAY);
      sent++;
    }
  }

  return NextResponse.json({ sent, orders_checked: orders.length });
}
