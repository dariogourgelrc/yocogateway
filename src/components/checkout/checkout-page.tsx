"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductInfo } from "./product-info";
import { OrderBumpCard } from "./order-bump-card";
import { BuyerForm, type BuyerInfo } from "./buyer-form";
import { ShippingForm, type ShippingInfo } from "./shipping-form";
import { OrderSummary } from "./order-summary";
import { StripePayment } from "./stripe-payment";
import { useTracker } from "@/hooks/use-tracker";
import { extractUtmParams } from "@/lib/trackers/utm";
import { generateEventId } from "@/lib/utils/event-id";
import type {
  ProductWithBumpsAndTrackers,
  TrackingParams,
} from "@/lib/supabase/types";

const CURRENCY_OPTIONS = [
  { code: "NAD", label: "N$ — Namibia" },
  { code: "ZAR", label: "R — South Africa" },
  { code: "BWP", label: "P — Botswana" },
];

interface CheckoutPageProps {
  product: ProductWithBumpsAndTrackers;
  detectedCurrency?: string | null;
  offerId?: string;
  recoverData?: { name: string; email: string; phone: string };
}

export function CheckoutPage({ product: initialProduct, detectedCurrency, offerId, recoverData }: CheckoutPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Always use detected currency — same price number, just different currency symbol.
  // If regional_pricing has a specific price for that currency, use it; otherwise keep base price.
  const initialCurrency = detectedCurrency || initialProduct.currency;

  const [activeCurrency, setActiveCurrency] = useState(initialCurrency);

  const activePrice =
    initialProduct.regional_pricing?.[activeCurrency] ?? initialProduct.price;
  const product = { ...initialProduct, price: activePrice, currency: activeCurrency };

  const [shippingAddress, setShippingAddress] = useState<ShippingInfo>({
    address_line: "",
    city: "",
    postal_code: "",
    country: "",
  });

  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo>({
    name: recoverData?.name || "",
    email: recoverData?.email || "",
    phone: recoverData?.phone || "",
  });
  const [trackingParams, setTrackingParams] = useState<TrackingParams>({
    src: null,
    sck: null,
    utm_source: null,
    utm_campaign: null,
    utm_medium: null,
    utm_content: null,
    utm_term: null,
  });
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");
  const [eventId] = useState(() => generateEventId());

  // Extract UTM params on mount
  useEffect(() => {
    if (searchParams) {
      setTrackingParams(extractUtmParams(searchParams));
    }
  }, [searchParams]);

  // Intercept browser back button → redirect to back_redirect_url
  useEffect(() => {
    if (!product.back_redirect_url) return;

    const backUrl = product.back_redirect_url;

    // Push current page onto history stack so back triggers popstate
    history.pushState({ checkout: true }, "", window.location.href);

    const handlePopState = () => {
      // Re-push so repeated back presses keep redirecting
      history.pushState({ checkout: true }, "", window.location.href);
      window.location.href = backUrl;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [product.back_redirect_url]);

  // Init client-side trackers
  const tracker = useTracker(product.product_trackers);

  // Computed total
  const selectedBumpsList = useMemo(
    () => product.order_bumps.filter((b) => selectedBumps.has(b.id)),
    [product.order_bumps, selectedBumps]
  );

  const total = useMemo(
    () =>
      product.price +
      selectedBumpsList.reduce((sum, bump) => sum + bump.price, 0),
    [product.price, selectedBumpsList]
  );

  const shippingValid =
    product.type !== "physical" ||
    (shippingAddress.address_line.trim() !== "" &&
      shippingAddress.city.trim() !== "" &&
      shippingAddress.postal_code.trim() !== "" &&
      shippingAddress.country.trim() !== "");

  const formValid =
    buyerInfo.name.trim() !== "" &&
    buyerInfo.email.trim() !== "" &&
    buyerInfo.phone.trim() !== "" &&
    shippingValid;

  const toggleBump = useCallback((bumpId: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(bumpId)) {
        next.delete(bumpId);
      } else {
        next.add(bumpId);
      }
      return next;
    });
  }, []);

  const handlePaymentStart = useCallback(() => {
    setPaymentStatus("processing");
    tracker.initiateCheckout({
      product_name: product.name,
      value: total,
      currency: product.currency,
    });
  }, [tracker, product, total]);

  const handlePaymentSuccess = useCallback(
    (orderId: string) => {
      setPaymentStatus("success");

      tracker.purchase({
        product_name: product.name,
        value: total,
        currency: product.currency,
        order_id: orderId,
        event_id: eventId,
      });

      setTimeout(() => {
        if (product.upsell_url) {
          window.location.href = product.upsell_url;
        } else {
          router.push(`/checkout/${product.slug}/success`);
        }
      }, 500);
    },
    [tracker, product, total, eventId, router]
  );

  const handlePaymentFailure = useCallback((error: string) => {
    setPaymentStatus("failed");
    console.error("Payment failed:", error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Product header */}
          <div className="border-b border-gray-100 px-5 py-4">
            {product.back_redirect_url && (
              <button
                onClick={() => (window.location.href = product.back_redirect_url!)}
                className="mb-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Back
              </button>
            )}
            <ProductInfo product={product} />
          </div>

          {/* Country / currency selector — hidden on offer checkouts (offers have no regional pricing) */}
          {!offerId && Object.keys(initialProduct.regional_pricing || {}).length > 0 && (
            <div className="border-b border-gray-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Paying from:</span>
                <select
                  value={activeCurrency}
                  onChange={(e) => setActiveCurrency(e.target.value)}
                  className="text-xs rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
                >
                  {CURRENCY_OPTIONS
                    .filter((c) => c.code === initialProduct.currency || initialProduct.regional_pricing?.[c.code])
                    .map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Buyer form */}
          <div className="border-b border-gray-100 px-5 py-4">
            <BuyerForm value={buyerInfo} onChange={setBuyerInfo} />
          </div>

          {/* Shipping address — only for physical products, shown after buyer form */}
          {product.type === "physical" &&
            buyerInfo.name.trim() !== "" &&
            buyerInfo.email.trim() !== "" &&
            buyerInfo.phone.trim() !== "" && (
              <div className="border-b border-gray-100 px-5 py-4">
                <ShippingForm
                  value={shippingAddress}
                  onChange={setShippingAddress}
                />
              </div>
            )}

          {/* Order bumps — only shown after buyer fills in the form */}
          {product.order_bumps.length > 0 && formValid && (
            <div
              className="border-b border-gray-100 px-5 py-4 animate-fade-in"
              style={{
                animation: "fadeIn 0.4s ease-out",
              }}
            >
              <p className="mb-3 text-sm font-semibold text-gray-900">
                Add to your order
              </p>
              <div className="space-y-2">
                {product.order_bumps.map((bump) => (
                  <OrderBumpCard
                    key={bump.id}
                    bump={bump}
                    currency={product.currency}
                    checked={selectedBumps.has(bump.id)}
                    onToggle={toggleBump}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Summary + payment */}
          <div className="px-5 py-4">
            <OrderSummary
              product={product}
              selectedBumps={selectedBumpsList}
              total={total}
            />
            <div className="mt-4">
              <StripePayment
                productId={product.id}
                offerId={offerId}
                productName={product.name}
                total={total}
                currency={product.currency}
                slug={product.slug}
                upsellUrl={product.upsell_url}
                disabled={!formValid || paymentStatus === "processing"}
                buyerName={buyerInfo.name}
                buyerEmail={buyerInfo.email}
                buyerPhone={buyerInfo.phone}
                selectedBumpIds={Array.from(selectedBumps)}
                shippingAddress={product.type === "physical" ? shippingAddress : undefined}
                trackingParams={
                  trackingParams as unknown as Record<string, unknown>
                }
                eventId={eventId}
                onPaymentStart={handlePaymentStart}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailure={handlePaymentFailure}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
