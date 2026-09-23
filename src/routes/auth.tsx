import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign Up & Sign In | RIOTOUS Streetwear Official" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Sign up or sign in to your RIOTOUS account to shop, save custom designs and track orders.",
      },
      { property: "og:title", content: "Sign Up & Sign In | RIOTOUS Streetwear Official" },
      {
        property: "og:description",
        content: "Sign up or sign in to your RIOTOUS account to shop, save custom designs and track orders.",
      },
    ],
  }),
});
