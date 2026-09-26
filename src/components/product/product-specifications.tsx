import React from "react";
import type { ProductSpecification } from "@/lib/catalog";

export function ProductSpecifications({
  specifications,
}: {
  specifications?: ProductSpecification[];
}) {
  // Only display active specifications, ordered by displayOrder
  const activeSpecs = (specifications || [])
    .filter((s) => s.isActive !== false && s.label && s.value)
    .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));

  if (activeSpecs.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 md:mt-24 border-t border-border pt-12 md:pt-16">
      <div className="mb-8 md:mb-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-red mb-2">
          Technical Details
        </p>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          Product Specifications
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/40 backdrop-blur-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Split into left and right columns on desktop */}
          <div className="divide-y divide-border/60">
            {activeSpecs
              .filter((_, idx) => idx % 2 === 0)
              .map((spec) => (
                <div key={spec.id || spec.label} className="p-4 sm:p-5 flex flex-col justify-center">
                  <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {spec.label}
                  </span>
                  <span className="mt-1 text-sm md:text-base font-semibold text-foreground tracking-tight break-words">
                    {spec.value}
                  </span>
                </div>
              ))}
          </div>

          <div className="divide-y divide-border/60">
            {activeSpecs
              .filter((_, idx) => idx % 2 !== 0)
              .map((spec) => (
                <div key={spec.id || spec.label} className="p-4 sm:p-5 flex flex-col justify-center">
                  <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {spec.label}
                  </span>
                  <span className="mt-1 text-sm md:text-base font-semibold text-foreground tracking-tight break-words">
                    {spec.value}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
