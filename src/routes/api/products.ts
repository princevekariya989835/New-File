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
          const departmentParam = url.searchParams.get("department");
          const limit = Math.min(200, Math.max(1, Number(limitParam) || 200));

          let products = await getPublishedProducts(limit);

          if (departmentParam && departmentParam.trim().toLowerCase() !== "all") {
            const dept = departmentParam.trim().toLowerCase();
            products = products.filter((p) => {
              const d = (p.node.department || "men").toLowerCase();
              return d === dept || d === "unisex";
            });
          }

          if (categoryParam && categoryParam.trim().toLowerCase() !== "all") {
            const cat = categoryParam.trim().toLowerCase();
            const normCat = cat.replace(/[-_\s]+/g, " ");
            products = products.filter(
              (p) => {
                const pType = (p.node.productType || "").toLowerCase();
                const normPType = pType.replace(/[-_\s]+/g, " ");
                return (
                  pType === cat ||
                  normPType === normCat ||
                  p.node.tags?.some((t) => {
                    const lt = t.toLowerCase();
                    return lt === cat || lt.replace(/[-_\s]+/g, " ") === normCat;
                  })
                );
              },
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
