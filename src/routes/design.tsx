import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Custom DTF Tee Studio | Design Your Own Shirt | RIOTOUS" },
      {
        name: "description",
        content:
          "Design your own DTF printed streetwear tee. Upload artwork, add custom text, place it front, back or sleeve with live 3D preview. Made in India.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Custom DTF Tee Studio | Design Your Own Shirt | RIOTOUS" },
      {
        property: "og:description",
        content:
          "Design your own DTF printed streetwear tee. Upload artwork, add custom text, place it front, back or sleeve with live 3D preview. Made in India.",
      },
      { property: "og:url", content: "https://riotous.store/design" },
      { property: "og:image", content: "https://riotous.store/assets/tee-black-front.webp" },
      { name: "twitter:image", content: "https://riotous.store/assets/tee-black-front.webp" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/design" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "RIOTOUS Custom DTF Studio",
          url: "https://riotous.store/design",
          description: "Online 3D streetwear tee customizer and DTF print studio.",
          applicationCategory: "DesignApplication",
          operatingSystem: "All",
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
              name: "Design Studio",
              item: "https://riotous.store/design",
            },
          ],
        }),
      },
    ],
  }),
});
