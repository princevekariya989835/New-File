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
            sameAs: ["https://www.instagram.com/riotous_store"],
          },
        }),
      },
    ],
  }),
});
