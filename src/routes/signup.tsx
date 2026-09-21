import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search: {
        redirect: typeof (search as any)?.redirect === "string" ? (search as any).redirect : undefined,
        mode: "signup",
      },
      replace: true,
    });
  },
  head: () => ({
    meta: [
      { title: "Sign Up | RIOTOUS Streetwear Official" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
