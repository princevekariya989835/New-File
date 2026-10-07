import { createFileRoute } from "@tanstack/react-router";
import { hasAdminPanelAccess } from "@/lib/auth.types";
import { verifyAndDecodeToken } from "@/lib/auth.server";
import { testZippyyAuthentication } from "@/lib/zippyy/client";

function getSessionTokenFromRequest(request: Request): string | null {
  // 1. Authorization header (Bearer <token>)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  // 2. Cookie header (riotous_session)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [k, v] = cookie.trim().split("=");
      if (k === "riotous_session" && v) {
        return decodeURIComponent(v.trim());
      }
    }
  }

  // 3. Query string token (?token=...)
  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get("token");
    if (qToken) {
      return qToken.trim();
    }
  } catch {}

  return null;
}

function isAuthorized(request: Request): boolean {
  // Check 1: User is authenticated as staff/admin via session token/cookie
  const token = getSessionTokenFromRequest(request);
  if (token) {
    const user = verifyAndDecodeToken(token);
    if (user && hasAdminPanelAccess(user)) {
      return true;
    }
  }

  // Check 2: Direct admin verification key for browser/curl diagnostic testing
  try {
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");
    const headerKey = request.headers.get("x-zippyy-test-key");
    if (
      queryKey === "riotous-zippyy-test-2026" ||
      headerKey === "riotous-zippyy-test-2026"
    ) {
      return true;
    }
  } catch {}

  return false;
}

const RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/zippyy/auth-test")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!isAuthorized(request)) {
          return new Response(
            JSON.stringify(
              {
                success: false,
                error:
                  "Unauthorized: Admin authentication is required to test Zippyy credentials. Log in to the RIOTOUS admin panel, or provide ?key=riotous-zippyy-test-2026.",
              },
              null,
              2,
            ),
            {
              status: 401,
              headers: RESPONSE_HEADERS,
            },
          );
        }

        const result = await testZippyyAuthentication();
        return new Response(JSON.stringify(result, null, 2), {
          status: result.success ? 200 : 400,
          headers: RESPONSE_HEADERS,
        });
      },

      POST: async ({ request }: { request: Request }) => {
        if (!isAuthorized(request)) {
          return new Response(
            JSON.stringify(
              {
                success: false,
                error:
                  "Unauthorized: Admin authentication is required to test Zippyy credentials.",
              },
              null,
              2,
            ),
            {
              status: 401,
              headers: RESPONSE_HEADERS,
            },
          );
        }

        const result = await testZippyyAuthentication();
        return new Response(JSON.stringify(result, null, 2), {
          status: result.success ? 200 : 400,
          headers: RESPONSE_HEADERS,
        });
      },
    },
  },
});
