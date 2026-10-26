'use client';
import { getCheckoutCopy, normalizeCheckoutLanguage, type CheckoutLanguage } from '@/lib/i18n/checkout-copy';

interface Props {
  productName: string;
  buyerEmail?: string;
  language?: CheckoutLanguage;
}

export function EspyralSuccessContent({ productName, buyerEmail, language = 'en' }: Props) {
  const copy = getCheckoutCopy(normalizeCheckoutLanguage(language));
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        {/* Gold rule top */}
        <div className="h-px w-16 bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold))] mx-auto mb-12" />

        <p className="text-[10px] font-sans tracking-[0.3em] uppercase text-muted-foreground mb-4">{copy.orderConfirmed}</p>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-6 leading-tight">
          {copy.thankYou}
        </h1>
        <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
          {copy.orderConfirmedText} <span className="text-foreground font-medium">{productName}</span>.
        </p>
        {buyerEmail && (
          <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-8">
            {copy.confirmationSent} <span className="text-foreground">{buyerEmail}</span>.
          </p>
        )}
        <a
          href="/"
          className="inline-block border border-foreground px-8 py-3 text-xs font-sans tracking-[0.25em] uppercase text-foreground hover:bg-foreground hover:text-primary-foreground transition-colors"
        >
          {copy.continueShopping}
        </a>

        {/* Gold rule bottom */}
        <div className="h-px w-16 bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold))] mx-auto mt-12" />
        <p className="font-sans text-xs text-muted-foreground mt-6 tracking-[0.15em]">ESPYRAL COUTURE</p>
      </div>
    </div>
  );
}
