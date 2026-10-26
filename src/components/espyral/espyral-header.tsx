import type { CheckoutLanguage } from '@/lib/i18n/checkout-copy';

interface Props {
  language: CheckoutLanguage;
  onLanguageChange: (language: CheckoutLanguage) => void;
  copy: { language: string; english: string; portuguese: string; spanish: string; espyralAnnouncement: string };
}

export function EspyralHeader({ language, onLanguageChange, copy }: Props) {
  return (
    <>
      {/* Announcement bar */}
      <div className="bg-foreground py-2.5 text-center">
        <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-primary-foreground">
          {copy.espyralAnnouncement}
        </p>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-5 md:px-6">
          <div />
          <a href="/" className="text-center">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold tracking-[0.15em] text-foreground">ESPYRAL</h1>
            <p className="text-[9px] font-sans tracking-[0.35em] text-center text-muted-foreground uppercase -mt-0.5">Couture</p>
          </a>
          <label className="justify-self-end flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{copy.language}</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as CheckoutLanguage)}
              className="border border-border bg-background px-2 py-1 text-xs text-foreground"
              aria-label={copy.language}
            >
              <option value="en">{copy.english}</option>
              <option value="pt">{copy.portuguese}</option>
              <option value="es">{copy.spanish}</option>
            </select>
          </label>
        </div>
      </header>
    </>
  );
}
