import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Custom DTF Tee Studio | Design Your Own Shirt | RIOTOUS" },
      {
        name: "description",
        content:
          "Design your own DTF printed tee. Upload artwork, add text, place it front, back or sleeve — live preview.",
      },
      { property: "og:title", content: "Custom DTF Tee Studio | Design Your Own Shirt | RIOTOUS" },
      {
        property: "og:description",
        content: "Custom DTF printed apparel with live preview.",
      },
      { property: "og:url", content: "/design" },
    ],
    links: [{ rel: "canonical", href: "/design" }],
  }),
});
