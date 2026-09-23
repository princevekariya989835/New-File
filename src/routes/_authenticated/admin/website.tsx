import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/website")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/storefront", replace: true });
  },
  component: () => null,
  head: () => ({
    meta: [{ title: "Storefront CMS | RIOTOUS Admin Console" }],
  }),
});
