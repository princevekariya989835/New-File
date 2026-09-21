import { createFileRoute } from "@tanstack/react-router";
import { getPublishedProducts } from "@/lib/catalog";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "no-cache, must-revalidate, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/products")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },

      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limitParam = url.searchParams.get("limit");
          const categoryParam = url.searchParams.get("category");
          const limit = Math.min(200, Math.max(1, Number(limitParam) || 50));

          let products = await getPublishedProducts(limit);

          if (categoryParam && categoryParam.trim().toLowerCase() !== "all") {
            const cat = categoryParam.trim().toLowerCase();
            products = products.filter(
              (p) =>
                p.node.productType?.toLowerCase() === cat ||
                p.node.tags?.some((t) => t.toLowerCase() === cat),
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              count: products.length,
              products,
            }),
            {
              status: 200,
              headers: CORS_HEADERS,
            },
          );
        } catch (err: any) {
          console.error("[API] GET /api/products error:", err);
          return new Response(
            JSON.stringify({
              success: false,
              error: err?.message || "Failed to retrieve storefront products",
              products: [],
            }),
            {
              status: 500,
              headers: CORS_HEADERS,
            },
          );
        }
      },
    },
  },
});
