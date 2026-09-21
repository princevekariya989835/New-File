import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search: {
        redirect: typeof (search as any)?.redirect === "string" ? (search as any).redirect : undefined,
        mode: "signin",
      },
      replace: true,
    });
  },
  head: () => ({
    meta: [
      { title: "Sign In | RIOTOUS Streetwear Official" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
