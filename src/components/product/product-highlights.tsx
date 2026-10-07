import React from "react";
import type { ProductHighlight } from "@/lib/catalog";

export function ProductHighlights({
  highlights,
  productTitle,
}: {
  highlights?: ProductHighlight[];
  productTitle?: string;
}) {
  // Only display active highlights, ordered by displayOrder
  const activeHighlights = (highlights || [])
    .filter((h) => h.isActive !== false && h.imageUrl)
    .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));

  if (activeHighlights.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 md:mt-24 border-t border-border pt-12 md:pt-16">
      <div className="mb-8 md:mb-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-red mb-2">
          Engineered Details
        </p>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          Key Highlights
        </h2>
      </div>

      <div
        className={`grid gap-6 md:gap-8 ${
          activeHighlights.length === 1
            ? "max-w-2xl mx-auto grid-cols-1"
            : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {activeHighlights.map((hl, idx) => (
          <article
            key={hl.id || `hl-${idx}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs transition-all duration-300 hover:border-foreground/30 hover:shadow-md"
          >
            {/* Image Container with preserved aspect ratio */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/40">
              <img
                src={hl.imageUrl}
                alt={hl.title || `${productTitle || "Product"} highlight ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-tee.jpg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
            </div>

            {/* Content info if title or description exists */}
            {(hl.title || hl.description) && (
              <div className="flex flex-1 flex-col p-5 md:p-6">
                {hl.title && (
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-foreground">
                    {hl.title}
                  </h3>
                )}
                {hl.description && (
                  <p className="mt-2 text-xs md:text-sm leading-relaxed text-muted-foreground">
                    {hl.description}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
