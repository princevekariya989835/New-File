import { useState, useRef, useMemo } from "react";
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
  CheckCircle2,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { BrandName } from "@/components/brand-name";
import { ProductCard } from "@/components/product-card";
import { EmptyProducts } from "@/components/empty-products";
import { SiteLoader } from "@/components/site-loader";
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
                    {displayedProducts.map((p, idx) => (
                      <ProductCard key={p.node.id} product={p} priority={idx < 4} />
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

function WebsiteHero({ hero, isPreview }: { hero: WebsiteConfig["hero"]; isPreview: boolean }) {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!hero || (hero.enabled === false && hero.active === false)) return null;

  const isCenter = hero.alignment === "center";
  const isRight = hero.alignment === "right";

  const isVideo =
    hero.mediaType === "video" ||
    (!hero.mediaType && Boolean(hero.videoUrl && !hero.imageUrl)) ||
    Boolean(hero.videoUrl && hero.mediaType !== "image");

  const videoSrc =
    (hero.mediaType === "video"
      ? hero.mediaUrl || hero.videoUrl
      : hero.videoUrl || hero.mediaUrl) || "";
  const imageSrc =
    (hero.mediaType === "image"
      ? hero.mediaUrl || hero.imageUrl
      : hero.imageUrl || hero.mediaUrl) || "";

  return (
    <section
      key="sec-hero"
      className="relative -mt-16 flex min-h-[75svh] items-end overflow-hidden bg-neutral-950 md:-mt-20 md:min-h-[100svh]"
    >
      {isVideo && videoSrc ? (
        <video
          key={videoSrc}
          ref={(el) => {
            videoRef.current = el;
            if (el) {
              el.muted = true;
              el.defaultMuted = true;
              el.playsInline = true;
              const playPromise = el.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => setVideoLoaded(true))
                  .catch((err) => {
                    console.warn("[Hero Video Autoplay Note]:", err);
                  });
              }
            }
          }}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-95 md:opacity-90 z-0"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onLoadedData={() => {
            setVideoLoaded(true);
            setVideoError(false);
          }}
          onCanPlay={() => {
            setVideoLoaded(true);
          }}
          onError={(e) => {
            console.error("[Hero Video Render Error]: Failed to load video source", videoSrc, e);
            setVideoError(true);
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc} type="video/webm" />
          <source src={videoSrc} />
        </video>
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={hero.heading || "RIOTOUS Streetwear"}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-85 z-0"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}

      {/* Buffering animation while hero video loads */}
      {isVideo && videoSrc && !videoLoaded && !videoError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
          <SiteLoader variant="inline" size="lg" text="BUFFERING DROP..." />
        </div>
      )}

      {/* Visible error message in Admin Preview if video fails */}
      {isPreview && isVideo && videoError && (
        <div className="absolute top-20 left-4 right-4 z-30 mx-auto max-w-xl rounded-xl border border-destructive/60 bg-destructive/95 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-white mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm tracking-tight">
                Hero Video Playback Notice (Admin Preview)
              </p>
              <p className="text-xs text-white/90">
                The video from source{" "}
                <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                  {videoSrc || "empty"}
                </code>{" "}
                could not be played.
              </p>
              <p className="text-[11px] text-white/80">
                Please verify that the video format is an H.264/AAC MP4 or WebM video file and that
                the media endpoint is reachable.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/85 md:from-black/40 md:via-transparent md:to-black/85 pointer-events-none" />
      <div
        className="absolute inset-0 z-10 opacity-25 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 30%, oklch(0.62 0.22 258 / 0.4), transparent 60%), radial-gradient(ellipse at 80% 70%, oklch(0.3 0.15 258 / 0.5), transparent 60%)",
        }}
      />

      <div
        className={`relative z-20 mx-auto w-full max-w-[1400px] px-6 pb-20 pt-40 text-background md:px-10 md:pb-32 md:pt-48 ${
          isCenter ? "text-center" : isRight ? "text-right" : "text-left"
        }`}
      >
        {hero.badge && (
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-background/70">
            {hero.badge}
          </p>
        )}

        <h1 className="max-w-5xl text-[13vw] font-black leading-[0.9] tracking-[-0.04em] text-background md:text-[8.5vw] lg:text-[7rem] whitespace-pre-line inline-block">
          {hero.heading}
        </h1>

        {hero.description && (
          <p
            className={`mt-8 max-w-lg text-base text-background/80 md:text-lg ${
              isCenter ? "mx-auto" : isRight ? "ml-auto" : ""
            }`}
          >
            {hero.description}
          </p>
        )}

        <div
          className={`mt-10 flex flex-wrap gap-3 ${
            isCenter ? "justify-center" : isRight ? "justify-end" : "justify-start"
          }`}
        >
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
    </section>
  );
}
