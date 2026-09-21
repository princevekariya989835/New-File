import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminStorefrontManagement } from "./storefront";

export const Route = createFileRoute("/_authenticated/admin/website")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/storefront", replace: true });
  },
  component: AdminStorefrontManagement,
  head: () => ({
    meta: [{ title: "Storefront CMS | RIOTOUS Admin Console" }],
  }),
});
