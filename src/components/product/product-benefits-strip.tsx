import React from "react";
import {
  Shirt,
  Sparkles,
  Scissors,
  Droplets,
  Truck,
  ShieldCheck,
  Award,
  RefreshCw,
  Flame,
  CheckCircle2,
} from "lucide-react";
import type { ProductSpecification } from "@/lib/catalog";

export interface BenefitItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

export interface ProductBenefitsStripProps {
  features?: string[] | any[];
  specifications?: ProductSpecification[];
  category?: string;
  productTitle?: string;
}

function resolveIcon(iconNameOrKeyword: string): React.ElementType {
  const k = (iconNameOrKeyword || "").toLowerCase();
  if (k.includes("cotton") || k.includes("fabric") || k.includes("material") || k.includes("shirt"))
    return Shirt;
  if (k.includes("dtf") || k.includes("print") || k.includes("graphic") || k.includes("sparkle"))
    return Sparkles;
  if (k.includes("fit") || k.includes("silhouette") || k.includes("cut") || k.includes("scissor"))
    return Scissors;
  if (k.includes("wash") || k.includes("shrink") || k.includes("water") || k.includes("drop"))
    return Droplets;
  if (k.includes("deliver") || k.includes("ship") || k.includes("dispatch") || k.includes("truck"))
    return Truck;
  if (k.includes("stitch") || k.includes("durable") || k.includes("shield") || k.includes("quality"))
    return ShieldCheck;
  if (k.includes("return") || k.includes("exchange") || k.includes("refresh"))
    return RefreshCw;
  if (k.includes("flame") || k.includes("drop") || k.includes("hot"))
    return Flame;
  return Award;
}

export function ProductBenefitsStrip({
  features = [],
  specifications = [],
  category = "T-Shirts",
  productTitle = "",
}: ProductBenefitsStripProps) {
  const catLower = (category || "").toLowerCase();
  const specFabric = specifications.find(
    (s) => s.label.toLowerCase() === "fabric" || s.label.toLowerCase() === "material",
  )?.value;
  const specGsm = specifications.find((s) => s.label.toLowerCase() === "gsm")?.value;
  const specFit = specifications.find((s) => s.label.toLowerCase() === "fit")?.value;

  // Resolve 5 benefits: prioritize admin-configured features if provided
  let items: BenefitItem[] = [];

  if (Array.isArray(features) && features.length >= 3) {
    items = features.slice(0, 5).map((f) => {
      if (typeof f === "object" && f !== null) {
        return {
          icon: resolveIcon(f.icon || f.title || ""),
          title: f.title || "Premium Feature",
          description: f.description || "",
        };
      }
      const str = String(f).trim();
      if (str.includes(":") || str.includes(" - ")) {
        const parts = str.includes(":") ? str.split(":") : str.split(" - ");
        return {
          icon: resolveIcon(parts[0]),
          title: parts[0].trim(),
          description: parts.slice(1).join(" - ").trim(),
        };
      }
      return {
        icon: resolveIcon(str),
        title: str,
        description: "",
      };
    });
  } else if (catLower.includes("hoodie") || catLower.includes("sweatshirt") || catLower.includes("fleece")) {
    items = [
      {
        icon: Shirt,
        title: specFabric ? specFabric : "380 GSM Heavy Fleece",
        description: specGsm ? `${specGsm} dense brushed fabric` : "Ultra-warm brushed interior",
      },
      {
        icon: Sparkles,
        title: "High-Density DTF Print",
        description: "Vibrant & crack-resistant",
      },
      {
        icon: Scissors,
        title: specFit ? specFit : "Streetwear Boxy Fit",
        description: "Double-layered hood & deep pockets",
      },
      {
        icon: ShieldCheck,
        title: "Reinforced Seams",
        description: "Built for heavy rotation",
      },
      {
        icon: Truck,
        title: "Free Express Shipping",
        description: "Dispatched in 24-48 hrs",
      },
    ];
  } else if (catLower.includes("tee") || catLower.includes("shirt") || catLower.includes("apparel") || !catLower) {
    // Standard and Oversized T-Shirts (Matching Satoru Gojo Reference)
    items = [
      {
        icon: Shirt,
        title: specFabric ? specFabric : "100% Pure Cotton",
        description: specGsm ? `${specGsm} heavyweight knit` : "240 GSM super combed cotton",
      },
      {
        icon: Sparkles,
        title: "High-Definition DTF",
        description: "Vivid, stretchable & fade-proof",
      },
      {
        icon: Scissors,
        title: specFit ? specFit : "Oversized Streetwear Fit",
        description: "Drop shoulder boxy silhouette",
      },
      {
        icon: Droplets,
        title: "Pre-Shrunk & Bio-Washed",
        description: "Zero post-wash shrinkage",
      },
      {
        icon: Truck,
        title: "Free Pan-India Delivery",
        description: "Orders over ₹1499",
      },
    ];
  } else {
    // Accessories / Other categories
    items = [
      {
        icon: Award,
        title: "Premium Craftsmanship",
        description: "Engineered with durable materials",
      },
      {
        icon: ShieldCheck,
        title: "100% Genuine Quality",
        description: "Direct from RIOTOUS studio",
      },
      {
        icon: RefreshCw,
        title: "7-Day Easy Returns",
        description: "Hassle-free exchange policy",
      },
      {
        icon: Truck,
        title: "Express Delivery",
        description: "5-7 business days across India",
      },
    ];
  }

  return (
    <section
      aria-label="Product Features and Benefits"
      className="mt-12 sm:mt-16 md:mt-20 border-y border-border/80 bg-secondary/20 py-8 md:py-10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-6">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`flex flex-col items-start gap-2.5 rounded-2xl border border-border/60 bg-card/80 p-4 transition-all duration-200 hover:border-foreground/30 hover:shadow-2xs ${
                  idx === items.length - 1 && items.length % 2 !== 0
                    ? "col-span-2 md:col-span-1"
                    : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red border border-brand-red/15">
                  <Icon className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground leading-normal">
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
