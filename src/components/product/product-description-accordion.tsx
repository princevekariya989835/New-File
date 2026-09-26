import React, { useState } from "react";
import { ChevronDown, ShieldCheck, Sparkles } from "lucide-react";

export function ProductDescriptionAccordion({
  description,
  detailsHtml,
}: {
  description?: string | null;
  detailsHtml?: string | null;
}) {
  const content = (detailsHtml || description || "").trim();
  const [isOpen, setIsOpen] = useState(true);

  if (!content) {
    return null;
  }

  // Parse formatted text into structured blocks (paragraphs, headings, bullet lists)
  const renderFormattedContent = (raw: string) => {
    const lines = raw.split("\n");
    const elements: React.ReactNode[] = [];
    let currentBulletList: string[] = [];

    const flushBulletList = (key: string) => {
      if (currentBulletList.length > 0) {
        elements.push(
          <ul key={key} className="my-3 space-y-2 pl-1">
            {currentBulletList.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                <span>{item}</span>
              </li>
            ))}
          </ul>,
        );
        currentBulletList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Heading (### ...)
      if (trimmed.startsWith("###")) {
        flushBulletList(`bullets-${index}`);
        const headingText = trimmed.replace(/^###\s*/, "");
        elements.push(
          <h4
            key={`h4-${index}`}
            className="mt-6 mb-2 text-sm sm:text-base font-bold uppercase tracking-wider text-foreground first:mt-0"
          >
            {headingText}
          </h4>,
        );
        return;
      }

      // Bullet item (• or - or *)
      if (
        trimmed.startsWith("•") ||
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ")
      ) {
        const bulletText = trimmed.replace(/^(•|-|\*)\s*/, "");
        currentBulletList.push(bulletText);
        return;
      }

      // Blank line
      if (!trimmed) {
        flushBulletList(`bullets-${index}`);
        return;
      }

      // Standard paragraph
      flushBulletList(`bullets-${index}`);
      elements.push(
        <p key={`p-${index}`} className="my-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {trimmed}
        </p>,
      );
    });

    flushBulletList("bullets-final");
    return elements;
  };

  return (
    <section className="mt-16 md:mt-24 border-t border-border pt-12 md:pt-16">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs transition-all shadow-xs">
        {/* Accordion Header / Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between p-5 sm:p-6 text-left transition-colors hover:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-col gap-1 pr-4">
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
              Product Description
            </h3>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              [Manufacture, Care and Fit]
            </span>
          </div>

          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground transition-transform duration-300 ${
              isOpen ? "rotate-180 bg-secondary" : ""
            }`}
          >
            <ChevronDown className="h-5 w-5" />
          </div>
        </button>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="border-t border-border/60 p-5 sm:p-7 animate-in fade-in-50 duration-200">
            <div className="max-w-3xl">
              {renderFormattedContent(content)}
            </div>

            {/* Quality and Authenticity Guarantee Tag */}
            <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-brand-red" />
                <span>100% Genuine RIOTOUS Guarantee</span>
              </div>
              <span className="hidden sm:inline text-border">•</span>
              <span>Rigid quality check before dispatch</span>
              <span className="hidden sm:inline text-border">•</span>
              <span>Pre-treated DTF street durability</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
