import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory & Stock Management | RIOTOUS Admin Console" },
      { name: "description", content: "Track stock levels, variants, and inventory transactions." },
    ],
  }),
});
