import React, { useState } from "react";
import { ChevronDown, ShieldCheck, Sparkles, Shirt, Factory, HeartHandshake, CheckCircle2 } from "lucide-react";
import type { ManufacturingInfo } from "@/lib/catalog";

interface ProductDescriptionAccordionProps {
  description?: string | null;
  detailsHtml?: string | null;
  features?: string[];
  careInstructions?: string[];
  manufacturingInfo?: ManufacturingInfo | null;
}

export function ProductDescriptionAccordion({
  description,
  detailsHtml,
  features = [],
  careInstructions = [],
  manufacturingInfo,
}: ProductDescriptionAccordionProps) {
  const content = (detailsHtml || description || "").trim();
  const [isOpen, setIsOpen] = useState(true);

  const activeFeatures = (features || []).filter(Boolean);
  const activeCare = (careInstructions || []).filter(Boolean);
  const hasMfg =
    manufacturingInfo &&
    (manufacturingInfo.country_of_origin ||
      manufacturingInfo.manufacturer ||
      manufacturingInfo.marketed_by ||
      manufacturingInfo.customer_care);

  const hasAnyContent = content || activeFeatures.length > 0 || activeCare.length > 0 || hasMfg;

  if (!hasAnyContent) {
    return null;
  }

  // Helper to parse inline bold text (**text**)
  const renderInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

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
                <span>{renderInlineText(item)}</span>
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
            {renderInlineText(headingText)}
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
          {renderInlineText(trimmed)}
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
          <div className="border-t border-border/60 p-5 sm:p-7 space-y-8 animate-in fade-in-50 duration-200">
            {/* Main Text Content */}
            {content && (
              <div className="max-w-3xl">
                {renderFormattedContent(content)}
              </div>
            )}

            {/* KEY FEATURES (Dynamic per product) */}
            {activeFeatures.length > 0 && (
              <div className="border-t border-border/60 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-brand-red" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Key Features
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs sm:text-sm text-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-red mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARE INFORMATION (Dynamic per product) */}
            {activeCare.length > 0 && (
              <div className="border-t border-border/60 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shirt className="h-4 w-4 text-brand-red" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Care Instructions
                  </h4>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeCare.map((instruction, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-secondary/20 p-3 text-xs sm:text-sm text-muted-foreground"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* MANUFACTURING INFORMATION (Dynamic per product) */}
            {hasMfg && (
              <div className="border-t border-border/60 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Factory className="h-4 w-4 text-brand-red" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Manufacturing & Compliance
                  </h4>
                  {manufacturingInfo?.country_of_origin?.toLowerCase() === "india" && (
                    <span className="ml-2 rounded-full border border-brand-red/30 bg-brand-red/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-red">
                      Made in India
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                  {manufacturingInfo?.country_of_origin && (
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Country of Origin
                      </span>
                      <span className="font-semibold text-foreground">
                        {manufacturingInfo.country_of_origin}
                      </span>
                    </div>
                  )}

                  {manufacturingInfo?.manufacturer && (
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Manufacturer
                      </span>
                      <span className="text-muted-foreground leading-relaxed">
                        {manufacturingInfo.manufacturer}
                      </span>
                    </div>
                  )}

                  {manufacturingInfo?.marketed_by && (
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Marketed By
                      </span>
                      <span className="text-muted-foreground leading-relaxed">
                        {manufacturingInfo.marketed_by}
                      </span>
                    </div>
                  )}

                  {manufacturingInfo?.customer_care && (
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Customer Care
                      </span>
                      <span className="text-muted-foreground leading-relaxed">
                        {manufacturingInfo.customer_care}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quality and Authenticity Guarantee Tag */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-brand-red" />
                <span>100% Genuine RIOTOUS Streetwear</span>
              </div>
              <span className="hidden sm:inline text-border">•</span>
              <span>Rigid quality check before dispatch</span>
              <span className="hidden sm:inline text-border">•</span>
              <span>Long-lasting durable print & fabric</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
