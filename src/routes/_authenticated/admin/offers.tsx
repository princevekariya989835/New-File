import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Promotions Management | RIOTOUS Admin" },
      { name: "description", content: "Manage product offers, Buy 2 Get 1 Free, and discounts for RIOTOUS store." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
