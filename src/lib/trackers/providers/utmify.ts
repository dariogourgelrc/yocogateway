import type {
  ServerTrackerProvider,
  OrderWithItems,
  ProductTracker,
  TrackingParams,
} from "@/lib/supabase/types";

const UTMIFY_ENDPOINT = "https://api.utmify.com.br/api-credentials/orders";

const UTMIFY_SUPPORTED_CURRENCIES = new Set([
  "BRL", "USD", "EUR", "GBP", "ARS", "CAD", "COP",
  "MXN", "PYG", "CLP", "PEN", "PLN", "UAH", "CHF",
  "THB", "AUD",
]);

let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getZarToUsdRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch(
      "https://open.er-api.com/v6/latest/ZAR"
    );
    if (!res.ok) throw new Error(`Exchange rate API: ${res.status}`);
    const data = await res.json();
    const rate = data.rates?.USD;
    if (!rate) throw new Error("USD rate not found in response");
    cachedRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch (err) {
    console.error("Exchange rate fetch failed, using fallback:", err);
    return 0.055; // fallback ~1 ZAR = 0.055 USD
  }
}

async function convertToUsd(amountCents: number, currency: string) {
  if (currency === "USD") return { cents: amountCents, currency: "USD" };
  if (UTMIFY_SUPPORTED_CURRENCIES.has(currency)) {
    return { cents: amountCents, currency };
  }
  // ZAR/NAD → USD
  const rate = await getZarToUsdRate();
  return { cents: Math.round(amountCents * rate), currency: "USD" };
}

async function buildPayload(
  order: OrderWithItems,
  status: "waiting_payment" | "paid"
) {
  const trackingParams = order.tracking_params as TrackingParams;
  const converted = await convertToUsd(order.total_amount, order.currency);

  const productItems = [];
  for (const item of order.order_items) {
    const p = await convertToUsd(item.price, order.currency);
    productItems.push({
      id: item.reference_id,
      name: item.name,
      planId: null,
      planName: null,
      quantity: 1,
      priceInCents: p.cents,
    });
  }

  return {
    orderId: order.id,
    platform: "YocoGateway",
    paymentMethod: "credit_card" as const,
    status,
    createdAt: new Date(order.created_at)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19),
    approvedDate:
      status === "paid"
        ? new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19)
        : null,
    refundedAt: null,
    customer: {
      name: order.buyer_name,
      email: order.buyer_email,
      phone: order.buyer_phone,
      document: null,
    },
    products: productItems,
    trackingParameters: {
      src: trackingParams.src ?? null,
      sck: trackingParams.sck ?? null,
      utm_source: trackingParams.utm_source ?? null,
      utm_campaign: trackingParams.utm_campaign ?? null,
      utm_medium: trackingParams.utm_medium ?? null,
      utm_content: trackingParams.utm_content ?? null,
      utm_term: trackingParams.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: converted.cents,
      gatewayFeeInCents: 0,
      userCommissionInCents: converted.cents,
      currency: converted.currency,
    },
  };
}

async function sendToUtmify(
  apiToken: string,
  payload: Awaited<ReturnType<typeof buildPayload>>
) {
  console.log(
    `UTMify → sending status="${payload.status}" orderId="${payload.orderId}"`,
    JSON.stringify(payload)
  );

  const res = await fetch(UTMIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": apiToken,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`UTMify error: ${res.status} ${body}`);
  } else {
    console.log(`UTMify ← ${res.status} ${body}`);
  }
}

export const UTMifyTracker: ServerTrackerProvider = {
  type: "utmify",

  async onOrderCreated(order: OrderWithItems, config: ProductTracker) {
    const payload = await buildPayload(order, "waiting_payment");
    await sendToUtmify(config.tracker_id, payload);
  },

  async onOrderPaid(order: OrderWithItems, config: ProductTracker) {
    const payload = await buildPayload(order, "paid");
    await sendToUtmify(config.tracker_id, payload);
  },
};
