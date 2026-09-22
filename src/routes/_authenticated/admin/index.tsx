import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview & Live Metrics | RIOTOUS Management" },
      {
        name: "description",
        content: "Overview and real-time business metrics for RIOTOUS store.",
      },
    ],
  }),
});
