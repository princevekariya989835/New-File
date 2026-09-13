import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchProducts } from "@/lib/catalog";
import { getPublicWebsiteConfig } from "@/lib/website-config.functions";
import { WebsiteHomepageContent } from "@/components/website-homepage-content";
import { DEFAULT_WEBSITE_CONFIG } from "@/lib/website-config.types";

const productsQuery = {
  queryKey: ["products", "home"],
  queryFn: () => fetchProducts(8),
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
};

const websiteConfigQuery = {
  queryKey: ["website-config", "published"],
  queryFn: () => getPublicWebsiteConfig(),
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
};

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.allSettled([
      context.queryClient.ensureQueryData(websiteConfigQuery),
      context.queryClient.ensureQueryData(productsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "RIOTOUS — We Don't Follow Trends. We Print Them." },
      {
        name: "description",
        content:
          "Premium DTF printed streetwear made in India. Custom apparel for creators, dreamers, and streetwear lovers.",
      },
      { property: "og:title", content: "RIOTOUS — Premium DTF Streetwear" },
      {
        property: "og:description",
        content: "Premium DTF printed streetwear made in India. Custom apparel for creators.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://riotous.store/#organization",
              name: "RIOTOUS",
              url: "https://riotous.store",
              logo: "https://riotous.store/favicon.ico",
              description: "Premium DTF printed streetwear made in India.",
            },
            {
              "@type": "WebSite",
              "@id": "https://riotous.store/#website",
              name: "RIOTOUS",
              url: "https://riotous.store",
              publisher: { "@id": "https://riotous.store/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: rawProducts = [] } = useQuery(productsQuery);
  const { data: siteConfigData } = useQuery(websiteConfigQuery);

  const products = useMemo(() => (Array.isArray(rawProducts) ? rawProducts : []), [rawProducts]);
  const config = siteConfigData?.config ?? DEFAULT_WEBSITE_CONFIG;

  return <WebsiteHomepageContent config={config} products={products} isPreview={false} />;
}
