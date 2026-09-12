import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Sparkles,
  Truck,
  RotateCcw,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Heart,
  Flame,
  Zap,
  Award,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { BrandName } from "@/components/brand-name";
import { ProductCard } from "@/components/product-card";
import { EmptyProducts } from "@/components/empty-products";
import type { WebsiteConfig, FeatureItem } from "@/lib/website-config.types";
import type { CatalogProduct } from "@/lib/catalog";

interface HomeSectionsRendererProps {
  config: WebsiteConfig;
  products?: CatalogProduct[];
  isPreview?: boolean;
}

function getFeatureIcon(iconName: string) {
  switch (iconName?.toLowerCase()) {
    case "sparkles":
      return Sparkles;
    case "truck":
      return Truck;
    case "rotateccw":
    case "refresh":
      return RotateCcw;
    case "mappin":
    case "location":
      return MapPin;
    case "package":
    case "box":
      return Package;
    case "shieldcheck":
    case "shield":
      return ShieldCheck;
    case "star":
      return Star;
    case "heart":
      return Heart;
    case "flame":
    case "fire":
      return Flame;
    case "zap":
    case "bolt":
      return Zap;
    case "award":
      return Award;
    default:
      return CheckCircle2;
  }
}

export function HomeSectionsRenderer({
  config,
  products = [],
  isPreview = false,
}: HomeSectionsRendererProps) {
  const sectionOrder = config.sectionOrder || [];

  // Filter featured products if specific IDs are configured
  const displayProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const cfg = config.featuredProducts;
    if (!cfg) return list.slice(0, 8);

    if (cfg.productIds && cfg.productIds.length > 0) {
      const filtered = list.filter((p) => cfg.productIds.includes(p.node?.id));
      return filtered.length > 0
        ? filtered.slice(0, cfg.limit || 8)
        : list.slice(0, cfg.limit || 8);
    }
    return list.slice(0, cfg.limit || 8);
  }, [products, config.featuredProducts]);

  return (
    <>
      {sectionOrder
        .filter((sec) => sec.enabled)
        .map((sec) => {
          switch (sec.id) {
            case "hero":
              return renderHeroSection(config.hero, isPreview);
            case "collections":
              return renderCollectionsSection(config.collections);
            case "featuredProducts":
              return renderFeaturedProductsSection(config.featuredProducts, displayProducts);
            case "features":
              return renderFeaturesSection(config.features);
            case "banners":
              return renderBannersSection(config.banners);
            case "designCta":
              return renderDesignCtaSection(config.designCta);
            case "reviewsSection":
              return renderReviewsSection(config.reviewsSection);
            default:
              return null;
          }
        })}
    </>
  );
}

function renderHeroSection(hero: WebsiteConfig["hero"], isPreview: boolean) {
  if (!hero || !hero.enabled) return null;

  const alignClass =
    hero.alignment === "center"
      ? "text-center mx-auto items-center"
      : hero.alignment === "right"
        ? "text-right ml-auto items-end"
        : "text-left mr-auto items-start";

  const animClass =
    hero.animation === "fade"
      ? "animate-in fade-in duration-700"
      : hero.animation === "zoom"
        ? "animate-in zoom-in-95 duration-700"
        : hero.animation === "subtle"
          ? "transition-all duration-500"
          : "";

  return (
    <section
      key="hero-section"
      className="relative -mt-16 flex min-h-[75svh] items-end overflow-hidden bg-foreground md:-mt-20 md:min-h-[100svh]"
    >
      {hero.videoUrl && !hero.imageUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-contain object-center opacity-90 md:object-cover md:opacity-70"
          src={hero.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      ) : hero.imageUrl ? (
        <img
          src={hero.imageUrl}
          alt="RIOTOUS Streetwear"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-foreground/20 via-transparent to-foreground/80 md:from-foreground/60 md:via-foreground/40 md:to-foreground/90" />
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 30%, oklch(0.62 0.22 258 / 0.5), transparent 60%), radial-gradient(ellipse at 80% 70%, oklch(0.3 0.15 258 / 0.6), transparent 60%)",
        }}
      />

      <div
        className={`relative mx-auto w-full max-w-[1400px] px-6 pb-20 pt-40 text-background md:px-10 md:pb-32 md:pt-48 ${animClass}`}
      >
        <div className={`flex flex-col ${alignClass}`}>
          {hero.badge && (
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-background/90 backdrop-blur">
              {hero.badge}
            </p>
          )}

          {hero.subheading && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-red">
              {hero.subheading}
            </p>
          )}

          <h1 className="max-w-5xl text-[12vw] font-black leading-[0.92] tracking-[-0.04em] text-background md:text-[8.5vw] lg:text-[6.8rem] whitespace-pre-line">
            {hero.heading || "We Don't Follow Trends.\nWe Print Them."}
          </h1>

          <p className="mt-8 max-w-lg text-base text-background/80 md:text-lg leading-relaxed">
            {hero.description}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {hero.primaryCtaText && (
              <a
                href={hero.primaryCtaLink || "/shop"}
                className="group inline-flex items-center gap-2 rounded-full bg-background px-7 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.02]"
              >
                {hero.primaryCtaText}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}

            {hero.secondaryCtaText && (
              <a
                href={hero.secondaryCtaLink || "/design"}
                className="group inline-flex items-center gap-2 rounded-full border border-background/30 px-7 py-4 text-sm font-medium text-background backdrop-blur transition-colors hover:bg-background/10"
              >
                {hero.secondaryCtaText}
                <Sparkles className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function renderCollectionsSection(collections: WebsiteConfig["collections"]) {
  if (!collections || !collections.enabled) return null;
  const items = (collections.items || []).filter((c) => c.enabled);
  if (items.length === 0) return null;

  return (
    <section
      key="collections-section"
      className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          {collections.badge && (
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {collections.badge}
            </p>
          )}
          <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {collections.heading || "Shop the drop."}
          </h2>
        </div>
        {collections.viewAllLink && (
          <a
            href={collections.viewAllLink}
            className="group inline-flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-foreground"
          >
            View all
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {items.map((c) => (
          <a
            key={c.id}
            href={c.to || "/shop"}
            style={c.backgroundColor ? { backgroundColor: c.backgroundColor } : undefined}
            className="group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl bg-brand-red p-5 text-white transition-all duration-300 hover:scale-[1.02] md:p-6"
          >
            {c.imageUrl && (
              <img
                src={c.imageUrl}
                alt={c.title}
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <span className="relative z-10 text-[10px] font-semibold uppercase tracking-widest text-white/70">
              {c.tag}
            </span>
            <div className="relative z-10">
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{c.title}</h3>
              <ArrowUpRight className="mt-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function renderFeaturedProductsSection(
  featured: WebsiteConfig["featuredProducts"],
  products: CatalogProduct[],
) {
  if (!featured || !featured.enabled) return null;

  return (
    <section
      key="featured-products-section"
      className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24"
    >
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          {featured.badge && (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {featured.badge}
            </p>
          )}
          <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {featured.heading || "Featured."}
          </h2>
        </div>
        {featured.viewAllLink && (
          <a
            href={featured.viewAllLink}
            className="group inline-flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-foreground"
          >
            All products
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyProducts />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.map((p) => (
            <ProductCard key={p.node.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function renderFeaturesSection(features: WebsiteConfig["features"]) {
  if (!features || !features.enabled) return null;
  const items = (features.items || []).filter((f) => f.enabled);
  if (items.length === 0) return null;

  return (
    <section key="features-section" className="bg-secondary py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-16 max-w-3xl">
          {features.badge && (
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {features.badge}
            </p>
          )}
          <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {features.heading || "Built for the ones who create."}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((f: FeatureItem) => {
            const Icon = getFeatureIcon(f.icon);
            return (
              <div key={f.id} className="group">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-background transition-colors group-hover:bg-brand-red group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function renderBannersSection(banners: WebsiteConfig["banners"]) {
  if (!banners || !Array.isArray(banners)) return null;
  const activeBanners = banners.filter((b) => b.enabled && b.status === "active");
  if (activeBanners.length === 0) return null;

  return (
    <section key="banners-section" className="mx-auto max-w-[1400px] px-6 py-12 md:px-10">
      <div className="space-y-6">
        {activeBanners.map((b) => (
          <div
            key={b.id}
            style={{
              backgroundColor: b.backgroundColor || "#111827",
              color: b.textColor || "#FFFFFF",
            }}
            className="relative overflow-hidden rounded-3xl p-8 md:p-14 transition-all duration-300 shadow-xl"
          >
            {b.imageUrl && (
              <img
                src={b.imageUrl}
                alt={b.title}
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
            )}
            <div className="relative z-10 max-w-2xl">
              {b.badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red px-3 py-1 text-xs font-bold uppercase tracking-wider text-white mb-4">
                  <Tag className="h-3 w-3" />
                  {b.badge}
                </span>
              )}
              {b.subtitle && (
                <p className="text-sm font-semibold uppercase tracking-widest text-brand-red mb-1">
                  {b.subtitle}
                </p>
              )}
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{b.title}</h2>
              {b.description && (
                <p className="mt-4 text-base opacity-85 leading-relaxed">{b.description}</p>
              )}
              {b.ctaText && (
                <a
                  href={b.ctaLink || "/shop"}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3.5 text-sm font-semibold hover:bg-neutral-200 transition-colors"
                >
                  {b.ctaText}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderDesignCtaSection(designCta: WebsiteConfig["designCta"]) {
  if (!designCta || !designCta.enabled) return null;

  return (
    <section
      key="design-cta-section"
      className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="relative overflow-hidden rounded-3xl bg-brand-red p-10 text-background md:p-20">
        <div className="metallic-shine absolute inset-0 opacity-30" />
        <div className="relative max-w-2xl">
          {designCta.badge && (
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-background/60">
              {designCta.badge}
            </p>
          )}
          <h2 className="text-4xl font-semibold tracking-tight md:text-6xl whitespace-pre-line">
            {designCta.heading || "Your art. Our shirt.\nZero limits."}
          </h2>
          <p className="mt-6 max-w-lg text-background/70 leading-relaxed">
            {designCta.description}
          </p>
          <a
            href={designCta.ctaLink || "/design"}
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-background px-7 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.02]"
          >
            {designCta.ctaText || "Open the Studio"}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function renderReviewsSection(reviewsSection: WebsiteConfig["reviewsSection"]) {
  if (!reviewsSection || !reviewsSection.enabled) return null;

  return (
    <section key="reviews-section" className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10 md:pb-32">
      <div className="mb-12 max-w-2xl">
        {reviewsSection.badge && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            {reviewsSection.badge}
          </p>
        )}
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {reviewsSection.heading || "Straight from the community."}
        </h2>
        {reviewsSection.description && (
          <p className="mt-3 text-sm text-muted-foreground">{reviewsSection.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            name: "Arjun K.",
            tag: "Verified Buyer",
            text: "The print quality is on another level. DTF print survived 10+ washes and still feels crisp.",
            rating: 5,
          },
          {
            name: "Sneha P.",
            tag: "Custom Creator",
            text: "Uploaded my custom artwork and got exactly what I designed in the 3D studio. Insane fit!",
            rating: 5,
          },
          {
            name: "Vikram R.",
            tag: "Verified Buyer",
            text: "Heavyweight cotton drape is unmatched. Streetwear aesthetics done right in India.",
            rating: 5,
          },
        ].map((rev, i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 text-amber-500">
                {Array.from({ length: rev.rating }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current text-amber-500" />
                ))}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {rev.tag}
              </span>
            </div>
            <p className="mt-4 text-sm text-foreground/90 italic leading-relaxed">"{rev.text}"</p>
            <p className="mt-4 text-xs font-bold text-foreground">{rev.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
