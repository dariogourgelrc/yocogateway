import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

interface LineItem {
  displayName: string;
  quantity: number;
  pricingDetails: {
    price: number; // cents
  };
}

interface CreateSessionParams {
  amountInCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  lineItems?: LineItem[];
  metadata?: Record<string, string>;
  customerEmail?: string;
}

interface PaymentSession {
  id: string;
  redirectUrl: string;
}

export async function createStripeSession(
  params: CreateSessionParams
): Promise<PaymentSession> {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    metadata: params.metadata,
    line_items: (params.lineItems || []).map((item) => ({
      price_data: {
        currency: params.currency.toLowerCase(),
        unit_amount: item.pricingDetails.price,
        product_data: {
          name: item.displayName,
        },
      },
      quantity: item.quantity,
    })),
  });

  if (!session.url) {
    throw new Error("Stripe session creation failed: no URL returned");
  }

  return { id: session.id, redirectUrl: session.url };
}
