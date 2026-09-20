import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
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
            if (!announcement?.enabled) return null;
            return (
              <div
                key="sec-announcement"
                style={{
                  backgroundColor: announcement.backgroundColor || "#e11d48",
                  color: announcement.textColor || "#ffffff",
                }}
                className="w-full py-2.5 px-4 text-center text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors"
              >
                <span>{announcement.text}</span>
                {announcement.link && (
                  <a
                    href={announcement.link}
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    {announcement.linkText || "Learn more"} &rarr;
                  </a>
                )}
              </div>
            );
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

  const heroImageSrc =
    hero.imageUrl || hero.mediaUrl || "/assets/riotous-desktop-hero@2x.jpg";
  const primaryCta = hero.primaryCtaText || "Shop Now";
  const primaryLink = hero.primaryCtaLink || "/shop";
  const secondaryCta = hero.secondaryCtaText || "Design Your Own";
  const secondaryLink = hero.secondaryCtaLink || "/design";

  return (
    <section
      key="sec-hero"
      aria-label="RIOTOUS Streetwear Hero"
      className="relative w-full bg-[#fbfbfb] text-neutral-900 overflow-hidden"
    >
      {/* Desktop Hero Layout (md and up): Matches the reference desktop image with pixel-perfect precision & interactive action hotspots */}
      <div className="hidden md:block relative w-full bg-[#fbfbfb]">
        <div className="relative mx-auto w-full max-w-[1600px]">
          <div className="relative w-full aspect-[1024/440] select-none">
            <img
              src={heroImageSrc}
              alt={hero.heading || "We Don't Follow Trends. We Print Them. - RIOTOUS"}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={2048}
              height={880}
              className="h-full w-full object-cover object-center pointer-events-none"
            />

            {/* Accessible SEO Headings & Text */}
            <div className="sr-only">
              <p>{hero.badge || "PREMIUM DTF APPAREL · MADE IN INDIA"}</p>
              <h1>{hero.heading || "We Don't Follow Trends. We Print Them."}</h1>
              <p>
                {hero.description ||
                  "Premium DTF printed apparel made for creators, dreamers and streetwear lovers. Oversized tees and graphic prints, designed and made in India."}
              </p>
            </div>

            {/* Interactive Button Overlay: Shop Now */}
            <Link
              to={primaryLink}
              title={`${primaryCta} →`}
              aria-label={`${primaryCta} - Browse Streetwear Collection`}
              style={{
                left: "4.49%",
                top: "65.23%",
                width: "11.62%",
                height: "7.5%",
              }}
              className="absolute group rounded-md cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e50914] hover:shadow-[0_4px_16px_rgba(229,9,20,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] z-10"
            >
              <span className="sr-only">{primaryCta}</span>
            </Link>

            {/* Interactive Button Overlay: Design Your Own */}
            <Link
              to={secondaryLink}
              title={`${secondaryCta} 🪄`}
              aria-label={`${secondaryCta} - Custom Apparel`}
              style={{
                left: "17.4%",
                top: "65.23%",
                width: "13.6%",
                height: "7.5%",
              }}
              className="absolute group rounded-md cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-neutral-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 z-10"
            >
              <span className="sr-only">{secondaryCta}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Layout (below md): Clean stacked layout with readable typography & touch targets */}
      <div className="block md:hidden px-5 py-8 bg-[#fbfbfb]">
        {/* Eyebrow badge with red dash accent */}
        <div className="flex items-center gap-2 mb-3">
          <span className="h-[2px] w-6 bg-[#e50914] rounded-full inline-block" />
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-800">
            {hero.badge || "PREMIUM DTF APPAREL · MADE IN INDIA"}
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl font-black tracking-tight leading-[0.98] text-neutral-950">
          We Don't Follow Trends.
          <span className="block text-[#e50914] mt-1">We Print Them.</span>
        </h1>

        {/* Description */}
        <p className="mt-3.5 text-sm leading-relaxed text-neutral-600 font-normal">
          {hero.description ||
            "Premium DTF printed apparel made for creators, dreamers and streetwear lovers. Oversized tees and graphic prints, designed and made in India."}
        </p>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            to={primaryLink}
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-md bg-[#e50914] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            {primaryCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={secondaryLink}
            className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 rounded-md border border-neutral-900 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-transform active:scale-95"
          >
            {secondaryCta}
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>

        {/* Artwork Graphic Showcase */}
        <div className="mt-6 relative w-full overflow-hidden rounded-xl border border-neutral-200/70 bg-white/60 shadow-xs">
          <img
            src="/assets/riotous-desktop-hero@2x.jpg"
            alt="RIOTOUS Streetwear Showcase"
            loading="lazy"
            decoding="async"
            width={1024}
            height={440}
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </section>
  );
}
