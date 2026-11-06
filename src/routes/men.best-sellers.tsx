import { createFileRoute } from "@tanstack/react-router";
import { FeaturedCollectionView } from "@/components/featured-collection-view";

export const Route = createFileRoute("/men/best-sellers")({
  head: () => ({
    meta: [
      { title: "Men's Best Sellers | RIOTOUS Heavyweight Streetwear" },
      {
        name: "description",
        content:
          "Shop the verified best-selling streetwear tees, drop-shoulder fits, and customer favorites for Men. Heavyweight 240+ GSM cotton made in India.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Men's Best Sellers | RIOTOUS Streetwear" },
      {
        property: "og:description",
        content:
          "Shop the verified best-selling streetwear tees, drop-shoulder fits, and customer favorites for Men.",
      },
      { property: "og:url", content: "https://riotous.store/men/best-sellers" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/men/best-sellers" }],
  }),
  component: MensBestSellersDirectPage,
});

function MensBestSellersDirectPage() {
  return (
    <FeaturedCollectionView
      collectionId="men_best_sellers"
      fallbackTitle="MEN'S BEST SELLERS"
      fallbackSubtitle="Verified customer favorites and top-selling heavyweight streetwear engineered for men."
      department="men"
      collectionType="best_sellers"
      backToDepartmentPath="/collections/men"
    />
  );
}

