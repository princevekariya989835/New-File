import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteLoader } from "@/components/site-loader";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Authenticating Your Account | RIOTOUS Official Store" },
      { name: "description", content: "Completing your RIOTOUS sign-in." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/", replace: true });
  }, [navigate]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <SiteLoader size="md" text="AUTHENTICATING..." subtext="Redirecting you to RIOTOUS…" />
    </div>
  );
}
