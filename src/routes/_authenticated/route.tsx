import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { decodeToken } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";

function AuthenticatedPendingShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <div className="min-h-screen pt-16 md:pt-20">
        <div className="mx-auto flex max-w-[1600px]">
          <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-60 shrink-0 border-r bg-card/40 md:block p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-brand-red" /> Admin
            </div>
            <nav className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="rounded-lg bg-brand-red text-white font-semibold px-3 py-2">Dashboard</div>
              <div className="px-3 py-2">Orders</div>
              <div className="px-3 py-2">Products</div>
              <div className="px-3 py-2">Inventory</div>
              <div className="px-3 py-2">Returns</div>
            </nav>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="sticky top-16 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:top-20">
              <span className="text-sm font-semibold text-foreground">Store Management Console</span>
              <div className="h-8 w-8 rounded-full bg-brand-red/80 text-xs font-bold text-white flex items-center justify-center">
                A
              </div>
            </div>
            <main className="px-4 py-6 md:px-6">
              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
                <p className="mt-1 text-sm text-muted-foreground">Connecting to management console…</p>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 md:px-10 md:py-20">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Account Overview
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            My Account
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium sm:text-sm text-muted-foreground">
          <span>Orders →</span>
          <span>Returns →</span>
          <span>Favorites →</span>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/40 p-8">
        <h2 className="text-lg font-semibold text-foreground">Account Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Loading your account history and details…</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Account & Orders | RIOTOUS Official Store" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    try {
      const sessionStr =
        typeof window !== "undefined" ? localStorage.getItem("riotous_session") : null;
      if (!sessionStr) {
        throw redirect({
          to: "/auth",
          search: {
            redirect: location.pathname !== "/auth" ? location.pathname : undefined,
          },
        });
      }

      const user = decodeToken(sessionStr);
      if (!user?.id) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("riotous_session");
        }
        throw redirect({
          to: "/auth",
          search: {
            redirect: location.pathname !== "/auth" ? location.pathname : undefined,
          },
        });
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          user_metadata: { full_name: user.fullName },
        },
      };
    } catch (err: any) {
      if (err?.isRedirect || err?.to) throw err;
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.pathname !== "/auth" ? location.pathname : undefined,
        },
      });
    }
  },
  pendingComponent: AuthenticatedPendingShell,
  component: () => <Outlet />,
});
