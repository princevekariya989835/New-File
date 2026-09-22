import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing Campaigns & Promotions | RIOTOUS Admin Console" },
      { name: "description", content: "Manage marketing campaigns, performance, and discounts." },
    ],
  }),
});
