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

interface HeroDrop {
  id: string;
  tag: string;
  title: string;
  subTitle: string;
  price: string;
  colorName: string;
  colorHex: string;
  glowColor: string;
  accentBadge: string;
  frontImage: string;
  backImage: string;
  frontLabel: string;
  backLabel: string;
  link: string;
  specs: {
    gsm: string;
    print: string;
    fit: string;
    finish: string;
  };
}

const HERO_DROPS: HeroDrop[] = [
  {
    id: "drop-01",
    tag: "DROP 01 // ARCHIVE",
    title: "ONI ZORO HEAVYWEIGHT",
    subTitle: "Archival DTF Back Graphic · Signature Boxy Silhouette",
    price: "₹999",
    colorName: "Pitch Black",
    colorHex: "#141416",
    glowColor: "rgba(240, 11, 17, 0.2)",
    accentBadge: "BESTSELLER",
    frontImage: "/assets/tee-zoro-front-trans.png",
    backImage: "/assets/tee-zoro-back-trans.png",
    frontLabel: "Front: Minimal Samurai Chest Emblem",
    backLabel: "Back: HD 12-Pass Zoro Back Print",
    link: "/shop",
    specs: {
      gsm: "240 GSM",
      print: "Archival Ultra-HD DTF",
      fit: "Drop-Shoulder Boxy",
      finish: "Bio-Washed Cotton",
    },
  },
  {
    id: "drop-02",
    tag: "DROP 02 // LIGHTNING",
    title: "THUNDER BREATH MAROON",
    subTitle: "Zenitsu Electric Strike · Dual-Tone Heavy Cotton",
    price: "₹1,099",
    colorName: "Oxblood Maroon",
    colorHex: "#45141c",
    glowColor: "rgba(225, 29, 72, 0.24)",
    accentBadge: "NEW DROP",
    frontImage: "/assets/tee-maroon-front.webp",
    backImage: "/assets/tee-zenitsu-back-trans.png",
    frontLabel: "Front: Heavyweight Raw Minimalist",
    backLabel: "Back: Zenitsu High-Voltage Canvas",
    link: "/shop",
    specs: {
      gsm: "240 GSM",
      print: "Crack-Proof Vivid DTF",
      fit: "Relaxed Streetwear Cut",
      finish: "Enzyme Softened",
    },
  },
  {
    id: "drop-03",
    tag: "DROP 03 // TACTICAL",
    title: "KATANA RONIN OLIVE",
    subTitle: "Military Earth · Pocket Katana Chest Emblem",
    price: "₹999",
    colorName: "Combat Olive",
    colorHex: "#2b3424",
    glowColor: "rgba(52, 211, 153, 0.16)",
    accentBadge: "LIMITED RUN",
    frontImage: "/assets/tee-olive-front-trans.png",
    backImage: "/assets/tee-olive-back.webp",
    frontLabel: "Front: Tactical Pocket Katana Emblem",
    backLabel: "Back: Ronin Minimalist Back Crest",
    link: "/shop",
    specs: {
      gsm: "240 GSM",
      print: "Screen-Grade Precision DTF",
      fit: "Engineered Oversized Fit",
      finish: "Ring-Spun Cotton",
    },
  },
];

function WebsiteHero({ hero }: { hero: WebsiteConfig["hero"]; isPreview: boolean }) {
  if (!hero || (hero.enabled === false && hero.active === false)) return null;

  const primaryCta = hero.primaryCtaText || "EXPLORE THE DROP";
  const primaryLink = hero.primaryCtaLink || "/shop";
  const secondaryCta = hero.secondaryCtaText || "CUSTOM STUDIO (3D)";
  const secondaryLink = hero.secondaryCtaLink || "/design";
  const badgeText = hero.badge || "EDITION // DROP 04 · HEAVYWEIGHT DTF ARCHIVE";
  const headingText = (hero.heading || "").trim() || "WE DON'T FOLLOW TRENDS.\nWE PRINT THEM.";
  const descriptionText =
    hero.description ||
    hero.subheading ||
    "Archival 240 GSM combed cotton silhouettes engineered with zero-crack HD DTF prints. Built for the creators, outlaws, and streetwear purists.";

  const alignment = hero.alignment || "left";
  const isVideo =
    hero.mediaType === "video" &&
    Boolean(hero.videoUrl || (hero.mediaUrl && hero.mediaType === "video"));
  const videoSrc = hero.videoUrl || hero.mediaUrl || "";

  // Interactive lookbook states
  const [selectedDropIndex, setSelectedDropIndex] = useState(0);
  const [viewSide, setViewSide] = useState<"front" | "back">("back");

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

  // Heading lines treatment
  const headingLines = useMemo(() => {
    const raw = headingText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (raw.length > 1) return raw;
    const words = headingText.split(" ").filter(Boolean);
    if (words.length >= 3) {
      return [words.slice(0, words.length - 2).join(" "), words.slice(words.length - 2).join(" ")];
    }
    return [headingText];
  }, [headingText]);

  const activeDrop = HERO_DROPS[selectedDropIndex];
  const activeImage = viewSide === "front" ? activeDrop.frontImage : activeDrop.backImage;
  const activeLabel = viewSide === "front" ? activeDrop.frontLabel : activeDrop.backLabel;

  return (
    <section
      key="sec-hero"
      aria-label="RIOTOUS Streetwear Hero"
      className="relative w-full overflow-hidden bg-[#09090b] text-neutral-50 border-b border-neutral-800 transition-colors duration-300 select-none"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Background Architectural Watermark */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none text-[20vw] font-black tracking-tighter text-white/[0.02] leading-none whitespace-nowrap z-0"
        aria-hidden="true"
      >
        RIOTOUS
      </div>

      {/* Subtle Dynamic Ambient Color Field */}
      <div
        className="pointer-events-none absolute top-1/4 right-1/4 h-[550px] w-[550px] rounded-full blur-[140px] transition-colors duration-700 opacity-60 z-0"
        style={{ backgroundColor: activeDrop.glowColor }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 md:pt-20 pb-12 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          
          {/* LEFT COLUMN: Streetwear Editorial Core */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start z-20">
            {/* Live Drop Status Pill */}
            <div className="inline-flex items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900/90 px-4 py-1.5 backdrop-blur-md shadow-md mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-red" />
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-neutral-300">
                {badgeText}
              </span>
              <span className="hidden sm:inline-block text-neutral-600 font-mono text-xs">|</span>
              <span className="hidden sm:inline-block font-mono text-[10px] tracking-widest text-neutral-500">
                DISPATCH &lt;24H
              </span>
            </div>

            {/* Streetwear Typography Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[70px] xl:text-[78px] font-black tracking-tight leading-[0.96] text-white mb-6 uppercase">
              {headingLines.length > 1 ? (
                <>
                  <span className="block text-white">{headingLines[0]}</span>
                  <span className="block mt-1 sm:mt-2 text-brand-red tracking-tight">
                    {headingLines.slice(1).join(" ")}
                  </span>
                </>
              ) : (
                <span className="block text-white whitespace-pre-line">
                  {headingText}
                </span>
              )}
            </h1>

            {/* Editorial Streetwear Description */}
            <p className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed max-w-lg mb-8">
              {descriptionText}
            </p>

            {/* High-Impact Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10">
              <Link
                to={primaryLink}
                aria-label={`${primaryCta} - Browse Streetwear Collection`}
                className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-brand-red px-8 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 transition-all duration-200 hover:bg-[#d4080e] hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
              >
                <span>{primaryCta}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <Link
                to={secondaryLink}
                aria-label={`${secondaryCta} - Launch 3D Apparel Studio`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full border border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800/90 px-7 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Sparkles className="h-4 w-4 text-brand-red transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
                <span>{secondaryCta}</span>
              </Link>
            </div>

            {/* Streetwear Production Spec Matrix */}
            <div className="w-full pt-6 border-t border-neutral-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-neutral-500 text-[10px] tracking-wider uppercase">FABRIC</span>
                  <span className="font-bold text-neutral-200 text-sm mt-0.5">240 GSM COMBED</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500 text-[10px] tracking-wider uppercase">PRINT CURE</span>
                  <span className="font-bold text-neutral-200 text-sm mt-0.5">HD DTF RESIN</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500 text-[10px] tracking-wider uppercase">SILHOUETTE</span>
                  <span className="font-bold text-neutral-200 text-sm mt-0.5">DROP SHOULDER</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500 text-[10px] tracking-wider uppercase">COMMUNITY</span>
                  <span className="font-bold text-neutral-200 text-sm mt-0.5 flex items-center gap-1">
                    <span className="text-amber-400">★ 4.9</span>
                    <span className="text-neutral-500 text-xs font-normal">(2.5K+)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Tactile Lookbook & Interactive Garment Showcase */}
          <div className="lg:col-span-6 xl:col-span-6 relative w-full flex flex-col items-center">
            {isVideo ? (
              /* Custom Video Hero Player */
              <div className="relative w-full overflow-hidden rounded-3xl border border-neutral-800 bg-black shadow-2xl">
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
              <div className="group relative w-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/60 p-2 shadow-2xl">
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
              /* Bespoke Interactive Lookbook & Tactile Garment Showcase */
              <div className="w-full flex flex-col items-center gap-4">
                
                {/* 1. Drop Switcher Tabs */}
                <div className="w-full flex items-center justify-between gap-2 p-1.5 rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
                  {HERO_DROPS.map((drop, idx) => {
                    const isSelected = selectedDropIndex === idx;
                    return (
                      <button
                        key={drop.id}
                        type="button"
                        onClick={() => setSelectedDropIndex(idx)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-200 text-left ${
                          isSelected
                            ? "bg-neutral-800 border border-neutral-700 text-white shadow-xs"
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: drop.colorHex }}
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-[11px] font-mono font-bold uppercase truncate leading-tight">
                            {drop.title.split(" ")[0]} {drop.title.split(" ")[1] || ""}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 truncate">
                            {drop.price}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Tactile Garment Showcase Box */}
                <div className="relative w-full rounded-3xl border border-neutral-800/90 bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-neutral-950 p-6 sm:p-8 flex flex-col items-center justify-between shadow-2xl min-h-[460px] sm:min-h-[520px]">
                  
                  {/* Top Bar: Front / Back Optical Toggle + Badge */}
                  <div className="w-full flex items-center justify-between gap-3 z-30">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-300 font-mono text-[10px] uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
                      <span>{activeDrop.accentBadge}</span>
                    </div>

                    {/* Mechanical Front/Back Switch */}
                    <div className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-900/90 p-1 backdrop-blur-md shadow-inner">
                      <button
                        type="button"
                        onClick={() => setViewSide("front")}
                        className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 ${
                          viewSide === "front"
                            ? "bg-white text-neutral-950 font-bold shadow-xs scale-105"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Eye className="h-3 w-3" />
                        <span>Front</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewSide("back")}
                        className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 ${
                          viewSide === "back"
                            ? "bg-brand-red text-white font-bold shadow-xs scale-105"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Flame className="h-3 w-3" />
                        <span>Back</span>
                      </button>
                    </div>
                  </div>

                  {/* Garment Stage & Visual Graphic */}
                  <div className="relative w-full flex-1 flex items-center justify-center my-4 group/stage">
                    {/* Architectural Garment Silhouette Halo */}
                    <div
                      className="absolute inset-8 rounded-full blur-3xl opacity-30 transition-all duration-700 pointer-events-none"
                      style={{ backgroundColor: activeDrop.glowColor }}
                    />

                    {/* Garment Image Presentation */}
                    <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
                      <img
                        key={`${activeDrop.id}-${viewSide}`}
                        src={activeImage}
                        alt={`${activeDrop.title} - ${viewSide === "front" ? "Front Chest" : "Back Graphic"}`}
                        className="max-h-[380px] sm:max-h-[420px] w-auto object-contain transition-transform duration-300 group-hover/stage:scale-[1.03] filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)]"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />

                      {/* Interactive Spec Hotspot Badges */}
                      <div className="hidden sm:block absolute top-6 right-2 rounded-md bg-neutral-900/90 border border-neutral-700/80 px-2.5 py-1 backdrop-blur-md text-[10px] font-mono text-neutral-300 uppercase tracking-wider shadow-md">
                        <span className="text-brand-red font-bold">+</span> 1.25&quot; RIBBED COLLAR
                      </div>

                      <div className="hidden sm:block absolute bottom-8 left-2 rounded-md bg-neutral-900/90 border border-neutral-700/80 px-2.5 py-1 backdrop-blur-md text-[10px] font-mono text-neutral-300 uppercase tracking-wider shadow-md">
                        <span className="text-brand-red font-bold">+</span> 240 GSM DROP SHOULDER
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar: Product Details & Direct Action */}
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-800/80 z-30">
                    <div className="flex flex-col text-center sm:text-left">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {activeDrop.title}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {activeLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={activeDrop.link}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 hover:scale-105 active:scale-95 shadow-md"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        <span>BUY · {activeDrop.price}</span>
                      </Link>

                      <Link
                        to="/design"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-colors duration-150"
                        title="Customize silhouette in 3D studio"
                      >
                        <span>CUSTOMIZE</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Micro Technical Proof Stamp */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-neutral-500 px-2">
                  <span>SPEC: ARCHIVAL HEAVYWEIGHT COMBED COTTON</span>
                  <span>100% NON-CRACK DIRECT-TO-FILM</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CONTINUOUS INDUSTRIAL STREETWEAR MARQUEE TICKER */}
      <div className="relative w-full border-t border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md overflow-hidden py-3 text-neutral-400 select-none">
        <div className="animate-marquee whitespace-nowrap text-xs font-mono tracking-widest uppercase flex items-center gap-8">
          <span className="inline-flex items-center gap-2 text-neutral-200 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
            HEAVYWEIGHT 240 GSM COMBED COTTON
          </span>
          <span className="text-neutral-600">✕</span>
          <span>ARCHIVAL HIGH-DEFINITION DTF</span>
          <span className="text-neutral-600">✕</span>
          <span className="text-neutral-200 font-bold">100% ZERO CRACK GUARANTEE</span>
          <span className="text-neutral-600">✕</span>
          <span>DROP-SHOULDER BOXY FIT</span>
          <span className="text-neutral-600">✕</span>
          <span className="text-neutral-200 font-bold">DESIGN YOUR OWN IN 3D STUDIO</span>
          <span className="text-neutral-600">✕</span>
          <span>DISPATCH WITHIN 24 HOURS</span>
          <span className="text-neutral-600">✕</span>
          <span className="text-brand-red font-bold">WE DON&apos;T FOLLOW TRENDS. WE PRINT THEM.</span>
          <span className="text-neutral-600">✕</span>
          {/* Loop duplicate for seamless continuous wrap */}
          <span className="inline-flex items-center gap-2 text-neutral-200 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
            HEAVYWEIGHT 240 GSM COMBED COTTON
          </span>
          <span className="text-neutral-600">✕</span>
          <span>ARCHIVAL HIGH-DEFINITION DTF</span>
          <span className="text-neutral-600">✕</span>
          <span className="text-neutral-200 font-bold">100% ZERO CRACK GUARANTEE</span>
          <span className="text-neutral-600">✕</span>
          <span>DROP-SHOULDER BOXY FIT</span>
          <span className="text-neutral-600">✕</span>
          <span className="text-neutral-200 font-bold">DESIGN YOUR OWN IN 3D STUDIO</span>
          <span className="text-neutral-600">✕</span>
          <span>DISPATCH WITHIN 24 HOURS</span>
          <span className="text-neutral-600">✕</span>
          <span className="text-brand-red font-bold">WE DON&apos;T FOLLOW TRENDS. WE PRINT THEM.</span>
          <span className="text-neutral-600">✕</span>
        </div>
      </div>
    </section>
  );
}
