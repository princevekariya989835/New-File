import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { BrandName } from "@/components/brand-name";

export const Route = createLazyFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
      <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
        The story
      </p>
      <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
        Loud prints.
        <br />
        Quiet luxury.
      </h1>

      {/* Brand Story & Lifestyle Editorial Grid */}
      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
        <div className="lg:col-span-7">
          <div className="max-w-[65ch] space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            <p>
              <BrandName /> was born out of a relentless obsession with authenticity and modern street
              culture. In a market saturated with fast fashion knockoffs, hollow graphics, and flimsy
              fabrics, we set out to build something unapologetic: a homegrown Indian streetwear label
              where loud creative expression meets quiet, obsessive craftsmanship. We believe what you
              wear is a canvas for your identity—a declaration of who you are and what you stand for.
            </p>
            <p>
              Every single piece in our collection begins with custom-developed, 100% heavyweight combed
              cotton engineered for the perfect relaxed, oversized drape. We power our graphics with
              industrial-grade Direct-to-Film (DTF) printing technology, yielding vibrant color
              reproduction, sharp micro-details, and incredible stretch-resistance that never cracks,
              peels, or fades after repeated washes. Every seam is reinforced with durable double-needle
              construction and pre-shrunk to endure everyday wear.
            </p>
            <p>
              From conceptualizing artwork and digital prototyping to precision printing, inspection,
              and packaging, everything happens ethically in our own workshop. We cut out middlemen to
              deliver luxury-tier apparel at honest prices. We don't chase fleeting algorithms or follow
              fast-moving trends. We print them.
            </p>
          </div>

          {/* Primary CTA: Shop the Collection */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/shop"
              className="btn-primary group inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md"
            >
              <span>Shop the Collection</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Supporting Editorial Brand Imagery */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-border/60 bg-muted/20 shadow-xl group">
            <img
              src="/assets/hero-model.jpg"
              alt="RIOTOUS model wearing oversized graphic streetwear t-shirt"
              width={800}
              height={1000}
              loading="lazy"
              decoding="async"
              className="h-[380px] sm:h-[460px] lg:h-[520px] w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <span className="inline-block rounded-full bg-brand-red/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                Studio Drop • 240 GSM
              </span>
              <p className="mt-2 text-sm sm:text-base font-semibold text-white leading-snug">
                Heavyweight combed cotton. Precision DTF prints.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-24 grid gap-16 md:grid-cols-2 md:gap-24">
        <Section
          title="Mission"
          body="Put premium, expressive apparel in the hands of a new generation of creators. Every print is a statement — and every stitch is engineered to outlast the moment."
        />
        <Section
          title="Vision"
          body="Build the streetwear label India puts on the world map. Loud on design, uncompromising on craft, honest on price."
        />
        <Section
          title="Quality Promise"
          body="Heavyweight combed cotton. High-density DTF prints. Reinforced stitching. We wear-test every drop for weeks before it hits the store."
        />
        <Section
          title="Made in India"
          body="Designed, printed, packed, and shipped from our workshop. Fair wages, fair work, fair prices — from our team to your closet."
        />
      </div>

      <div className="mt-32 rounded-3xl bg-foreground p-12 text-background md:p-20">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
          "We don't follow trends. We print them."
        </h2>
        <p className="mt-6 text-sm tracking-wide text-background/70 font-medium">
          — The <BrandName /> manifesto
        </p>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        {title}
      </h2>
      <p className="mt-4 text-xl leading-relaxed tracking-tight md:text-2xl">{body}</p>
    </div>
  );
}
