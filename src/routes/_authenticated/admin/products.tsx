import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Product Catalog Management | RIOTOUS Admin Console" },
      { name: "description", content: "Manage store products, variants, pricing, and inventory across Men, Women, and Unisex collections." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
