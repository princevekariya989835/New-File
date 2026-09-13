import { createFileRoute } from "@tanstack/react-router";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About RIOTOUS | Premium DTF Streetwear Label India" },
      {
        name: "description",
        content:
          "RIOTOUS is a premium DTF printed streetwear label from India. Built for creators, dreamers, and streetwear lovers.",
      },
      { property: "og:title", content: "About RIOTOUS | Premium DTF Streetwear Label India" },
      {
        property: "og:description",
        content: "Premium DTF printed streetwear from India.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About RIOTOUS",
          url: "https://riotous.store/about",
          description:
            "RIOTOUS is a premium DTF-printed streetwear label from India, dedicated to heavyweight combed cotton, oversized fits, and custom prints.",
          mainEntity: {
            "@type": "Organization",
            name: "RIOTOUS",
            url: "https://riotous.store",
            logo: "https://riotous.store/favicon.svg",
            sameAs: ["https://instagram.com/riotous.store"],
          },
        }),
      },
    ],
  }),
  component: AboutPage,
});

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
      <div className="mt-10 max-w-3xl space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
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
          From conceptualizing artwork and digital prototyping to precision printing, inspection, and
          packaging, everything happens ethically in our own workshop. We cut out middlemen to deliver
          luxury-tier apparel at honest prices. We don't chase fleeting algorithms or follow
          fast-moving trends. We print them.
        </p>
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
        <p className="mt-6 text-sm uppercase tracking-widest text-background/60">
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
