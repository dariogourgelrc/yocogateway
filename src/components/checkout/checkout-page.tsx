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
import { formatCurrency } from "@/lib/utils/currency";
import type {
  ProductWithBumpsAndTrackers,
  TrackingParams,
  ProductOffer,
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
  recoverData?: {
    name: string;
    email: string;
    phone: string;
    address?: { address_line: string; city: string; postal_code: string; country: string };
  };
  exitIntentOffer?: ProductOffer;
}

export function CheckoutPage({ product: initialProduct, detectedCurrency, offerId, recoverData, exitIntentOffer }: CheckoutPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Always use detected currency — same price number, just different currency symbol.
  // If regional_pricing has a specific price for that currency, use it; otherwise keep base price.
  const initialCurrency = detectedCurrency || initialProduct.currency;

  const [activeCurrency, setActiveCurrency] = useState(initialCurrency);

  // Offers: server already overrides initialProduct.price to the offer price — never touch it.
  // Regular products: use regional price if configured, else use base price.
  const activePrice = offerId
    ? initialProduct.price
    : initialProduct.regional_pricing?.[activeCurrency] ?? initialProduct.price;
  const product = { ...initialProduct, price: activePrice, currency: activeCurrency };

  const [shippingAddress, setShippingAddress] = useState<ShippingInfo>(
    recoverData?.address || { address_line: "", city: "", postal_code: "", country: "" }
  );

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
  // Collapse forms when data arrives pre-filled (upsell / external project)
  const [editingBuyer, setEditingBuyer] = useState(!recoverData);
  const [editingShipping, setEditingShipping] = useState(!recoverData?.address);

  // Exit intent modal
  const [showExitIntent, setShowExitIntent] = useState(false);

  useEffect(() => {
    if (!exitIntentOffer) return;
    let shown = false;
    const handleMouseLeave = (e: MouseEvent) => {
      if (shown || e.clientY > 20) return;
      shown = true;
      setShowExitIntent(true);
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [exitIntentOffer]);

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
      {/* Exit intent modal */}
      {showExitIntent && exitIntentOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={() => setShowExitIntent(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {product.image_url && (
              <div className="mb-4 flex justify-center">
                <img src={product.image_url} alt={product.name} className="h-20 w-20 rounded-xl object-contain" />
              </div>
            )}

            <h2 className="mb-1 text-center text-xl font-bold text-gray-900">Wait! Special offer</h2>
            <p className="mb-5 text-center text-sm text-gray-500">Don&apos;t miss this one-time opportunity</p>

            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-center">
              {(() => {
                const discountPct = Math.round((1 - exitIntentOffer.price / product.price) * 100);
                const savings = product.price - exitIntentOffer.price;
                return (
                  <>
                    {discountPct > 0 && (
                      <span className="mb-2 inline-block rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white">
                        {discountPct}% OFF
                      </span>
                    )}
                    <div className="mt-1 flex items-center justify-center gap-3">
                      <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price, product.currency)}</span>
                      <span className="text-2xl font-black text-gray-900">{formatCurrency(exitIntentOffer.price, product.currency)}</span>
                    </div>
                    {savings > 0 && (
                      <p className="mt-1 text-xs text-blue-600">You save {formatCurrency(savings, product.currency)}!</p>
                    )}
                  </>
                );
              })()}
            </div>

            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (buyerInfo.name) params.set("prefill_name", buyerInfo.name);
                if (buyerInfo.email) params.set("prefill_email", buyerInfo.email);
                if (buyerInfo.phone) params.set("prefill_phone", buyerInfo.phone);
                const qs = params.toString();
                window.location.href = `/checkout/${exitIntentOffer.slug}${qs ? "?" + qs : ""}`;
              }}
              className="mb-3 w-full rounded-full bg-blue-600 py-3 text-base font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              I want the discount!
            </button>
            <button
              onClick={() => setShowExitIntent(false)}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              No thanks, I prefer to pay full price.
            </button>
          </div>
        </div>
      )}

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

          {/* Buyer form — collapses to summary when data is pre-filled (upsell mode) */}
          <div className="border-b border-gray-100 px-5 py-4">
            {!editingBuyer ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{buyerInfo.name}</p>
                  <p className="text-xs text-gray-500 truncate">{buyerInfo.email} · {buyerInfo.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBuyer(true)}
                  className="shrink-0 text-xs text-gray-500 underline hover:text-gray-800"
                >
                  Edit
                </button>
              </div>
            ) : (
              <BuyerForm value={buyerInfo} onChange={setBuyerInfo} />
            )}
          </div>


          {/* Shipping address — physical products only, hidden when pre-filled from external project */}
          {product.type === "physical" &&
            !recoverData &&
            buyerInfo.name.trim() !== "" &&
            buyerInfo.email.trim() !== "" &&
            buyerInfo.phone.trim() !== "" && (
              <div className="border-b border-gray-100 px-5 py-4">
                <ShippingForm value={shippingAddress} onChange={setShippingAddress} />
              </div>
            )}

          {/* Shipping summary — shown when address was pre-filled from external project */}
          {product.type === "physical" && recoverData && shippingAddress.address_line && (
            <div className="border-b border-gray-100 px-5 py-4">
              {!editingShipping ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Delivery address</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{shippingAddress.address_line}</p>
                    <p className="text-xs text-gray-500 truncate">{shippingAddress.city} · {shippingAddress.postal_code} · {shippingAddress.country}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingShipping(true)}
                    className="shrink-0 text-xs text-gray-500 underline hover:text-gray-800"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <ShippingForm value={shippingAddress} onChange={setShippingAddress} />
              )}
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
