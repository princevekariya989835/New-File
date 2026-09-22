import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Store Preferences & Settings | RIOTOUS Admin Console" },
      {
        name: "description",
        content:
          "Configure store information, security, notifications, payments, and system preferences.",
      },
    ],
  }),
});
