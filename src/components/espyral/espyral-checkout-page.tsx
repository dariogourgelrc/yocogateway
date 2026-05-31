'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EspyralHeader } from './espyral-header';
import { EspyralProductPanel } from './espyral-product-panel';
import { EspyralBuyerForm, type EspyralBuyerInfo } from './espyral-buyer-form';
import { EspyralPaymentButton } from './espyral-payment-button';
import { useTracker } from '@/hooks/use-tracker';
import { extractUtmParams } from '@/lib/trackers/utm';
import { generateEventId } from '@/lib/utils/event-id';
import type { ProductWithBumpsAndTrackers, TrackingParams } from '@/lib/supabase/types';

const CURRENCY_OPTIONS = [
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'USD', label: 'USD — US Dollar' },
];

interface EspyralCheckoutPageProps {
  product: ProductWithBumpsAndTrackers;
  offerId?: string;
  prefillData?: { name: string; email: string; phone: string };
}

export function EspyralCheckoutPage({ product: initialProduct, offerId, prefillData }: EspyralCheckoutPageProps) {
  const searchParams = useSearchParams();

  const [activeCurrency, setActiveCurrency] = useState(initialProduct.currency);

  const activePrice = offerId
    ? initialProduct.price
    : (initialProduct.regional_pricing?.[activeCurrency] ?? initialProduct.price);

  const product = useMemo(
    () => ({ ...initialProduct, price: activePrice, currency: activeCurrency }),
    [initialProduct, activePrice, activeCurrency]
  );

  const availableCurrencies = useMemo(() => {
    const configured = new Set([
      initialProduct.currency,
      ...Object.keys(initialProduct.regional_pricing || {}),
    ]);
    return CURRENCY_OPTIONS.filter((c) => configured.has(c.code));
  }, [initialProduct]);

  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [buyerInfo, setBuyerInfo] = useState<EspyralBuyerInfo>({
    name: prefillData?.name || '',
    email: prefillData?.email || '',
    phone: prefillData?.phone || '',
  });
  const [trackingParams, setTrackingParams] = useState<TrackingParams>({
    src: null, sck: null, utm_source: null, utm_campaign: null,
    utm_medium: null, utm_content: null, utm_term: null,
  });
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [eventId] = useState(() => generateEventId());

  useEffect(() => {
    if (searchParams) setTrackingParams(extractUtmParams(searchParams));
  }, [searchParams]);

  const tracker = useTracker(product.product_trackers);

  const selectedBumpsList = useMemo(
    () => product.order_bumps.filter((b) => selectedBumps.has(b.id)),
    [product.order_bumps, selectedBumps]
  );

  const total = useMemo(
    () => product.price + selectedBumpsList.reduce((sum, b) => sum + b.price, 0),
    [product.price, selectedBumpsList]
  );

  const formValid =
    buyerInfo.name.trim() !== '' &&
    buyerInfo.email.trim() !== '' &&
    buyerInfo.phone.trim() !== '';

  const toggleBump = useCallback((bumpId: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(bumpId)) next.delete(bumpId); else next.add(bumpId);
      return next;
    });
  }, []);

  const handlePaymentStart = useCallback(() => {
    setPaymentStatus('processing');
    tracker.initiateCheckout({ product_name: product.name, value: total, currency: product.currency });
  }, [tracker, product, total]);

  const handlePaymentSuccess = useCallback((orderId: string) => {
    setPaymentStatus('success');
    tracker.purchase({ product_name: product.name, value: total, currency: product.currency, order_id: orderId, event_id: eventId });
  }, [tracker, product, total, eventId]);

  const handlePaymentFailure = useCallback((error: string) => {
    setPaymentStatus('failed');
    console.error('Payment failed:', error);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <EspyralHeader />
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="h-px bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--gold))] mb-12" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <EspyralProductPanel
            product={product}
            selectedBumps={selectedBumps}
            total={total}
            formValid={formValid}
            onToggleBump={toggleBump}
          />
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-sans tracking-[0.3em] uppercase text-muted-foreground mb-2">Secure Order</p>
              <h2 className="font-serif text-3xl text-foreground">Complete Your Purchase</h2>
            </div>
            {availableCurrencies.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-sans tracking-[0.15em] uppercase text-muted-foreground">Currency:</span>
                <div className="flex gap-2">
                  {availableCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setActiveCurrency(c.code)}
                      className={`px-4 py-2 text-xs font-sans tracking-wider border transition-colors ${
                        activeCurrency === c.code
                          ? 'border-foreground bg-foreground text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <EspyralBuyerForm value={buyerInfo} onChange={setBuyerInfo} />
            {paymentStatus === 'failed' && (
              <p className="text-sm font-sans text-red-700">Payment failed. Please try again.</p>
            )}
            <EspyralPaymentButton
              productId={product.id}
              offerId={offerId}
              slug={product.slug}
              currency={product.currency}
              total={total}
              disabled={!formValid || paymentStatus === 'processing'}
              buyerName={buyerInfo.name}
              buyerEmail={buyerInfo.email}
              buyerPhone={buyerInfo.phone}
              selectedBumpIds={Array.from(selectedBumps)}
              trackingParams={trackingParams as unknown as Record<string, unknown>}
              eventId={eventId}
              onPaymentStart={handlePaymentStart}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentFailure={handlePaymentFailure}
            />
            <div className="border-t border-border pt-6 space-y-2">
              {['Made in Italy · Europe', 'Free returns within 30 days', 'Encrypted secure checkout'].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0" />
                  <p className="font-sans text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--gold))] mt-16" />
      </main>
      <footer className="py-8 text-center">
        <p className="font-sans text-xs text-muted-foreground tracking-[0.15em]">© 2026 – ESPYRAL COUTURE</p>
      </footer>
    </div>
  );
}
