import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff Permissions & Accounts | RIOTOUS Admin Console" },
      { name: "description", content: "Manage administrators, managers, and staff accounts." },
    ],
  }),
});
