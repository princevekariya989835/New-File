import { createFileRoute } from "@tanstack/react-router";
import { FeaturedCollectionView } from "@/components/featured-collection-view";

export const Route = createFileRoute("/men/latest-edition")({
  head: () => ({
    meta: [
      { title: "Men's Latest Edition | RIOTOUS Fresh Streetwear Drops" },
      {
        name: "description",
        content:
          "Discover the newest streetwear drops, limited prints, and fresh silhouettes for Men. Crafted in heavyweight combed cotton with vibrant DTF prints.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Men's Latest Edition | RIOTOUS Streetwear" },
      {
        property: "og:description",
        content:
          "Discover the newest streetwear drops, limited prints, and fresh silhouettes for Men.",
      },
      { property: "og:url", content: "https://riotous.store/men/latest-edition" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/men/latest-edition" }],
  }),
  component: MensLatestEditionDirectPage,
});

function MensLatestEditionDirectPage() {
  return (
    <FeaturedCollectionView
      collectionId="men_latest_edition"
      fallbackTitle="MEN'S LATEST EDITION"
      fallbackSubtitle="Fresh seasonal drops, limited releases, and oversized DTF graphic tees engineered for men."
      department="men"
      collectionType="latest_edition"
      backToDepartmentPath="/collections/men"
    />
  );
}

