interface LineItem {
  displayName: string;
  quantity: number;
  pricingDetails: {
    price: number;
  };
}

interface CreateSessionParams {
  amountInCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  lineItems?: LineItem[];
  metadata?: Record<string, string>;
}

interface YocoSession {
  id: string;
  redirectUrl: string;
}

export async function createYocoSession(
  params: CreateSessionParams
): Promise<YocoSession> {
  const res = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount: params.amountInCents,
      currency: params.currency,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      failureUrl: params.failureUrl,
      lineItems: params.lineItems,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Yoco session creation failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return { id: data.id, redirectUrl: data.redirectUrl };
}
