import { createFileRoute } from "@tanstack/react-router";
import { getPublicWebsiteConfig } from "@/lib/website-config.functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/storefront/settings")({
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
          const { general, announcement, seo, settings } = res.config;
          return new Response(
            JSON.stringify({
              general,
              announcement,
              seo: {
                metaTitle: seo.metaTitle,
                metaDescription: seo.metaDescription,
                homepageTitle: seo.homepageTitle,
                homepageDescription: seo.homepageDescription,
                shopTitle: seo.shopTitle,
                shopDescription: seo.shopDescription,
                ogImageUrl: seo.ogImageUrl,
                canonicalUrl: seo.canonicalUrl,
              },
              settings,
            }),
            {
              status: 200,
              headers: CORS_HEADERS,
            },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Failed to fetch settings" }),
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
