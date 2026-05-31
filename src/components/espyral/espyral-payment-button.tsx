'use client';
import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

interface Props {
  productId: string;
  offerId?: string;
  slug: string;
  currency: string;
  total: number;
  disabled: boolean;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  selectedBumpIds: string[];
  trackingParams: Record<string, unknown>;
  eventId: string;
  onPaymentStart: () => void;
  onPaymentSuccess: (orderId: string) => void;
  onPaymentFailure: (error: string) => void;
}

export function EspyralPaymentButton({
  productId,
  offerId,
  slug,
  currency,
  disabled,
  buyerName,
  buyerEmail,
  buyerPhone,
  selectedBumpIds,
  trackingParams,
  eventId,
  onPaymentStart,
  onPaymentFailure,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = useCallback(async () => {
    setLoading(true);
    setError(null);
    onPaymentStart();

    try {
      const res = await fetch(`/api/checkout/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          offer_id: offerId || undefined,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
          selected_bump_ids: selectedBumpIds,
          tracking_params: { ...trackingParams, event_id: eventId },
          currency,
          // Tell the API to use the Espyral success page URL
          success_path_prefix: `/espyral/checkout/${slug}/success`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create checkout');
      }

      const { client_secret, stripe_publishable_key } = await res.json();
      setStripePromise(loadStripe(stripe_publishable_key));
      setClientSecret(client_secret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      onPaymentFailure(message);
      setLoading(false);
    }
  }, [productId, offerId, currency, slug, buyerName, buyerEmail, buyerPhone, selectedBumpIds, trackingParams, eventId, onPaymentStart, onPaymentFailure]);

  if (clientSecret && stripePromise) {
    return (
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePay}
        disabled={disabled || loading}
        className="w-full bg-foreground text-primary-foreground py-4 text-xs font-sans tracking-[0.25em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </>
        ) : (
          'Complete Purchase'
        )}
      </button>
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm font-sans text-red-700">
          {error}
        </div>
      )}
      <p className="text-center text-xs font-sans text-muted-foreground tracking-wider">
        Secured by Stripe · Encrypted checkout
      </p>
    </div>
  );
}
