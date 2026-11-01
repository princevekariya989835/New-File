import { createFileRoute } from "@tanstack/react-router";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About RIOTOUS | Premium DTF Streetwear Label India" },
      {
        name: "description",
        content:
          "RIOTOUS is a premium DTF printed streetwear label from India. Dedicated to heavyweight combed cotton, oversized fits, and creator apparel.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "About RIOTOUS | Premium DTF Streetwear Label India" },
      {
        property: "og:description",
        content:
          "RIOTOUS is a premium DTF printed streetwear label from India. Dedicated to heavyweight combed cotton, oversized fits, and creator apparel.",
      },
      { property: "og:url", content: "https://riotous.store/about" },
      { property: "og:image", content: "https://riotous.store/assets/hero-model.jpg" },
      { name: "twitter:image", content: "https://riotous.store/assets/hero-model.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/about" }],
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
            logo: "https://riotous.store/assets/riotous-logo.png",
            sameAs: ["https://www.instagram.com/riotous_store"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://riotous.store/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "About",
              item: "https://riotous.store/about",
            },
          ],
        }),
      },
    ],
  }),
});
