import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Coupon Code & Discount Management | RIOTOUS Admin" },
      { name: "description", content: "Manage promotional discount coupons for RIOTOUS store." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
