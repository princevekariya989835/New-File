import { useMemo } from "react";
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
} from "lucide-react";
import { BrandName } from "@/components/brand-name";
import { ProductCard } from "@/components/product-card";
import { EmptyProducts } from "@/components/empty-products";
import type { CatalogProduct } from "@/lib/catalog";
import type { WebsiteConfig, WebsiteSectionType } from "@/lib/website-config.types";

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

function WebsiteHero({ hero }: { hero: WebsiteConfig["hero"]; isPreview: boolean }) {
  if (!hero || (hero.enabled === false && hero.active === false)) return null;

  const primaryCta = hero.primaryCtaText || "Shop Now";
  const primaryLink = hero.primaryCtaLink || "/shop";
  const secondaryCta = hero.secondaryCtaText || "Design Your Own";
  const secondaryLink = hero.secondaryCtaLink || "/design";

  return (
    <section
      key="sec-hero"
      aria-label="RIOTOUS Streetwear Hero"
      className="relative -mt-16 md:-mt-20 w-full bg-[#f8f8f9] text-neutral-900 overflow-hidden border-b border-neutral-200/50"
    >
      {/* Subtle ambient streetwear background styling */}
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 85% 50%, rgba(229, 9, 20, 0.05), transparent 60%), radial-gradient(ellipse at 15% 20%, rgba(0, 0, 0, 0.02), transparent 45%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-6 top-16 select-none font-black text-neutral-200/25 text-[10vw] tracking-widest pointer-events-none uppercase leading-none hidden xl:block"
      >
        RIOTOUS
      </div>

      <div className="relative mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-12 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-12 sm:pb-16 md:pb-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Live crisp typography & interactive actions */}
          <div className="lg:col-span-6 flex flex-col justify-center z-10">
            {/* Eyebrow badge with red dash accent */}
            <div className="inline-flex items-center gap-2.5 mb-4 sm:mb-5">
              <span className="h-[2.5px] w-7 bg-[#e50914] rounded-full inline-block shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-neutral-800">
                {hero.badge || "PREMIUM DTF APPAREL · MADE IN INDIA"}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.75rem] font-black tracking-[-0.035em] leading-[0.94] text-neutral-950">
              We Don't Follow Trends.
              <span className="block text-[#e50914] mt-1.5 sm:mt-2">We Print Them.</span>
            </h1>

            {/* Description */}
            <p className="mt-5 sm:mt-6 max-w-lg text-base sm:text-lg text-neutral-600 leading-relaxed font-normal">
              {hero.description ||
                "Premium DTF printed apparel made for creators, dreamers and streetwear lovers. Oversized tees and graphic prints, designed and made in India."}
            </p>

            {/* Real Interactive Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3.5 sm:gap-4">
              <Link
                to={primaryLink}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#e50914] px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-[0_6px_20px_rgba(229,9,20,0.32)] transition-all duration-300 hover:bg-[#c90711] hover:shadow-[0_8px_25px_rgba(229,9,20,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer"
              >
                <span>{primaryCta}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to={secondaryLink}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border-2 border-neutral-900 bg-white px-6 py-3.5 text-sm sm:text-base font-bold text-neutral-900 shadow-xs transition-all duration-300 hover:bg-neutral-100 hover:border-black hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer"
              >
                <span>{secondaryCta}</span>
                <Sparkles className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
              </Link>
            </div>

            {/* Streetwear Graffiti Accent */}
            <div className="mt-6 flex items-center gap-2 select-none">
              <span
                className="inline-block font-black text-[#e50914] text-xs sm:text-sm tracking-widest uppercase -rotate-6 transition-transform hover:rotate-0"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                ⚡ WEAR YOUR STORY
              </span>
            </div>
          </div>

          {/* Right Column: 3D Streetwear Showcase (3 Graphic Oversized Tees) */}
          <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end z-10">
            <div className="relative w-full max-w-[620px] lg:max-w-none group transition-transform duration-500 hover:scale-[1.015]">
              <img
                src="/assets/riotous-tees-showcase.png"
                alt="RIOTOUS Streetwear Tees - Japanese Cranes Confidence, Anime, and One Piece Gear 5"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1772}
                height={1100}
                className="w-full h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.12)] select-none pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
