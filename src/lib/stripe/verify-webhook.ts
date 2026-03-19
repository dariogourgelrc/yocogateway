import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

export function constructStripeEvent(
  rawBody: string,
  signature: string | null
): Stripe.Event | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return null;

  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}
