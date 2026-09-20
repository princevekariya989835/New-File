import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Truck,
  RotateCcw,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Heart,
  CheckCircle2,
  Zap,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Flame,
  Layers,
  Eye,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { BrandName } from "@/components/brand-name";
import { ProductCard } from "@/components/product-card";
import { EmptyProducts } from "@/components/empty-products";
import type { CatalogProduct } from "@/lib/catalog";
import type { WebsiteConfig, WebsiteSectionType } from "@/lib/website-config.types";
import { ImageStreamHero, type StreamImage } from "@/components/ui/image-stream-hero";
import { HeroOrbit } from "@/components/hero-orbit";

interface WebsiteHomepageContentProps {
  config: WebsiteConfig;
  products: CatalogProduct[];
  isPreview?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Truck,
  RotateCcw,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Heart,
  CheckCircle2,
  Zap,
};

export function WebsiteHomepageContent({
  config,
  products,
  isPreview = false,
}: WebsiteHomepageContentProps) {
  const {
    hero,
    collections,
    featuredProducts,
    whyUs,
    promoBanner,
    reviewsSection,
    sectionOrder,
    announcement,
  } = config;

  // Filter products if custom featured list is provided
  const displayedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    if (featuredProducts.productIds && featuredProducts.productIds.length > 0) {
      const selected = products.filter(
        (p) =>
          featuredProducts.productIds.includes(p.node.id) ||
          featuredProducts.productIds.includes(p.node.productId) ||
          featuredProducts.productIds.includes(p.node.handle),
      );
      if (selected.length > 0) return selected.slice(0, featuredProducts.limit || 8);
    }
    return products.slice(0, featuredProducts.limit || 8);
  }, [products, featuredProducts]);

  // Section order
  const activeSections = useMemo(() => {
    if (!sectionOrder?.sections || sectionOrder.sections.length === 0) {
      return [
        { id: "announcement" as WebsiteSectionType, enabled: true },
        { id: "hero" as WebsiteSectionType, enabled: true },
        { id: "collections" as WebsiteSectionType, enabled: true },
        { id: "featuredProducts" as WebsiteSectionType, enabled: true },
        { id: "whyUs" as WebsiteSectionType, enabled: true },
        { id: "promoBanner" as WebsiteSectionType, enabled: true },
        { id: "reviews" as WebsiteSectionType, enabled: true },
      ];
    }
    return sectionOrder.sections.filter((s) => s.enabled);
  }, [sectionOrder]);

  return (
    <div className="flex flex-col w-full">
      {activeSections.map((sec) => {
        switch (sec.id) {
          case "announcement": {
            return null;
          }

          case "hero": {
            return <WebsiteHero key="sec-hero" hero={hero} isPreview={isPreview} />;
          }

          case "collections": {
            const enabledCollections = (collections || []).filter((c) => c.enabled !== false);
            if (enabledCollections.length === 0) return null;

            return (
              <section
                key="sec-collections"
                className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32"
              >
                <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                      Collections
                    </p>
                    <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
                      Shop the drop.
                    </h2>
                  </div>
                  <a
                    href="/shop"
                    className="group inline-flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-foreground"
                  >
                    View all
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                  {enabledCollections.map((c) => (
                    <a
                      key={c.id}
                      href={c.link || "/shop"}
                      className={`group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl ${
                        c.bgColor || "bg-brand-red"
                      } p-5 text-white md:p-6 transition-transform hover:scale-[1.01]`}
                    >
                      {c.imageUrl && (
                        <img
                          src={c.imageUrl}
                          alt={c.title}
                          width={320}
                          height={427}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <span className="relative z-10 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                        {c.tag}
                      </span>
                      <div className="relative z-10">
                        <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                          {c.title}
                        </h3>
                        <ArrowUpRight className="mt-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          }

          case "featuredProducts": {
            if (!featuredProducts?.enabled) return null;

            return (
              <section
                key="sec-featured"
                className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24"
              >
                <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
                      {featuredProducts.title || "Featured."}
                    </h2>
                    {featuredProducts.subtitle && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {featuredProducts.subtitle}
                      </p>
                    )}
                  </div>
                  <a
                    href="/shop"
                    className="group inline-flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-foreground"
                  >
                    All products
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>

                {displayedProducts.length === 0 ? (
                  <EmptyProducts />
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
                    {displayedProducts.map((p) => (
                      <ProductCard key={p.node.id} product={p} priority={false} />
                    ))}
                  </div>
                )}
              </section>
            );
          }

          case "whyUs": {
            if (!whyUs?.items || whyUs.items.length === 0) return null;

            return (
              <section key="sec-whyus" className="bg-secondary py-24 md:py-32">
                <div className="mx-auto max-w-[1400px] px-6 md:px-10">
                  <div className="mb-16 max-w-3xl">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                      {whyUs.badge || "Why RIOTOUS"}
                    </p>
                    <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
                      {whyUs.title || "Built for the ones who create."}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {whyUs.items.map((f) => {
                      const IconComp = ICON_MAP[f.iconName] || Sparkles;
                      return (
                        <div key={f.id} className="group">
                          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-background transition-colors group-hover:bg-brand-red group-hover:text-white">
                            <IconComp className="h-5 w-5" />
                          </div>
                          <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                          <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          }

          case "promoBanner": {
            if (!promoBanner?.enabled || promoBanner.status === "disabled") return null;

            return (
              <section
                key="sec-promo"
                className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32"
              >
                <div className="relative overflow-hidden rounded-3xl bg-brand-red p-10 text-background md:p-20">
                  <div className="metallic-shine absolute inset-0 opacity-30" />
                  <div className="relative max-w-2xl">
                    {promoBanner.badge && (
                      <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-background/60">
                        {promoBanner.badge}
                      </p>
                    )}
                    <h2 className="text-4xl font-semibold tracking-tight md:text-6xl whitespace-pre-line">
                      {promoBanner.title}
                    </h2>
                    {promoBanner.description && (
                      <p className="mt-6 max-w-lg text-background/70">{promoBanner.description}</p>
                    )}
                    {promoBanner.buttonText && (
                      <a
                        href={promoBanner.buttonLink || "/design"}
                        className="group mt-10 inline-flex items-center gap-2 rounded-full bg-background px-7 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.02]"
                      >
                        {promoBanner.buttonText}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          case "reviews": {
            if (!reviewsSection?.enabled) return null;

            return (
              <section
                key="sec-reviews"
                className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10 md:pb-32"
              >
                <div className="mb-12 max-w-2xl">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                    {reviewsSection.badge || "Reviews"}
                  </p>
                  <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                    {reviewsSection.title || "Straight from the community."}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-border bg-background p-8">
                      <div className="flex gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <span key={s} className="text-lg">
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-sm text-foreground/90 font-medium">
                        {i === 0
                          ? "“The quality of the DTF print on the oversized tee exceeded my expectations. Vibrant and doesn't crack!”"
                          : i === 1
                            ? "“Best custom apparel studio in India. The design canvas makes ordering effortless.”"
                            : "“Heavyweight fabric, fast dispatch, and signature box packaging. Will order again.”"}
                      </p>
                      <p className="mt-4 text-xs text-muted-foreground uppercase tracking-wider">
                        {i === 0
                          ? "Aryan S. · Verified Buyer"
                          : i === 1
                            ? "Sneha P. · Streetwear Creator"
                            : "Dev K. · Verified Buyer"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

export const TEE_STREAM_IMAGES: StreamImage[] = [
  {
    src: "/products/zoro-black-1.jpg",
    alt: "RIOTOUS Oni Zoro Archive Oversized T-Shirt - Front Chest",
    title: "Oni Zoro Black",
  },
  {
    src: "/products/zoro-black-2.jpg",
    alt: "RIOTOUS Oni Zoro Archive Oversized T-Shirt - Back Graphic",
    title: "Oni Zoro Back Graphic",
  },
  {
    src: "/products/zenitsu-maroon-1.jpg",
    alt: "RIOTOUS Thunder Breath Maroon Oversized T-Shirt - Front",
    title: "Thunder Breath Maroon",
  },
  {
    src: "/products/zenitsu-maroon-2.jpg",
    alt: "RIOTOUS Thunder Breath Maroon Oversized T-Shirt - Back Graphic",
    title: "Thunder Breath Graphic",
  },
  {
    src: "/products/zoro-olive-1.jpg",
    alt: "RIOTOUS Katana Ronin Olive Oversized T-Shirt - Front",
    title: "Katana Ronin Olive",
  },
  {
    src: "/products/zoro-olive-2.jpg",
    alt: "RIOTOUS Katana Ronin Olive Oversized T-Shirt - Back Graphic",
    title: "Katana Ronin Graphic",
  },
  {
    src: "/assets/tee-black-front.webp",
    alt: "RIOTOUS Heavyweight 240 GSM Combed Cotton Black Tee - Front",
    title: "240 GSM Heavyweight Black",
  },
  {
    src: "/assets/tee-black-back.webp",
    alt: "RIOTOUS Heavyweight 240 GSM DTF Print Black Tee - Back",
    title: "HD DTF 12-Pass Print",
  },
  {
    src: "/assets/tee-maroon-front.webp",
    alt: "RIOTOUS Boxy Fit Drop Shoulder Maroon Tee - Front",
    title: "Boxy Drop Shoulder",
  },
  {
    src: "/assets/tee-maroon-back.webp",
    alt: "RIOTOUS Boxy Fit Drop Shoulder Maroon Tee - Back",
    title: "Archival DTF Back Canvas",
  },
  {
    src: "/assets/tee-olive-front.webp",
    alt: "RIOTOUS Streetwear Olive Green Tee - Front",
    title: "Tactical Ronin Green",
  },
  {
    src: "/assets/tee-olive-back.webp",
    alt: "RIOTOUS Streetwear Olive Green Tee - Back",
    title: "Pocket Katana Print",
  },
];

function WebsiteHero({ hero }: { hero: WebsiteConfig["hero"]; isPreview: boolean }) {
  if (!hero || (hero.enabled === false && hero.active === false)) return null;

  const eyebrow = "NEW COLLECTION 2026";
  const primaryCta = hero.primaryCtaText || "SHOP COLLECTION";
  const primaryLink = hero.primaryCtaLink || "/shop";
  const descriptionText =
    hero.description ||
    hero.subheading ||
    "Premium streetwear designed for people who refuse to blend in.";

  return (
    <section
      key="sec-hero"
      aria-label="RIOTOUS Streetwear 3D Image Stream Corridor Hero"
      className="relative w-full border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors duration-300 select-none bg-[#FAF9F6] dark:bg-[#0c0c0e]"
    >
      <ImageStreamHero
        images={TEE_STREAM_IMAGES}
        cards={9}
        speed={18}
        axis={52}
        className="w-full min-h-[580px] sm:min-h-[640px] lg:min-h-[720px] flex items-center justify-center overflow-hidden"
      >
        {/* Soft Radial Vignette for contrast so text stands out cleanly while t-shirt rails stream forward */}
        <div
          className="pointer-events-none absolute inset-0 bg-radial from-transparent via-[#FAF9F6]/50 to-[#FAF9F6] dark:via-[#0c0c0e]/50 dark:to-[#0c0c0e] opacity-95"
          aria-hidden="true"
        />

        {/* Central Brand Headline & Call to Action */}
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-14 sm:py-20 flex flex-col items-center text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2.5 mb-5 sm:mb-6 px-4 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
            <span className="text-xs sm:text-[13px] font-mono font-bold tracking-[0.25em] text-neutral-700 dark:text-neutral-300 uppercase">
              {eyebrow}
            </span>
          </div>

          {/* Large Bold Editorial Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[84px] xl:text-[96px] font-black tracking-[-0.04em] leading-[0.92] text-neutral-950 dark:text-white uppercase mb-6 drop-shadow-xs max-w-4xl">
            <span className="block sm:inline">WEAR YOUR </span>
            <span className="block sm:inline text-brand-red">ATTITUDE.</span>
          </h1>

          {/* Editorial Description */}
          <p className="text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-300 font-normal leading-relaxed max-w-xl mb-8 sm:mb-10 text-balance">
            {descriptionText}
          </p>

          {/* Dual Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to={primaryLink}
              aria-label="Shop Collection - Browse RIOTOUS Streetwear"
              className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-brand-red px-8 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/25 transition-all duration-200 hover:bg-[#d4080e] hover:shadow-xl hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              <span>{primaryCta}</span>
              <span className="text-base transition-transform duration-200 group-hover:translate-x-1.5">
                →
              </span>
            </Link>

            <Link
              to="/design"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-300 dark:border-neutral-700 px-7 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900 dark:text-white shadow-xs transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>CUSTOMIZE IN 3D</span>
            </Link>
          </div>

          {/* Micro Proof Stamp */}
          <div className="mt-10 sm:mt-12 flex items-center gap-3 text-[11px] font-mono tracking-widest text-neutral-500 dark:text-neutral-400 uppercase pointer-events-none">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-red" />
            <span>240 GSM COMBED COTTON · 100% ARCHIVAL DTF PRINT</span>
          </div>
        </div>
      </ImageStreamHero>
    </section>
  );
}

