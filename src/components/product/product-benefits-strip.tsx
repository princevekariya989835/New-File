import React from "react";
import {
  Shirt,
  Sparkles,
  Scissors,
  Droplets,
  Truck,
  Feather,
  Layers,
  ShieldCheck,
  Award,
  RefreshCw,
  Flame,
  CheckCircle2,
  Sun,
} from "lucide-react";
import type { ProductSpecification } from "@/lib/catalog";

export interface BenefitItem {
  icon: React.ElementType;
  title: string;
  description?: string;
}

/**
 * 4 Compact Benefit Icons in purchase panel (Above promotional offer)
 * Matches reference: Premium Cotton Fabric | High Quality DTF Print | Oversized Fit | Fast Shipping
 */
export function CompactProductBenefitIcons({
  category = "T-Shirts",
}: {
  category?: string;
}) {
  const catLower = (category || "").toLowerCase();
  const isHoodie = catLower.includes("hoodie") || catLower.includes("sweatshirt");

  const items = isHoodie
    ? [
        { icon: Feather, label: "Heavy 380 GSM" },
        { icon: Layers, label: "High Quality DTF" },
        { icon: Shirt, label: "Relaxed Boxy Fit" },
        { icon: Truck, label: "Fast Shipping" },
      ]
    : [
        { icon: Feather, label: "Premium Cotton Fabric" },
        { icon: Layers, label: "High Quality DTF Print" },
        { icon: Shirt, label: "Oversized Fit" },
        { icon: Truck, label: "Fast Shipping" },
      ];

  return (
    <div className="grid grid-cols-4 gap-2 py-3 border-y border-border/70 my-4 text-center">
      {items.map((it, idx) => {
        const Icon = it.icon;
        return (
          <div
            key={idx}
            className={`flex flex-col items-center justify-start gap-1.5 px-1 ${
              idx !== items.length - 1 ? "border-r border-border/60" : ""
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/60 text-foreground">
              <Icon className="h-4 w-4 stroke-[1.8]" />
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-semibold text-foreground/90 leading-tight">
              {it.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface ProductBenefitsStripProps {
  features?: string[] | any[];
  specifications?: ProductSpecification[];
  category?: string;
  productTitle?: string;
}

/**
 * Secondary Feature Strip below two-column layout
 * Matches reference: Soft & Breathable Cotton | Durable DTF Print | Oversized Streetwear Fit | Fade Resistant & Long Lasting
 */
export function ProductBenefitsStrip({
  features = [],
  specifications = [],
  category = "T-Shirts",
  productTitle = "",
}: ProductBenefitsStripProps) {
  const catLower = (category || "").toLowerCase();
  const isHoodie = catLower.includes("hoodie") || catLower.includes("sweatshirt");

  const defaultItems = isHoodie
    ? [
        { icon: Feather, title: "Warm & Cozy Fleece", description: "380 GSM dense brushed cotton" },
        { icon: Layers, title: "Durable DTF Print", description: "Vibrant & crack-resistant" },
        { icon: Shirt, title: "Boxy Streetwear Fit", description: "Dropped shoulders & lined hood" },
        { icon: Sun, title: "Fade Resistant & Long Lasting", description: "Color-locked pigment dyes" },
      ]
    : [
        { icon: Feather, title: "Soft & Breathable Cotton", description: "100% Super Combed 240 GSM" },
        { icon: Layers, title: "Durable DTF Print", description: "High-density crack-proof graphics" },
        { icon: Shirt, title: "Oversized Streetwear Fit", description: "Signature relaxed boxy cut" },
        { icon: Sun, title: "Fade Resistant & Long Lasting", description: "Biowashed & color-locked" },
      ];

  // If admin provided custom features, adapt them
  let items = defaultItems;
  if (Array.isArray(features) && features.length >= 4) {
    items = features.slice(0, 4).map((f, i) => {
      const label = typeof f === "string" ? f : f.title || "";
      return {
        icon: defaultItems[i]?.icon || Award,
        title: label,
        description: typeof f === "object" ? f.description : "",
      };
    });
  }

  return (
    <section
      aria-label="Product Features and Benefits"
      className="mt-10 sm:mt-14 mb-8 border-y border-border/70 bg-card py-6"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3.5 pt-3 md:pt-0 ${
                  idx > 0 ? "md:pl-6" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-foreground border border-border/40">
                  <Icon className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
