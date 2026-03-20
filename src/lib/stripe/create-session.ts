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
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded",
    payment_method_types: ["card"],
    return_url: params.returnUrl,
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

  if (!session.client_secret) {
    throw new Error("Stripe session creation failed: no client_secret returned");
  }

  return { id: session.id, clientSecret: session.client_secret };
}
