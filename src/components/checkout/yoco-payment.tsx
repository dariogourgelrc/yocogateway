"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";

interface YocoPaymentProps {
  productId: string;
  offerId?: string;
  productName: string;
  total: number;
  currency: string;
  slug: string;
  upsellUrl: string | null;
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

export function YocoPayment({
  productId,
  offerId,
  total,
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
}: YocoPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          tracking_params: { ...trackingParams, event_id: eventId },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create checkout");
      }

      const { redirect_url } = await res.json();

      // Redirect to Yoco hosted checkout page
      window.location.href = redirect_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      onPaymentFailure(message);
      setLoading(false);
    }
  }, [
    productId,
    offerId,
    buyerName,
    buyerEmail,
    buyerPhone,
    selectedBumpIds,
    trackingParams,
    eventId,
    onPaymentStart,
    onPaymentFailure,
  ]);

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
            Processing...
          </span>
        ) : (
          `Pay ${formatCurrency(total, currency)}`
        )}
      </Button>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Secured by Yoco
      </p>
    </div>
  );
}
