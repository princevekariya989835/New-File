import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getCachedImage, setCachedImage, invalidateImageCache } from "@/lib/product-images";

export { invalidateImageCache };

export const Route = createFileRoute("/api/public/product-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const productId = url.searchParams.get("id");
          const idx = Math.max(0, parseInt(url.searchParams.get("idx") || "0", 10));
          const designId = url.searchParams.get("designId");
          const side = url.searchParams.get("side");
          const rawPath = url.searchParams.get("path");

          const cacheKey = productId
            ? `prod_${productId}_${idx}`
            : designId
              ? `design_${designId}_${side || "default"}`
              : null;

          if (cacheKey) {
            const cached = getCachedImage(cacheKey);
            if (cached) {
              return new Response(cached.bytes, {
                status: 200,
                headers: {
                  "Content-Type": cached.contentType,
                  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                  "Content-Length": String(cached.bytes.byteLength),
                },
              });
            }
          }

          const sql = getSql();
          let dataUrl: string | null = null;

          if (productId) {
            const rows = await sql`
              SELECT images FROM products WHERE id::text = ${productId} LIMIT 1
            `;
            if (rows && rows.length > 0) {
              const images = Array.isArray(rows[0].images)
                ? rows[0].images
                : typeof rows[0].images === "string"
                  ? JSON.parse(rows[0].images)
                  : [];
              dataUrl = images[idx] || images[0] || null;
            }
          } else if (designId) {
            const rows = await sql`
              SELECT preview_data_url, preview_images FROM design_submissions WHERE id::text = ${designId} LIMIT 1
            `;
            if (rows && rows.length > 0) {
              if (side && rows[0].preview_images) {
                const map =
                  typeof rows[0].preview_images === "object"
                    ? rows[0].preview_images
                    : JSON.parse(rows[0].preview_images);
                dataUrl = map[side] || rows[0].preview_data_url || null;
              } else {
                dataUrl = rows[0].preview_data_url || null;
              }
            }
          } else if (rawPath) {
            dataUrl = rawPath;
          }

          if (!dataUrl) {
            return new Response("Image not found", { status: 404 });
          }

          // If the dataUrl is already an external or relative URL, redirect to it
          if (
            dataUrl.startsWith("http://") ||
            dataUrl.startsWith("https://") ||
            dataUrl.startsWith("/")
          ) {
            return Response.redirect(dataUrl, 302);
          }

          // If it is a base64 data URL: data:image/png;base64,....
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const contentType = match[1];
            const base64Data = match[2];

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            if (cacheKey) {
              setCachedImage(cacheKey, { bytes, contentType });
            }

            return new Response(bytes, {
              status: 200,
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                "Content-Length": String(bytes.byteLength),
              },
            });
          }

          return new Response("Invalid image data", { status: 400 });
        } catch (err: any) {
          console.error("[api/public/product-image] Error:", err);
          return new Response("Internal server error", { status: 500 });
        }
      },
    },
  },
});
