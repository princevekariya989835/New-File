import { useMemo, useState, useRef } from "react";
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
  const badgeText = hero.badge || "PREMIUM DTF APPAREL · MADE IN INDIA";
  const headingText = hero.heading || "We Don't Follow Trends.\nWe Print Them.";
  const descriptionText =
    hero.description ||
    hero.subheading ||
    "Premium DTF printed apparel made for creators, dreamers and streetwear lovers. Oversized tees and graphic prints, designed and made in India.";

  const alignment = hero.alignment || "left";
  const isVideo =
    hero.mediaType === "video" &&
    Boolean(hero.videoUrl || (hero.mediaUrl && hero.mediaType === "video"));
  const videoSrc = hero.videoUrl || hero.mediaUrl || "";

  // Video playback states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Check if image is a user-uploaded custom media or the brand default showcase
  const customImg = hero.imageUrl || hero.mediaUrl;
  const isCustomUploadedImage =
    Boolean(customImg) &&
    customImg.trim() !== "" &&
    !customImg.includes("riotous-desktop-hero") &&
    !customImg.includes("riotous-hero-graphic") &&
    customImg !== "/assets/riotous-hero-graphic-clean.jpg" &&
    customImg !== "/assets/riotous-hero-graphic-clean.png";

  const cleanGraphicJpg = "/assets/riotous-hero-graphic-clean.jpg";
  const cleanGraphicPng = "/assets/riotous-hero-graphic-clean.png";

  // Heading lines treatment
  const headingLines = useMemo(() => {
    const raw = headingText.split("\n").map((s) => s.trim()).filter(Boolean);
    return raw.length > 0 ? raw : [headingText];
  }, [headingText]);

  const alignClass =
    alignment === "center"
      ? "text-center items-center mx-auto"
      : alignment === "right"
        ? "text-right items-end ml-auto"
        : "text-left items-start";

  const alignCtaClass =
    alignment === "center"
      ? "justify-center"
      : alignment === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <section
      key="sec-hero"
      aria-label="RIOTOUS Streetwear Official Hero"
      className="relative w-full overflow-hidden bg-background border-b border-border/40"
    >
      {/* Ambient background glows for rich streetwear depth */}
      <div
        className="pointer-events-none absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-brand-red/10 blur-[130px] dark:bg-brand-red/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -left-36 h-[400px] w-[400px] rounded-full bg-neutral-400/10 blur-[110px] dark:bg-white/5"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-10 sm:py-14 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          {/* Left Column: Streetwear Content Engine */}
          <div className={`lg:col-span-6 xl:col-span-6 flex flex-col z-10 ${alignClass}`}>
            {/* Live Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-red dark:text-red-400 mb-6 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
              </span>
              <span>{badgeText}</span>
            </div>

            {/* Main Crisp Responsive Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] xl:text-[72px] font-black tracking-tight leading-[1.06] text-foreground mb-6">
              {headingLines.length > 1 ? (
                <>
                  <span className="block text-foreground">{headingLines[0]}</span>
                  <span className="block mt-1 sm:mt-2 text-brand-red">
                    {headingLines.slice(1).join(" ")}
                  </span>
                </>
              ) : (
                <span className="block text-foreground whitespace-pre-line">{headingText}</span>
              )}
            </h1>

            {/* Description Body */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-normal leading-relaxed max-w-xl mb-8">
              {descriptionText}
            </p>

            {/* High-Conversion Action Buttons */}
            <div
              className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-10 ${alignCtaClass}`}
            >
              <Link
                to={primaryLink}
                aria-label={`${primaryCta} - Browse Streetwear Collection`}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-red px-8 py-4 text-base font-bold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-[#d6080e] hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
              >
                <span>{primaryCta}</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                to={secondaryLink}
                aria-label={`${secondaryCta} - Open Custom Apparel Studio`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-foreground/15 bg-background/80 px-8 py-4 text-base font-bold text-foreground backdrop-blur-md transition-all duration-300 hover:border-foreground hover:bg-foreground/5 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              >
                <Sparkles className="h-4 w-4 text-amber-500 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                <span>{secondaryCta}</span>
              </Link>
            </div>

            {/* Trust and Quality Proof Indicators */}
            <div className="w-full pt-6 border-t border-border/60">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-500 text-sm leading-none tracking-tighter">
                    ★★★★★
                  </div>
                  <span className="font-semibold text-foreground">4.9/5</span>
                  <span className="hidden sm:inline">(2.5k+ reviews)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-brand-red shrink-0" />
                  <span>
                    <strong className="font-semibold text-foreground">240+ GSM</strong> Heavyweight
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    <strong className="font-semibold text-foreground">HD DTF</strong> Non-cracking
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Free shipping ₹1499+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showcase Presentation */}
          <div className="lg:col-span-6 xl:col-span-6 relative w-full flex items-center justify-center">
            {/* Ambient visual back-glow */}
            <div
              className="absolute -inset-4 sm:-inset-8 rounded-[40px] bg-gradient-to-tr from-brand-red/15 via-red-500/5 to-transparent blur-3xl -z-10 pointer-events-none"
              aria-hidden="true"
            />

            {isVideo ? (
              /* Custom Video Hero Player */
              <div className="relative w-full overflow-hidden rounded-3xl border border-border/80 bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover max-h-[580px] rounded-3xl"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md transition-transform active:scale-90"
                    aria-label={isPlaying ? "Pause video" : "Play video"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md transition-transform active:scale-90"
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : isCustomUploadedImage ? (
              /* Custom Uploaded Hero Image */
              <div className="group relative w-full overflow-hidden rounded-3xl border border-border/60 bg-secondary/30 p-2 shadow-2xl">
                <img
                  src={customImg}
                  alt={headingText}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto object-cover rounded-2xl max-h-[580px]"
                />
              </div>
            ) : (
              /* Default Signature RIOTOUS Streetwear Visual Showcase */
              <div className="group relative w-full flex flex-col items-center">
                <div className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-900/60 dark:via-neutral-900/30 dark:to-neutral-950 p-3 sm:p-5 shadow-2xl shadow-neutral-900/5 transition-all duration-500 hover:shadow-red-500/10 hover:border-border">
                  {/* Floating Top Badge */}
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950/85 text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 shadow-lg">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-red animate-pulse" />
                      Drop 01 · Live
                    </span>
                    <span className="hidden sm:inline-flex items-center rounded-full bg-brand-red text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-md">
                      Oversized
                    </span>
                  </div>

                  {/* Clean, High-Resolution Tees Graphic Showcase */}
                  <div className="relative w-full aspect-[1525/1098] overflow-hidden rounded-2xl bg-neutral-100/50 dark:bg-neutral-900/50">
                    <picture>
                      <source srcSet={cleanGraphicPng} type="image/png" />
                      <img
                        src={cleanGraphicJpg}
                        alt="RIOTOUS Heavyweight Graphic Tees & Streetwear Collection"
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        width={1525}
                        height={1098}
                        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    </picture>
                  </div>

                  {/* Bottom Interactive Feature Pill */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-20 flex items-center justify-between gap-3 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 sm:p-3.5 border border-border/80 shadow-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red font-black text-xs">
                        DTF
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">
                          High-Density Print Finish
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          Wash-tested · Non-cracking
                        </p>
                      </div>
                    </div>
                    <Link
                      to={primaryLink}
                      className="group/pill inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:text-red-700 transition-colors"
                    >
                      Explore
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/pill:translate-x-0.5 group-hover/pill:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
