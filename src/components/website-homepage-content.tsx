import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
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
import { ShopSkeleton } from "@/components/shop/shop-skeleton";
import type { CatalogProduct } from "@/lib/catalog";
import type { WebsiteConfig, WebsiteSectionType } from "@/lib/website-config.types";
import { StreetwearHero } from "@/components/ui/streetwear-hero";
import { ImageStreamHero, type StreamImage } from "@/components/ui/image-stream-hero";

interface WebsiteHomepageContentProps {
  config: WebsiteConfig;
  products: CatalogProduct[];
  isLoadingProducts?: boolean;
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

function FeaturedProductsSection({
  featuredProducts,
  displayedProducts,
  isLoadingProducts,
}: {
  featuredProducts: WebsiteConfig["featuredProducts"];
  displayedProducts: CatalogProduct[];
  isLoadingProducts: boolean;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScroll, displayedProducts]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  const count = displayedProducts.length;

  return (
    <section
      key="sec-featured"
      className="mx-auto w-full max-w-[1400px] px-6 py-16 md:px-10 md:py-24"
    >
      {/* Standardized 3-tier section header: label, heading + controls, description (Issue 3, 5) */}
      <div className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Curated Drops
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl leading-none">
            {featuredProducts.title || "Featured."}
          </h2>
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="/shop"
              className="group inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs sm:text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:border-foreground/30 active:scale-98"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            {count > 4 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scroll("left")}
                  disabled={!canScrollLeft}
                  aria-label="Previous products"
                  className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll("right")}
                  disabled={!canScrollRight}
                  aria-label="Next products"
                  className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        {featuredProducts.subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">
            {featuredProducts.subtitle}
          </p>
        )}
      </div>

      {isLoadingProducts ? (
        <ShopSkeleton count={featuredProducts.limit || 8} />
      ) : count === 0 ? (
        <EmptyProducts />
      ) : count <= 4 ? (
        <div
          className={`grid gap-x-4 gap-y-10 md:gap-x-6 ${
            count === 1
              ? "grid-cols-1 max-w-sm"
              : count === 2
                ? "grid-cols-2 max-w-2xl"
                : count === 3
                  ? "grid-cols-2 md:grid-cols-3"
                  : "grid-cols-2 md:grid-cols-4"
          }`}
        >
          {displayedProducts.map((p) => (
            <ProductCard key={p.node.id} product={p} priority={false} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6 md:-mx-10 md:px-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {displayedProducts.map((p) => (
            <div
              key={p.node.id}
              className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)] shrink-0 snap-start"
            >
              <ProductCard product={p} priority={false} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function WebsiteHomepageContent({
  config,
  products,
  isLoadingProducts = false,
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
            return <StreetwearHero key="sec-hero" hero={hero} isPreview={isPreview} />;
          }

          case "collections": {
            const enabledCollections = (collections || []).filter((c) => c.enabled !== false);
            if (enabledCollections.length === 0) return null;

            const fallbackImgs = [
              "/products/zoro-black-1.jpg",
              "/assets/hero-model.jpg",
              "/products/zoro-olive-1.jpg",
              "/products/zenitsu-maroon-1.jpg",
            ];

            return (
              <section
                key="sec-collections"
                className="mx-auto w-full max-w-[1400px] px-6 py-16 md:px-10 md:py-24"
              >
                {/* Standardized 3-tier section header: label, heading + View All, description (Issue 2, 3) */}
                <div className="mb-8 md:mb-10">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Collections
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-3xl font-bold tracking-tight md:text-5xl leading-none">
                      Shop the drop.
                    </h2>
                    <a
                      href="/shop"
                      className="group inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs sm:text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:border-foreground/30 active:scale-98"
                    >
                      <span>View All</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Signature silhouettes and limited-run graphic capsules.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                  {enabledCollections.map((c, idx) => {
                    const imgUrl = c.imageUrl || fallbackImgs[idx % fallbackImgs.length];
                    return (
                      <a
                        key={c.id}
                        href={c.link || "/shop"}
                        className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 p-5 text-white md:p-6 transition-transform hover:scale-[1.01]"
                      >
                        {imgUrl && (
                          <img
                            src={imgUrl}
                            alt={c.title}
                            width={360}
                            height={480}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                        
                        {/* Grouped sub-label & title at bottom with small cohesive gap (Issue 7) and sentence/title case (Issue 4) */}
                        <div className="relative z-10 flex flex-col items-start gap-1">
                          <span className="text-xs font-semibold tracking-wide text-white/80">
                            {c.tag}
                          </span>
                          <div className="flex w-full items-center justify-between gap-2">
                            <h3 className="text-base font-semibold tracking-tight md:text-xl">
                              {c.title}
                            </h3>
                            <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          }

          case "featuredProducts": {
            if (!featuredProducts?.enabled) return null;

            return (
              <FeaturedProductsSection
                key="sec-featured"
                featuredProducts={featuredProducts}
                displayedProducts={displayedProducts}
                isLoadingProducts={isLoadingProducts}
              />
            );
          }

          case "whyUs": {
            if (!whyUs?.items || whyUs.items.length === 0) return null;

            return (
              <section key="sec-whyus" className="bg-secondary py-16 md:py-20">
                <div className="mx-auto max-w-[1400px] px-6 md:px-10">
                  {/* Standardized 3-tier section header: label, heading, description (Issue 3) */}
                  <div className="mb-8 sm:mb-10 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      {whyUs.badge || "Why RIOTOUS"}
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight md:text-5xl leading-none">
                      {whyUs.title || "Built for the ones who create."}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Heavyweight cotton and high-density DTF prints engineered for creators.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-y-10 gap-x-8 md:grid-cols-3">
                    {whyUs.items.map((f) => {
                      const IconComp = ICON_MAP[f.iconName] || Sparkles;
                      return (
                        <div key={f.id} className="group">
                          {/* Tight icon-to-heading gap (Issue 6) */}
                          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-background transition-colors group-hover:bg-brand-red group-hover:text-white">
                            <IconComp className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-semibold tracking-tight leading-snug">{f.title}</h3>
                          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
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
                className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-24"
              >
                <div className="relative overflow-hidden rounded-3xl bg-brand-red p-10 text-background md:p-20">
                  <div className="metallic-shine absolute inset-0 opacity-30" />
                  <div className="relative max-w-2xl text-white">
                    {promoBanner.badge && (
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] opacity-80">
                        {promoBanner.badge}
                      </p>
                    )}
                    <h2 className="text-4xl font-bold tracking-tight md:text-5xl whitespace-pre-line">
                      {promoBanner.title}
                    </h2>
                    {promoBanner.description && (
                      <p className="mt-5 max-w-lg text-sm sm:text-base opacity-90 leading-relaxed">{promoBanner.description}</p>
                    )}
                    {promoBanner.buttonText && (
                      <a
                        href={promoBanner.buttonLink || "/design"}
                        className="group mt-8 inline-flex h-12 min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-background px-8 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <span>{promoBanner.buttonText}</span>
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                className="mx-auto max-w-[1400px] px-6 pb-20 md:px-10 md:pb-24"
              >
                {/* Standardized 3-tier section header: label, heading, description (Issue 3) */}
                <div className="mb-8 md:mb-10 max-w-2xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    {reviewsSection.badge || "Reviews"}
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl leading-none">
                    {reviewsSection.title || "Straight from the community."}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Unfiltered reviews from verified creators wearing RIOTOUS across India.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-border bg-background p-8">
                      <div className="flex gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <span key={s} className="text-base">
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-sm text-foreground font-medium">
                        {i === 0
                          ? "“The quality of the DTF print on the oversized tee exceeded my expectations. Vibrant and doesn't crack!”"
                          : i === 1
                            ? "“Best custom apparel studio in India. The design canvas makes ordering effortless.”"
                            : "“Heavyweight fabric, fast dispatch, and signature box packaging. Will order again.”"}
                      </p>
                      <p className="mt-4 text-xs font-medium text-muted-foreground">
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

function WebsiteHero({ hero, isPreview }: { hero: WebsiteConfig["hero"]; isPreview: boolean }) {
  return <StreetwearHero hero={hero} isPreview={isPreview} />;
}

