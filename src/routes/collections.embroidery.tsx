import { createFileRoute } from "@tanstack/react-router";
import { EmbroideryCollectionView } from "@/components/embroidery-collection-view";

export const Route = createFileRoute("/collections/embroidery")({
  head: () => ({
    meta: [
      { title: "Embroidery Collection | RIOTOUS Heavyweight Streetwear" },
      {
        name: "description",
        content:
          "Shop the premium embroidery collection at RIOTOUS. Hand-crafted high-density thread work on 240+ GSM heavyweight cotton streetwear apparel.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Embroidery Collection | RIOTOUS Streetwear" },
      {
        property: "og:description",
        content:
          "Shop the premium embroidery collection at RIOTOUS. Hand-crafted high-density thread work on heavyweight streetwear.",
      },
      { property: "og:url", content: "https://riotous.store/collections/embroidery" },
    ],
    links: [
      { rel: "canonical", href: "https://riotous.store/collections/embroidery" },
    ],
  }),
  component: EmbroideryCollectionsPage,
});

function EmbroideryCollectionsPage() {
  return <EmbroideryCollectionView />;
}

