import { createFileRoute } from "@tanstack/react-router";
import { FeaturedCollectionView } from "@/components/featured-collection-view";

export const Route = createFileRoute("/women/best-sellers")({
  head: () => ({
    meta: [
      { title: "Women's Best Sellers | RIOTOUS Premium Streetwear" },
      {
        name: "description",
        content:
          "Shop top-rated women's streetwear styles, oversized boxy cuts, baby tees, and verified favorites crafted in heavyweight combed cotton.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Women's Best Sellers | RIOTOUS Streetwear" },
      {
        property: "og:description",
        content:
          "Shop top-rated women's streetwear styles, oversized boxy cuts, baby tees, and verified favorites.",
      },
      { property: "og:url", content: "https://riotous.store/women/best-sellers" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/women/best-sellers" }],
  }),
  component: WomensBestSellersDirectPage,
});

function WomensBestSellersDirectPage() {
  return (
    <FeaturedCollectionView
      collectionId="women_best_sellers"
      fallbackTitle="WOMEN'S BEST SELLERS"
      fallbackSubtitle="Curated best-selling streetwear, relaxed silhouettes, and everyday statement tees for women."
      department="women"
      collectionType="best_sellers"
      backToDepartmentPath="/collections/women"
    />
  );
}
