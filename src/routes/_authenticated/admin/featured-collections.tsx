import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/featured-collections")({
  head: () => ({
    meta: [
      { title: "Featured Collections Management | RIOTOUS Admin Console" },
      { name: "description", content: "Manage dynamic Men & Women Best Sellers and Latest Edition collections." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

