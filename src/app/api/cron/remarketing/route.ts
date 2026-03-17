import { NextRequest, NextResponse } from "next/server";
import {
  getPendingOrdersForRemarketing,
  getSentRemarketingEmails,
  recordRemarketingEmail,
  type RemarketingOrderRow,
} from "@/lib/db/orders";
import { getOfferById } from "@/lib/db/product-offers";
import { sendRemarketingEmail } from "@/lib/notifications/remarketing-emails";

// Intervals in milliseconds
const THIRTY_MINUTES = 30 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;

function getEmailToSend(
  ageMs: number,
  sentEmails: Set<number>
): (1 | 2 | 3) | null {
  if (ageMs >= SEVENTY_TWO_HOURS && !sentEmails.has(3)) return 3;
  if (ageMs >= TWENTY_FOUR_HOURS && !sentEmails.has(2)) return 2;
  if (ageMs >= THIRTY_MINUTES && !sentEmails.has(1)) return 1;
  return null;
}

function getOfferIdForEmail(
  order: RemarketingOrderRow,
  emailNumber: 1 | 2 | 3
): string | null {
  if (emailNumber === 1) return order.remarketing_offer_1;
  if (emailNumber === 2) return order.remarketing_offer_2;
  return order.remarketing_offer_3;
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pendingOrders = await getPendingOrdersForRemarketing();

    if (pendingOrders.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const orderIds = pendingOrders.map((o) => o.id);
    const sentRecords = await getSentRemarketingEmails(orderIds);

    // Build a map: orderId -> Set of sent email numbers
    const sentMap = new Map<string, Set<number>>();
    for (const record of sentRecords) {
      if (!sentMap.has(record.order_id)) {
        sentMap.set(record.order_id, new Set());
      }
      sentMap.get(record.order_id)!.add(record.email_number);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const order of pendingOrders) {
      // Skip products with remarketing disabled
      if (!order.remarketing_enabled) continue;

      const ageMs = Date.now() - new Date(order.created_at).getTime();
      const sentEmails = sentMap.get(order.id) || new Set<number>();
      const emailToSend = getEmailToSend(ageMs, sentEmails);

      if (!emailToSend) continue;

      // Check if there's a specific offer configured for this email
      const offerId = getOfferIdForEmail(order, emailToSend);
      let offerSlug: string | null = null;
      let offerPrice: number | null = null;

      if (offerId) {
        const offer = await getOfferById(offerId);
        if (offer) {
          offerSlug = offer.slug;
          offerPrice = offer.price;
        }
      }

      const success = await sendRemarketingEmail(
        {
          id: order.id,
          buyer_name: order.buyer_name,
          buyer_email: order.buyer_email,
          total_amount: offerPrice ?? order.total_amount,
          currency: order.currency,
          product_name: order.product_name,
          product_slug: offerSlug ?? order.product_slug,
        },
        emailToSend
      );

      if (success) {
        await recordRemarketingEmail(order.id, emailToSend);
        sent++;
      } else {
        errors.push(`order=${order.id} email=${emailToSend}`);
      }
    }

    return NextResponse.json({
      processed: pendingOrders.length,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Remarketing cron error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
