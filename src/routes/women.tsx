import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/women")({
  beforeLoad: () => {
    throw redirect({ to: "/collections/women", replace: true });
  },
});
