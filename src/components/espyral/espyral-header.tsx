export function EspyralHeader() {
  return (
    <>
      {/* Announcement bar */}
      <div className="bg-foreground py-2.5 text-center">
        <p className="text-xs font-sans font-medium tracking-[0.25em] uppercase text-primary-foreground">
          Limited Seasonal Selection
        </p>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-center px-6 py-5">
          <a href="/" className="text-center">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold tracking-[0.15em] text-foreground">ESPYRAL</h1>
            <p className="text-[9px] font-sans tracking-[0.35em] text-center text-muted-foreground uppercase -mt-0.5">Couture</p>
          </a>
        </div>
      </header>
    </>
  );
}
