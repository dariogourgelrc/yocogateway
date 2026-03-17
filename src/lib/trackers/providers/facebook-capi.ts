import type {
  ServerTrackerProvider,
  OrderWithItems,
  ProductTracker,
} from "@/lib/supabase/types";
import { createHash } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export const FacebookCAPITracker: ServerTrackerProvider = {
  type: "facebook",

  async onOrderCreated() {
    // CAPI only fires on purchase, not on order creation
  },

  async onOrderPaid(order: OrderWithItems, config: ProductTracker) {
    const accessToken = (config.config as Record<string, string>)?.access_token;
    const datasetId = (config.config as Record<string, string>)?.dataset_id;

    if (!accessToken || !datasetId) {
      console.error("Facebook CAPI: missing access_token or dataset_id in config");
      return;
    }

    // event_id is stored in order tracking_params by the checkout flow
    const eventId = (order.tracking_params as unknown as Record<string, unknown>)?.event_id as string | undefined;

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || order.id,
          action_source: "website",
          user_data: {
            em: [sha256(order.buyer_email)],
            ph: [sha256(order.buyer_phone)],
            fn: [sha256(order.buyer_name.split(" ")[0] || "")],
            ln: [sha256(order.buyer_name.split(" ").slice(1).join(" ") || "")],
          },
          custom_data: {
            value: order.total_amount / 100,
            currency: order.currency,
            content_ids: order.order_items.map((item) => item.reference_id),
            contents: order.order_items.map((item) => ({
              id: item.reference_id,
              quantity: 1,
              item_price: item.price / 100,
            })),
          },
        },
      ],
    };

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${datasetId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`Facebook CAPI error: ${res.status} ${err}`);
    }
  },
};
