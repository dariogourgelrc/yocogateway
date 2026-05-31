import Stripe from "stripe";

interface LineItem {
  displayName: string;
  quantity: number;
  pricingDetails: {
    price: number; // cents
  };
}

interface CreateSessionParams {
  stripeSecretKey: string;
  amountInCents: number;
  currency: string;
  returnUrl: string;
  lineItems?: LineItem[];
  metadata?: Record<string, string>;
  customerEmail?: string;
}

interface PaymentSession {
  id: string;
  clientSecret: string;
}

export async function createStripeSession(
  params: CreateSessionParams
): Promise<PaymentSession> {
  const stripe = new Stripe(params.stripeSecretKey, {
    apiVersion: "2026-02-25.clover",
  });

  // Build line items from params — use actual product names
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    params.lineItems && params.lineItems.length > 0
      ? params.lineItems.map((item) => ({
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: item.pricingDetails.price,
            product_data: { name: item.displayName },
          },
          quantity: item.quantity,
        }))
      : [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              unit_amount: params.amountInCents,
              product_data: { name: params.metadata?.productName || "Order" },
            },
            quantity: 1,
          },
        ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded",
    locale: "en",          // always English
    payment_method_types: ["card"],
    return_url: params.returnUrl,
    customer_email: params.customerEmail,
    metadata: params.metadata,
    line_items: stripeLineItems,
  });

  if (!session.client_secret) {
    throw new Error("Stripe session creation failed: no client_secret returned");
  }

  return { id: session.id, clientSecret: session.client_secret };
}
