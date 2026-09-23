import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customer Directory & Profiles | RIOTOUS Admin Console" },
      {
        name: "description",
        content: "Manage store customers, orders, spending, and account status.",
      },
    ],
  }),
});
