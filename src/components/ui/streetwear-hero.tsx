import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { WebsiteHeroConfig } from "@/lib/website-config.types";
import heroModelFallback from "@/assets/hero-model.jpg";

interface StreetwearHeroProps {
  hero?: WebsiteHeroConfig;
  isPreview?: boolean;
}

const TICKER_ITEMS = [
  "Limited Edition Drop",
  "Stay Loud",
  "Riotous Worldwide",
  "Heavyweight 240gsm",
  "Built to Last",
  "No Compromise",
];

function TickerLine() {
  return (
    <>
      {TICKER_ITEMS.map((item) => (
        <span
          key={item}
          className="mx-6 inline-flex items-center gap-6 font-display text-xs uppercase tracking-[0.3em] text-primary-foreground/80"
        >
          {item}
          <span className="inline-block size-1.5 rounded-full bg-brand" />
        </span>
      ))}
    </>
  );
}

export function StreetwearHero({ hero }: StreetwearHeroProps) {
  if (hero && (hero.active === false || hero.enabled === false)) {
    return null;
  }

  const eyebrow = hero?.badge || "New Season Drop — Live Now";
  const rawHeading = hero?.heading?.trim() || "Wear the\nChaos.";
  const description =
    hero?.description ||
    hero?.subheading ||
    "Premium heavyweight cotton. Unauthorized designs. RIOTOUS identity for those who refuse to blend into the background.";
  const primaryCta = hero?.primaryCtaText || "Shop the drop";
  const primaryLink = hero?.primaryCtaLink || "/shop";
  const secondaryCta = hero?.secondaryCtaText || "Design your own";
  const secondaryLink = hero?.secondaryCtaLink || "/design";
  const imageSrc = hero?.imageUrl || heroModelFallback;

  // Split heading into lines, with special highlight for the final word or phrase
  const lines = rawHeading.includes("\n")
    ? rawHeading.split("\n")
    : rawHeading.toLowerCase().includes("wear the chaos")
      ? ["Wear the", "Chaos."]
      : [rawHeading];

  return (
    <section
      aria-label="RIOTOUS Streetwear Editorial Hero"
      className="relative w-full overflow-hidden bg-background font-sans select-none border-b border-border/40"
    >
      {/* Ghost background watermark, positioned cleanly above text overlap */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 sm:top-2 flex justify-center overflow-hidden select-none opacity-40 dark:opacity-30"
      >
        <span className="anim-fade-in font-display text-[22vw] uppercase leading-none italic tracking-tighter text-foreground/[0.025] dark:text-foreground/[0.04]">
          RIOT
        </span>
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-12 px-6 pt-10 pb-24 lg:grid-cols-12 md:px-10 lg:pt-16 lg:pb-32">
        {/* Left column: editorial copy & CTAs */}
        <div className="lg:col-span-7">
          {/* Eyebrow badge */}
          <div className="mask-line mb-6">
            <span
              className="anim-mask-up inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-brand"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="anim-ticker-pulse inline-block size-2 rounded-full bg-brand" />
              {eyebrow}
            </span>
          </div>

          {/* Bold Editorial Headline */}
          <h1 className="font-display leading-[0.92] tracking-tight text-foreground text-[clamp(2.5rem,6.8vw,6.5rem)]">
            {lines.map((line, idx) => {
              const isLast = idx === lines.length - 1;
              return (
                <span key={idx} className="mask-line">
                  <span
                    className="anim-mask-up"
                    style={{ animationDelay: `${0.35 + idx * 0.15}s` }}
                  >
                    {isLast ? (
                      <span className="text-brand">{line}</span>
                    ) : (
                      line
                    )}
                  </span>
                </span>
              );
            })}
          </h1>

          {/* Subtitle / Description */}
          <p
            className="anim-fade-up mt-8 max-w-[46ch] text-sm sm:text-base leading-relaxed text-muted-foreground"
            style={{ animationDelay: "0.75s" }}
          >
            {description}
          </p>

          {/* Action buttons with aligned baselines and clear hierarchy */}
          <div
            className="anim-fade-up mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "0.9s" }}
          >
            <Link
              to={primaryLink}
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden bg-foreground px-8 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-lg min-h-[48px]"
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-brand-foreground">
                {primaryCta}
              </span>
              <ArrowUpRight className="relative z-10 size-4 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-foreground" />
              <span className="absolute inset-0 -translate-x-full bg-brand transition-transform duration-400 ease-out group-hover:translate-x-0" />
              <span className="anim-sheen pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent" />
            </Link>

            <Link
              to={secondaryLink}
              className="inline-flex items-center justify-center border-2 border-foreground/30 hover:border-foreground bg-transparent hover:bg-foreground/5 px-8 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground transition-all duration-200 active:scale-[0.98] min-h-[48px]"
            >
              {secondaryCta}
            </Link>
          </div>

          {/* Streetwear metrics row */}
          <div
            className="anim-fade-up mt-14 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6"
            style={{ animationDelay: "1.1s" }}
          >
            <div>
              <p className="font-display text-2xl text-foreground">24/7</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Global dispatch
              </p>
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">50+</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Artist collabs
              </p>
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">4.9</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Avg rating
              </p>
            </div>
          </div>
        </div>

        {/* Right column: hero model showcase */}
        <div className="lg:col-span-5">
          <div
            className="anim-image-settle relative mx-auto max-w-[480px]"
            style={{ animationDelay: "0.4s" }}
          >
            {/* Signature red corner frames */}
            <div
              className="absolute -top-4 -right-4 z-10 size-20 border-t-2 border-r-2 border-brand pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-4 -left-4 z-10 size-20 border-b-2 border-l-2 border-brand pointer-events-none"
              aria-hidden="true"
            />

            {/* Model image with floating motion */}
            <div className="anim-float relative overflow-hidden bg-secondary shadow-2xl">
              <img
                src={imageSrc}
                alt="Model wearing RIOTOUS streetwear heavyweight tee"
                width={1024}
                height={1280}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="aspect-[4/5] w-full object-cover select-none"
              />
            </div>

            {/* Floating fabric tag */}
            <div
              className="anim-fade-in absolute -left-4 sm:-left-6 top-10 sm:top-14 z-20 pointer-events-none"
              style={{ animationDelay: "1.2s" }}
            >
              <div
                className="anim-float bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl ring-1 ring-border/80"
                style={{ "--float-rotate": "-3deg" } as CSSProperties}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Fabric
                </p>
                <p className="text-xs font-bold uppercase text-foreground">
                  240gsm cotton
                </p>
              </div>
            </div>

            {/* Floating price / product tag */}
            <div
              className="anim-fade-in absolute -right-3 sm:-right-4 bottom-14 sm:bottom-16 z-20 pointer-events-none"
              style={{ animationDelay: "1.4s" }}
            >
              <div
                className="anim-float bg-brand px-5 py-3 text-brand-foreground shadow-lg"
                style={
                  {
                    "--float-rotate": "2deg",
                    animationDelay: "1.1s",
                  } as CSSProperties
                }
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-90">
                  The Anarchy Tee
                </p>
                <p className="font-display text-2xl leading-none">₹999</p>
              </div>
            </div>

            {/* Official RIOTOUS Studio Brand Stamp */}
            <div
              className="anim-fade-in absolute -bottom-3 left-4 sm:left-6 z-20"
              style={{ animationDelay: "1.3s" }}
            >
              <div className="flex items-center gap-2 rounded-full bg-neutral-950/90 text-white px-3.5 py-1.5 backdrop-blur-md border border-white/15 shadow-xl text-xs font-mono tracking-wider uppercase">
                <img
                  src="/assets/riotous-logo.png"
                  alt="RIOTOUS"
                  width={64}
                  height={16}
                  className="h-3 w-auto object-contain brightness-0 invert"
                />
                <span className="text-neutral-500">|</span>
                <span className="font-semibold text-white/90 text-xs tracking-[0.15em]">
                  ARCHIVE ED.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee ticker strip across bottom of hero */}
      <div
        className="anim-fade-in relative z-20 overflow-hidden border-t border-border bg-foreground py-3"
        style={{ animationDelay: "1.2s" }}
      >
        <div className="anim-marquee flex w-max whitespace-nowrap">
          <div className="flex items-center">
            <TickerLine />
          </div>
          <div className="flex items-center" aria-hidden="true">
            <TickerLine />
          </div>
        </div>
      </div>
    </section>
  );
}
