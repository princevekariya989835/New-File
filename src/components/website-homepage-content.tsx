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

  const primaryCta = hero.primaryCtaText || "SHOP COLLECTION";
  const primaryLink = hero.primaryCtaLink || "/shop";
  const secondaryCta = hero.secondaryCtaText || "DESIGN YOUR OWN";
  const secondaryLink = hero.secondaryCtaLink || "/design";
  const badgeText = hero.badge || "EDITION // 2025-26 · HEAVYWEIGHT DTF STUDIO";
  const headingText = (hero.heading || "").trim() || "BUILT TO\nSTAND OUT.";
  const descriptionText =
    hero.description ||
    hero.subheading ||
    "Premium DTF streetwear made for those who create their own identity. Heavyweight oversized silhouettes engineered in India.";

  const alignment = hero.alignment || "left";
  const isVideo =
    hero.mediaType === "video" &&
    Boolean(hero.videoUrl || (hero.mediaUrl && hero.mediaType === "video"));
  const videoSrc = hero.videoUrl || hero.mediaUrl || "";

  // Video playback states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Parallax tracking states
  const heroRef = useRef<HTMLElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (prefersReducedMotion || !heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    },
    [prefersReducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
  }, []);

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

  // Heading lines treatment (Black primary, RIOTOUS Red accent on punchline)
  const headingLines = useMemo(() => {
    const raw = headingText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (raw.length > 1) return raw;
    const words = headingText.split(" ").filter(Boolean);
    if (words.length >= 3) {
      return [words.slice(0, words.length - 2).join(" "), words.slice(words.length - 2).join(" ")];
    }
    return [headingText];
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
      ref={heroRef}
      key="sec-hero"
      aria-label="RIOTOUS Editorial Streetwear Hero"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full overflow-hidden bg-[#faf9f6] dark:bg-[#0f0f12] text-neutral-950 dark:text-neutral-50 border-b border-neutral-200/70 dark:border-neutral-800/80 transition-colors duration-300"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(0, 0, 0, 0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      {/* Huge Faint Editorial Ghost Branding in Background */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none text-[18vw] font-black tracking-tighter text-neutral-950/[0.03] dark:text-white/[0.03] leading-none whitespace-nowrap z-0 transition-transform duration-500 ease-out"
        style={{
          transform: prefersReducedMotion
            ? "translateX(-50%)"
            : `translate3d(calc(-50% + ${mousePos.x * -6}px), ${mousePos.y * -4}px, 0)`,
        }}
        aria-hidden="true"
      >
        RIOTOUS
      </div>

      {/* Subtle Warm Ambient Glows */}
      <div
        className="pointer-events-none absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-brand-red/8 blur-[120px] dark:bg-brand-red/12 z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-12 -left-20 h-[380px] w-[380px] rounded-full bg-amber-500/5 blur-[100px] dark:bg-white/5 z-0"
        aria-hidden="true"
      />

      {/* Decorative Technical Editorial Markings */}
      <div
        className="pointer-events-none absolute top-6 left-6 text-[10px] font-mono tracking-widest text-neutral-400 dark:text-neutral-600 hidden md:block select-none z-10"
        aria-hidden="true"
      >
        <span>+ 28.6139° N, 77.2090° E // EDITORIAL CAMPAIGN</span>
      </div>
      <div
        className="pointer-events-none absolute top-6 right-6 text-[10px] font-mono tracking-widest text-neutral-400 dark:text-neutral-600 hidden md:block select-none z-10"
        aria-hidden="true"
      >
        <span>SPEC: 240 GSM DTF // AUTHENTIC STREETWEAR +</span>
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16 md:py-20 lg:py-24 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 xl:gap-16 items-center">
          {/* Left Column: Streetwear Content Engine */}
          <div className={`lg:col-span-5 xl:col-span-5 flex flex-col z-20 ${alignClass}`}>
            {/* Live Eyebrow Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-neutral-950/10 dark:border-white/15 bg-white/85 dark:bg-neutral-900/85 px-4 py-1.5 backdrop-blur-md shadow-xs mb-6">
              <span className="h-2 w-2 rounded-xs bg-brand-red animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-800 dark:text-neutral-200">
                {badgeText}
              </span>
            </div>

            {/* High-Fashion Editorial Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[72px] xl:text-[80px] font-black tracking-tight leading-[0.98] text-neutral-950 dark:text-white mb-6">
              {headingLines.length > 1 ? (
                <>
                  <span className="block text-neutral-950 dark:text-white">{headingLines[0]}</span>
                  <span className="block mt-1 sm:mt-2 text-brand-red tracking-tight">
                    {headingLines.slice(1).join(" ")}
                  </span>
                </>
              ) : (
                <span className="block text-neutral-950 dark:text-white whitespace-pre-line">
                  {headingText}
                </span>
              )}
            </h1>

            {/* Concise Editorial Description */}
            <p className="text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed max-w-lg mb-8">
              {descriptionText}
            </p>

            {/* High-Conversion Action Buttons */}
            <div
              className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10 ${alignCtaClass}`}
            >
              <Link
                to={primaryLink}
                aria-label={`${primaryCta} - Browse Collection`}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-red px-8 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-[#d4080e] hover:shadow-xl hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
              >
                <span>{primaryCta}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                to={secondaryLink}
                aria-label={`${secondaryCta} - Open Custom Apparel Studio`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-neutral-950 dark:border-white bg-white/80 dark:bg-neutral-900/80 px-8 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-950 dark:text-white transition-all duration-300 hover:bg-neutral-950/5 dark:hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <Sparkles className="h-4 w-4 text-brand-red transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                <span>{secondaryCta}</span>
              </Link>
            </div>

            {/* Technical Editorial Proof Bar */}
            <div className="w-full pt-6 border-t border-neutral-300/60 dark:border-neutral-800/80">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-500 text-sm leading-none tracking-tighter">
                    ★★★★★
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-white">4.9/5</span>
                  <span className="hidden sm:inline">(2.5k+ reviews)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-brand-red shrink-0" />
                  <span>
                    <strong className="font-semibold text-neutral-900 dark:text-white">240+ GSM</strong> Heavyweight
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    <strong className="font-semibold text-neutral-900 dark:text-white">HD DTF</strong> Non-cracking
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Free shipping ₹1499+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Original Editorial Product Composition */}
          <div className="lg:col-span-7 xl:col-span-7 relative w-full flex items-center justify-center">
            {isVideo ? (
              /* Custom Video Hero Player */
              <div className="relative w-full overflow-hidden rounded-3xl border border-neutral-300 dark:border-neutral-800 bg-black shadow-2xl">
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
              <div className="group relative w-full overflow-hidden rounded-3xl border border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 p-2 shadow-2xl">
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
              /* Original RIOTOUS 3-Tee Dynamic 3D Editorial Staging */
              <div
                className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[1/1] max-w-[640px] mx-auto flex items-center justify-center select-none py-6"
                style={{
                  perspective: "1200px",
                  perspectiveOrigin: "50% 45%",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Editorial Framing Halo */}
                <div
                  className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] sm:w-[520px] aspect-square rounded-full border border-dashed border-brand-red/30 dark:border-brand-red/40 z-0 select-none flex items-center justify-center transition-transform duration-700 ease-out"
                  style={{
                    transform: prefersReducedMotion
                      ? "translate(-50%, -50%)"
                      : `translate(calc(-50% + ${mousePos.x * -8}px), calc(-50% + ${mousePos.y * -8}px))`,
                  }}
                  aria-hidden="true"
                >
                  <div className="w-[85%] aspect-square rounded-full bg-gradient-to-tr from-brand-red/12 via-brand-red/5 to-transparent blur-2xl" />
                  <div className="w-[68%] aspect-square rounded-full border border-neutral-950/5 dark:border-white/5" />
                </div>

                {/* 3D Stage Technical Markings */}
                <div
                  className="pointer-events-none absolute top-0 left-2 text-[9px] font-mono tracking-widest text-neutral-400 dark:text-neutral-600 select-none hidden sm:block z-0"
                  aria-hidden="true"
                >
                  + STAGE_3D // CAMPAIGN PERSPECTIVE
                </div>
                <div
                  className="pointer-events-none absolute bottom-1 right-2 text-[9px] font-mono tracking-widest text-neutral-400 dark:text-neutral-600 select-none hidden sm:block z-0"
                  aria-hidden="true"
                >
                  DTF HD CURE // 240 GSM HEAVYWEIGHT +
                </div>

                {/* Dynamic 3D Ground Shadow System */}
                <div
                  className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-14 z-0"
                  style={{
                    animation: prefersReducedMotion ? "none" : "hero-ground-shadow 8s ease-in-out infinite",
                  }}
                  aria-hidden="true"
                >
                  <div className="w-full h-full rounded-[100%] bg-gradient-to-r from-transparent via-neutral-950/35 to-transparent blur-xl dark:via-black/70" />
                  <div className="absolute inset-x-[15%] inset-y-[20%] rounded-[100%] bg-gradient-to-r from-transparent via-brand-red/10 to-transparent blur-lg" />
                </div>

                {/* 1. REAR-LEFT SHIRT: Zenitsu Lightning Graphic Maroon Tee (Angled Back in 3D) */}
                <div
                  className="absolute top-0 left-0 sm:top-2 sm:left-4 w-[54%] sm:w-[56%] z-10 origin-bottom-left pointer-events-none"
                  style={{
                    animation: prefersReducedMotion
                      ? "none"
                      : "hero-float-secondary 9s ease-in-out infinite 0.4s",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="w-full transition-transform duration-200 ease-out"
                    style={{
                      transform: prefersReducedMotion
                        ? "rotate(-12deg)"
                        : `translate3d(${mousePos.x * 16}px, ${mousePos.y * 12}px, -35px) rotateX(${mousePos.y * -14 + 6}deg) rotateY(${mousePos.x * 18 + 18}deg) rotateZ(-12deg)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <img
                      src="/assets/tee-zenitsu-back-trans.png"
                      alt="Zenitsu Lightning Maroon Oversized T-Shirt - RIOTOUS"
                      loading="eager"
                      decoding="async"
                      width={995}
                      height={1280}
                      className="w-full h-auto object-contain drop-shadow-[0_26px_36px_rgba(0,0,0,0.32)] drop-shadow-[0_8px_12px_rgba(0,0,0,0.18)]"
                    />
                    {/* Garment tag */}
                    <span className="hidden sm:inline-block absolute top-4 left-2 rounded-md bg-neutral-900/85 text-white text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 backdrop-blur-xs shadow-md border border-white/10">
                      MAROON // DROP 02
                    </span>
                  </div>
                </div>

                {/* 2. REAR-RIGHT SHIRT: Katana Pocket Graphic Olive Tee (Angled Back in 3D) */}
                <div
                  className="absolute bottom-0 right-0 sm:bottom-2 sm:right-4 w-[50%] sm:w-[52%] z-10 origin-bottom-right pointer-events-none"
                  style={{
                    animation: prefersReducedMotion
                      ? "none"
                      : "hero-float-tertiary 10s ease-in-out infinite 0.8s",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="w-full transition-transform duration-200 ease-out"
                    style={{
                      transform: prefersReducedMotion
                        ? "rotate(14deg)"
                        : `translate3d(${mousePos.x * 14}px, ${mousePos.y * 14}px, -25px) rotateX(${mousePos.y * -14 + 4}deg) rotateY(${mousePos.x * 18 - 18}deg) rotateZ(14deg)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <img
                      src="/assets/tee-olive-front-trans.png"
                      alt="Katana Pocket Olive Oversized T-Shirt - RIOTOUS"
                      loading="eager"
                      decoding="async"
                      width={995}
                      height={1280}
                      className="w-full h-auto object-contain drop-shadow-[0_24px_32px_rgba(0,0,0,0.28)] drop-shadow-[0_6px_10px_rgba(0,0,0,0.16)]"
                    />
                    {/* Garment tag */}
                    <span className="hidden sm:inline-block absolute bottom-6 right-2 rounded-md bg-neutral-900/85 text-white text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 backdrop-blur-xs shadow-md border border-white/10">
                      OLIVE // BOXY 03
                    </span>
                  </div>
                </div>

                {/* 3. FOREGROUND CENTERPIECE SHIRT: Zoro Samurai Graphic Black Heavyweight Tee (Dynamic 3D Projection) */}
                <div
                  className="relative z-20 w-[72%] sm:w-[74%] cursor-pointer group/center"
                  style={{
                    animation: prefersReducedMotion
                      ? "none"
                      : "hero-float-main 8s ease-in-out infinite",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="w-full transition-transform duration-200 ease-out"
                    style={{
                      transform: prefersReducedMotion
                        ? "rotate(-2deg)"
                        : `translate3d(${mousePos.x * -20}px, ${mousePos.y * -18}px, 45px) rotateX(${mousePos.y * -22 - 4}deg) rotateY(${mousePos.x * 26 - 6}deg) rotateZ(${mousePos.x * 8 - 2}deg)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <Link to="/shop" aria-label="Explore Zoro Heavyweight Oversized Tee">
                      <img
                        src="/assets/tee-zoro-back-trans.png"
                        alt="Zoro Samurai Back Print Heavyweight Oversized Black Tee - RIOTOUS"
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        width={995}
                        height={1280}
                        className="w-full h-auto object-contain transition-transform duration-500 ease-out group-hover/center:scale-[1.03] drop-shadow-[0_36px_50px_rgba(0,0,0,0.38)] drop-shadow-[0_14px_22px_rgba(0,0,0,0.24)] drop-shadow-[-10px_22px_30px_rgba(240,11,17,0.16)]"
                      />

                      {/* Interactive Floating Product Pill popping in 3D */}
                      <div
                        className="absolute top-6 right-0 sm:top-8 sm:-right-2 z-30 inline-flex items-center gap-2 rounded-full border border-neutral-950/10 dark:border-white/15 bg-white/95 dark:bg-neutral-900/95 px-3.5 py-1.5 shadow-2xl backdrop-blur-md transition-all duration-300 group-hover/center:-translate-y-1 group-hover/center:shadow-red-500/20"
                        style={{
                          transform: "translateZ(55px)",
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-red animate-ping" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-900 dark:text-white">
                          ZORO OVERSIZED · ₹999
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-neutral-400 group-hover/center:text-brand-red transition-colors" />
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Bottom Editorial Caption Pill */}
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap"
                  style={{
                    transform: "translateX(-50%) translateZ(35px)",
                  }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-950/10 dark:border-white/15 bg-white/90 dark:bg-neutral-900/90 px-4 py-1.5 shadow-lg backdrop-blur-md text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                    <span className="h-1 w-1 rounded-full bg-brand-red" />
                    <span>240 GSM // HIGH-DENSITY DTF CURE // BOX-CUT</span>
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
