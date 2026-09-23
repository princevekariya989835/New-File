import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping Rates & Courier Rules | RIOTOUS Admin Store" },
      {
        name: "description",
        content: "Manage store shipments, carriers, tracking, and delivery performance.",
      },
    ],
  }),
});
