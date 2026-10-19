import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchProducts } from "@/lib/catalog";
import { getPublicWebsiteConfig } from "@/lib/website-config.functions";
import { WebsiteHomepageContent } from "@/components/website-homepage-content";
import { DEFAULT_WEBSITE_CONFIG } from "@/lib/website-config.types";

const productsQuery = {
  queryKey: ["products", "catalog", 50],
  queryFn: () => fetchProducts(50),
  staleTime: 1000 * 5,
  gcTime: 1000 * 60 * 5,
  refetchOnWindowFocus: true,
};

const websiteConfigQuery = {
  queryKey: ["website-config", "published"],
  queryFn: () => getPublicWebsiteConfig(),
  staleTime: 1000 * 60 * 10,
  gcTime: 1000 * 60 * 30,
};

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    // Fast prefetch for SSR/cached queries, capped at 400ms so initial HTML streams rapidly without server delay
    await Promise.race([
      Promise.allSettled([
        context.queryClient.ensureQueryData(websiteConfigQuery),
        context.queryClient.ensureQueryData(productsQuery),
      ]),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);
  },
  pendingComponent: () => (
    <WebsiteHomepageContent
      config={DEFAULT_WEBSITE_CONFIG}
      products={[]}
      isLoadingProducts={true}
      isPreview={false}
    />
  ),
  head: () => ({
    meta: [
      { title: "RIOTOUS — We Don't Follow Trends. We Print Them." },
      {
        name: "description",
        content:
          "Premium DTF printed streetwear made in India. Heavyweight oversized graphic tees and custom apparel for creators.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "RIOTOUS — We Don't Follow Trends. We Print Them." },
      {
        property: "og:description",
        content:
          "Premium DTF printed streetwear made in India. Heavyweight oversized graphic tees and custom apparel for creators.",
      },
      { property: "og:url", content: "https://riotous.store/" },
      { property: "og:image", content: "https://riotous.store/assets/hero-model.jpg" },
      { name: "twitter:image", content: "https://riotous.store/assets/hero-model.jpg" },
    ],
    links: [
      { rel: "canonical", href: "https://riotous.store/" },
      {
        rel: "preload",
        as: "image",
        href: "/assets/hero-model-mobile.jpg",
        imageSrcSet: "/assets/hero-model-mobile.jpg 640w, /assets/hero-model.jpg 1024w",
        imageSizes: "(max-width: 640px) 100vw, 480px",
        fetchPriority: "high",
      },
    ],
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
              logo: "https://riotous.store/assets/riotous-logo.png",
              description: "Premium DTF printed streetwear made in India.",
              sameAs: ["https://www.instagram.com/riotous_store"],
            },
            {
              "@type": "WebSite",
              "@id": "https://riotous.store/#website",
              name: "RIOTOUS",
              url: "https://riotous.store",
              publisher: { "@id": "https://riotous.store/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://riotous.store/shop?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const {
    data: rawProducts,
    isLoading: isProductsLoading,
    isPending: isProductsPending,
  } = useQuery(productsQuery);
  const { data: siteConfigData } = useQuery(websiteConfigQuery);

  const products = useMemo(() => (Array.isArray(rawProducts) ? rawProducts : []), [rawProducts]);
  const config = siteConfigData?.config ?? DEFAULT_WEBSITE_CONFIG;
  const isLoadingProducts = isProductsLoading || isProductsPending || rawProducts === undefined;

  return (
    <WebsiteHomepageContent
      config={config}
      products={products}
      isLoadingProducts={isLoadingProducts}
      isPreview={false}
    />
  );
}
