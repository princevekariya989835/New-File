import { createFileRoute } from "@tanstack/react-router";
import { FeaturedCollectionView } from "@/components/featured-collection-view";

export const Route = createFileRoute("/women/latest-edition")({
  head: () => ({
    meta: [
      { title: "Women's Latest Edition | RIOTOUS New Streetwear Drops" },
      {
        name: "description",
        content:
          "Discover the newest women's streetwear drops, fitted baby tees, raw-hem crops, and oversized graphic tees designed for effortless drape.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Women's Latest Edition | RIOTOUS Streetwear" },
      {
        property: "og:description",
        content:
          "Discover the newest women's streetwear drops, fitted baby tees, raw-hem crops, and oversized graphic tees.",
      },
      { property: "og:url", content: "https://riotous.store/women/latest-edition" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/women/latest-edition" }],
  }),
  component: WomensLatestEditionDirectPage,
});

function WomensLatestEditionDirectPage() {
  return (
    <FeaturedCollectionView
      collectionId="women_latest_edition"
      fallbackTitle="WOMEN'S LATEST EDITION"
      fallbackSubtitle="New seasonal arrivals, cropped fits, baby tees, and oversized streetwear engineered for women."
      department="women"
      collectionType="latest_edition"
      backToDepartmentPath="/collections/women"
    />
  );
}

