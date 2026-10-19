import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { setCloudflareEnv } from "./lib/db";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function applySecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);

  // Prevent MIME-sniffing
  if (!headers.has("x-content-type-options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }

  // Clickjacking protection: SAMEORIGIN
  if (!headers.has("x-frame-options")) {
    headers.set("X-Frame-Options", "SAMEORIGIN");
  }

  // Referrer Policy: Send full origin on HTTPS, omit or trim on downgrade
  if (!headers.has("referrer-policy")) {
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  // Permissions-Policy: disable sensitive device APIs not used by the storefront
  if (!headers.has("permissions-policy")) {
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(self 'https://checkout.razorpay.com')",
    );
  }

  // Strict-Transport-Security (1 year, includeSubDomains) on HTTPS/production
  try {
    const isLocalHttp = request.url.includes("localhost:") || request.url.includes("127.0.0.1:");
    if (!isLocalHttp && !headers.has("strict-transport-security")) {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  } catch {
    // ignore
  }

  // Last-Modified header for appropriate public GET pages
  if (request.method === "GET" && response.status === 200 && !headers.has("last-modified")) {
    headers.set("Last-Modified", new Date().toUTCString());
  }

  // Ensure 404 responses have X-Robots-Tag: noindex
  if (response.status === 404 && !headers.has("x-robots-tag")) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Ensure private routes have HTTP-level X-Robots-Tag protection
  const url = new URL(request.url);
  const path = url.pathname;
  if (
    path.startsWith("/admin") ||
    path.startsWith("/account") ||
    path.startsWith("/checkout") ||
    path.startsWith("/auth") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/api")
  ) {
    if (!path.startsWith("/api/media") && !path.startsWith("/api/public")) {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  }

  // Content-Security-Policy for HTML responses
  const contentType = headers.get("content-type") ?? "";
  if (contentType.includes("text/html") && !headers.has("content-security-policy")) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://cdn.jsdelivr.net https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' data: blob: https:",
      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://api.zippyy.in https://sellingpartnerapi-in.zippyy.ai https://api.brevo.com https://*.neon.tech https://*.workers.dev https://www.google-analytics.com https://analytics.google.com data: blob:",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    headers.set("Content-Security-Policy", csp);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      setCloudflareEnv(env);

      // SEO & Canonical URL Normalization (HTTP 301 Permanent Redirects)
      if (request.method === "GET") {
        const url = new URL(request.url);

        // 1. Normalize www -> apex domain
        if (url.hostname === "www.riotous.store") {
          url.hostname = "riotous.store";
          return Response.redirect(url.toString(), 301);
        }

        const pathname = url.pathname;

        // 2. Redirect standard catalog aliases to canonical /shop
        if (
          pathname === "/products" ||
          pathname === "/products/" ||
          pathname === "/collections" ||
          pathname === "/collections/" ||
          pathname === "/catalog" ||
          pathname === "/catalog/" ||
          pathname === "/product" ||
          pathname === "/product/"
        ) {
          const target = new URL("/shop", url.origin);
          target.search = url.search;
          return Response.redirect(target.toString(), 301);
        }

        // 3. Normalize auth aliases to /auth with HTTP 301
        if (pathname === "/login" || pathname === "/login/") {
          const target = new URL("/auth", url.origin);
          target.search = url.search || "?mode=signin";
          return Response.redirect(target.toString(), 301);
        }
        if (pathname === "/signup" || pathname === "/signup/") {
          const target = new URL("/auth", url.origin);
          target.search = url.search || "?mode=signup";
          return Response.redirect(target.toString(), 301);
        }

        // 4. Trailing slash normalization: /shop/ -> /shop (301 Permanent)
        if (pathname.length > 1 && pathname.endsWith("/") && !pathname.includes(".")) {
          const cleanPath = pathname.replace(/\/+$/, "");
          const target = new URL(cleanPath, url.origin);
          target.search = url.search;
          return Response.redirect(target.toString(), 301);
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized, request);
    } catch (error) {
      console.error(error);
      const errRes = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applySecurityHeaders(errRes, request);
    }
  },
};
