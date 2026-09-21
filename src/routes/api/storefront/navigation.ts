import { createFileRoute } from "@tanstack/react-router";
import { getPublicWebsiteConfig } from "@/lib/website-config.functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/storefront/navigation")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },

      GET: async () => {
        try {
          const res = await getPublicWebsiteConfig();
          const navigation = Array.isArray(res.config?.navigation)
            ? res.config.navigation.filter((n) => n && n.enabled !== false)
            : [];
          return new Response(JSON.stringify({ navigation }), {
            status: 200,
            headers: CORS_HEADERS,
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Failed to fetch navigation" }),
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
