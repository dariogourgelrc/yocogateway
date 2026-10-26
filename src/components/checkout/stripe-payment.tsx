"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Button } from "@/components/ui/button";
import type { ShippingInfo } from "./shipping-form";
import { getCheckoutCopy, type CheckoutLanguage } from "@/lib/i18n/checkout-copy";

interface StripePaymentProps {
  productId: string;
  offerId?: string;
  productName: string;
  total: number;
  customPrice?: number;
  language?: CheckoutLanguage;
  currency: string;
  slug: string;
  upsellUrl: string | null;
  disabled: boolean;
  autoLoad?: boolean;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  selectedBumpIds: string[];
  shippingAddress?: ShippingInfo;
  trackingParams: Record<string, unknown>;
  eventId: string;
  onPaymentStart: () => void;
  onPaymentSuccess: (orderId: string) => void;
  onPaymentFailure: (error: string) => void;
}

export function StripePayment({
  productId,
  offerId,
  slug,
  total,
  customPrice,
  language = "en",
  currency,
  disabled,
  autoLoad,
  buyerName,
  buyerEmail,
  buyerPhone,
  selectedBumpIds,
  shippingAddress,
  trackingParams,
  eventId,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentFailure,
}: StripePaymentProps) {
  const copy = getCheckoutCopy(language);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [whopSession, setWhopSession] = useState<{ sessionId: string; orderId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWhopComplete = useCallback(
    async (orderId: string) => {
      // The webhook is the durable confirmation; this just mirrors what Stripe's
      // return_url would trigger server-side (mark paid, send email/WhatsApp, UTMify)
      // without navigating away, since the embed already completed in-page.
      try {
        await fetch(
          `/api/payment-callback?order_id=${orderId}&redirect_to=${encodeURIComponent(window.location.href)}`
        );
      } catch {
        // ignore — webhook still confirms the order
      }
      onPaymentSuccess(orderId);
    },
    [onPaymentSuccess]
  );

  const handlePay = useCallback(async () => {
    setLoading(true);
    setError(null);
    onPaymentStart();

    try {
      const res = await fetch(`/api/checkout/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          offer_id: offerId || undefined,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
          selected_bump_ids: selectedBumpIds,
          shipping_address: shippingAddress || undefined,
          tracking_params: { ...trackingParams, event_id: eventId },
          currency,
          custom_price: customPrice,
          language,
          success_path_prefix: `/checkout/${slug}/success?lang=${language}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create checkout");
      }

      const data = await res.json();

      if (data.provider === "whop" && data.whop_session_id) {
        setWhopSession({ sessionId: data.whop_session_id, orderId: data.order_id });
        return;
      }

      setStripePromise(loadStripe(data.stripe_publishable_key));
      setClientSecret(data.client_secret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(copy.paymentFailed);
      onPaymentFailure(message);
      setLoading(false);
    }
  }, [
    productId,
    offerId,
    slug,
    currency,
    customPrice,
    language,
    buyerName,
    buyerEmail,
    buyerPhone,
    selectedBumpIds,
    shippingAddress,
    trackingParams,
    eventId,
    onPaymentStart,
    onPaymentFailure,
  ]);

  // Auto-trigger for physical products as soon as the form becomes valid
  useEffect(() => {
    if (autoLoad && !disabled && !clientSecret && !whopSession && !loading) {
      handlePay();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, disabled]);

  // Show embedded checkout once we have the client secret
  if (clientSecret && stripePromise) {
    return (
      <div className="space-y-3">
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  // Whop's embedded checkout — same idea as Stripe's, just a different SDK
  if (whopSession) {
    return (
      <div className="space-y-3">
        <WhopCheckoutEmbed
          sessionId={whopSession.sessionId}
          onComplete={() => handleWhopComplete(whopSession.orderId)}
          onPaymentError={(err) => {
            const message = err?.message || "Payment failed";
            setError(message);
            onPaymentFailure(message);
          }}
        />
        <p className="text-center text-xs text-gray-400">{copy.securedByWhop}</p>
      </div>
    );
  }

  // Physical products: show spinner while auto-loading the embed
  if (autoLoad) {
    return (
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {copy.loadingPayment}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button
              onClick={handlePay}
              className="mt-2 block w-full rounded bg-red-100 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200"
            >
              {copy.tryAgain}
            </button>
          </div>
        )}
        <p className="text-center text-xs text-gray-400">{copy.securedByStripe}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full text-base"
        disabled={disabled || loading}
        onClick={handlePay}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {copy.processing}
          </span>
        ) : (
          copy.completePurchase
        )}
      </Button>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        {copy.securedByStripe}
      </p>
    </div>
  );
}
