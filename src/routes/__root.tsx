import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import "../styles.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCartSync } from "@/hooks/use-cart-sync";
import { useCatalogSync } from "@/lib/catalog-sync";
import { publishedWebsiteConfigQuery } from "@/hooks/use-website-config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <title>Page Not Found | RIOTOUS Streetwear Official</title>
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-black tracking-tight">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">This page hasn't been printed yet.</p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  console.error(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <title>Something Went Wrong | RIOTOUS Store Support</title>
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something didn't load.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Give it another try or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              window.location.reload();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RIOTOUS | Premium DTF Printed Streetwear India" },
      { name: "author", content: "RIOTOUS" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "RIOTOUS" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: import.meta.env.DEV ? `${appCss}?direct` : appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "preload",
        as: "image",
        href: "/assets/riotous-logo.png",
        fetchPriority: "high",
      },
      { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
    ],
    scripts: [
      {
        type: "text/javascript",
        children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-1KHJNXYQ2E');

(function() {
  function loadGtag() {
    if (window.__gtagLoaded) return;
    window.__gtagLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-1KHJNXYQ2E';
    s.async = true;
    s.fetchPriority = 'low';
    document.head.appendChild(s);
  }
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function() { setTimeout(loadGtag, 2000); });
    } else {
      setTimeout(loadGtag, 2500);
    }
    ['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach(function(ev) {
      window.addEventListener(ev, loadGtag, { once: true, passive: true });
    });
  }
})();`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

function AppShell() {
  useCartSync();
  const { queryClient } = Route.useRouteContext();
  useCatalogSync(queryClient);
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth" || location.pathname.startsWith("/auth/");

  return (
    <div className="flex min-h-screen flex-col relative">
      <SiteHeader />
      <main className={isAuthPage ? "flex-1 flex flex-col" : "flex-1 pt-16 md:pt-20"}>
        <Outlet />
      </main>
      {!isAuthPage && <SiteFooter />}
      <Toaster position="top-center" />
    </div>
  );
}
