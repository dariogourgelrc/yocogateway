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
import { getCheckoutCopy, normalizeCheckoutLanguage, type CheckoutLanguage } from '@/lib/i18n/checkout-copy';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { parseCheckoutAmount } from '@/lib/utils/checkout-amount';
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
  const [language, setLanguage] = useState<CheckoutLanguage>(
    normalizeCheckoutLanguage(searchParams?.get('lang') || initialProduct.checkout_language)
  );
  const copy = getCheckoutCopy(language);

  const [activeCurrency, setActiveCurrency] = useState(initialProduct.currency);

  const activePrice = offerId
    ? initialProduct.price
    : (initialProduct.regional_pricing?.[activeCurrency] ?? initialProduct.price);
  const flexiblePricing = initialProduct.pay_what_you_want && !offerId;
  const amountParam = searchParams?.get('amount');
  const amountFromUrl = parseCheckoutAmount(amountParam);
  const customPriceIsValid = amountFromUrl !== null;
  const customPriceInCents = amountFromUrl ?? 0;
  const amountIsBelowMinimum = amountParam !== null && /^\d+(?:\.\d{1,2})?$/.test(amountParam)
    && Number.isFinite(Number(amountParam))
    && Math.round(Number(amountParam) * 100) < 200;

  const product = useMemo(
    () => ({
      ...initialProduct,
      price: flexiblePricing ? customPriceInCents : activePrice,
      currency: activeCurrency,
    }),
    [initialProduct, activePrice, activeCurrency, flexiblePricing, customPriceInCents]
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
    buyerInfo.phone.trim() !== '' &&
    (!flexiblePricing || customPriceIsValid);

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
    <div lang={language} className="min-h-screen bg-background">
      <EspyralHeader language={language} onLanguageChange={setLanguage} copy={copy} />
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="h-px bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--gold))] mb-12" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <EspyralProductPanel
            product={product}
            selectedBumps={selectedBumps}
            total={total}
            formValid={formValid}
            showPrices={!flexiblePricing || customPriceIsValid}
            language={language}
            onToggleBump={toggleBump}
          />
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-sans tracking-[0.3em] uppercase text-muted-foreground mb-2">{copy.secureOrder}</p>
              <h2 className="font-serif text-3xl text-foreground">{copy.completeYourPurchase}</h2>
            </div>
            {availableCurrencies.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-sans tracking-[0.15em] uppercase text-muted-foreground">{copy.currency}</span>
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
            {flexiblePricing && (
              <div>
                {amountFromUrl !== null ? (
                  <p className="font-sans text-sm font-medium text-foreground">
                    {getCurrencySymbol(activeCurrency)} {(amountFromUrl / 100).toFixed(2)}
                  </p>
                ) : (
                  <p className="font-sans text-sm text-red-700">
                    {amountIsBelowMinimum ? copy.belowMinimum : amountParam ? copy.invalidPrice : copy.amountRequired}
                  </p>
                )}
              </div>
            )}
            <EspyralBuyerForm value={buyerInfo} onChange={setBuyerInfo} language={language} />
            {paymentStatus === 'failed' && (
              <p className="text-sm font-sans text-red-700">{copy.paymentFailed}</p>
            )}
            <EspyralPaymentButton
              productId={product.id}
              offerId={offerId}
              slug={product.slug}
              currency={product.currency}
              total={total}
              language={language}
              customPrice={flexiblePricing ? customPriceInCents : undefined}
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
              {[copy.madeInItaly, copy.freeReturns, copy.encryptedCheckout].map((text) => (
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
