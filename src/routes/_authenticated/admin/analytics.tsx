import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Store Analytics & Revenue Intelligence | RIOTOUS Admin" },
      {
        name: "description",
        content: "Comprehensive store analytics, revenue, inventory, and customer intelligence.",
      },
    ],
  }),
});
