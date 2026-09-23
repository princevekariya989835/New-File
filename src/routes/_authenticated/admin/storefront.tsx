import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/storefront")({
  head: () => ({
    meta: [{ title: "Storefront CMS & Content Management | RIOTOUS Admin Console" }],
  }),
});
