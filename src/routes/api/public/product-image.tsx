import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getCachedImage, setCachedImage, invalidateImageCache } from "@/lib/product-images";

export { invalidateImageCache };

function checkNoneMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) return false;
  return ifNoneMatch === etag || ifNoneMatch === `W/${etag}` || ifNoneMatch.includes(etag);
}

export const Route = createFileRoute("/api/public/product-image")({
  server: {
    handlers: {
      HEAD: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const productId = url.searchParams.get("id");
          const colorParam = url.searchParams.get("color");
          const idx = Math.max(0, parseInt(url.searchParams.get("idx") || "0", 10));
          const designId = url.searchParams.get("designId");
          const side = url.searchParams.get("side");
          const widthParam = url.searchParams.get("w") || url.searchParams.get("width");

          const cacheKey = productId
            ? `prod_${productId}_${colorParam ? `col_${encodeURIComponent(colorParam)}_` : ""}${idx}${widthParam ? `_w${widthParam}` : ""}`
            : designId
              ? `design_${designId}_${side || "default"}${widthParam ? `_w${widthParam}` : ""}`
              : null;

          if (cacheKey) {
            const cached = getCachedImage(cacheKey);
            if (cached) {
              if (checkNoneMatch(request, cached.etag)) {
                return new Response(null, {
                  status: 304,
                  headers: {
                    ETag: cached.etag,
                    "Cache-Control": "public, max-age=31536000, immutable",
                  },
                });
              }
              return new Response(null, {
                status: 200,
                headers: {
                  "Content-Type": cached.contentType,
                  "Cache-Control": "public, max-age=31536000, immutable",
                  "Content-Length": String(cached.bytes.byteLength),
                  ETag: cached.etag,
                },
              });
            }
          }
          return new Response(null, {
            status: 200,
            headers: {
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response(null, { status: 500 });
        }
      },

      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const productId = url.searchParams.get("id");
          const colorParam = url.searchParams.get("color");
          const idx = Math.max(0, parseInt(url.searchParams.get("idx") || "0", 10));
          const designId = url.searchParams.get("designId");
          const side = url.searchParams.get("side");
          const rawPath = url.searchParams.get("path");
          const widthParam = url.searchParams.get("w") || url.searchParams.get("width");

          const cacheKey = productId
            ? `prod_${productId}_${colorParam ? `col_${encodeURIComponent(colorParam)}_` : ""}${idx}${widthParam ? `_w${widthParam}` : ""}`
            : designId
              ? `design_${designId}_${side || "default"}${widthParam ? `_w${widthParam}` : ""}`
              : rawPath
                ? `path_${encodeURIComponent(rawPath)}${widthParam ? `_w${widthParam}` : ""}`
                : null;

          if (cacheKey) {
            const cached = getCachedImage(cacheKey);
            if (cached) {
              if (checkNoneMatch(request, cached.etag)) {
                return new Response(null, {
                  status: 304,
                  headers: {
                    ETag: cached.etag,
                    "Cache-Control": "public, max-age=31536000, immutable",
                  },
                });
              }
              return new Response(cached.bytes as unknown as BodyInit, {
                status: 200,
                headers: {
                  "Content-Type": cached.contentType,
                  "Cache-Control": "public, max-age=31536000, immutable",
                  "Content-Length": String(cached.bytes.byteLength),
                  ETag: cached.etag,
                },
              });
            }
          }

          const sql = getSql();
          let dataUrl: string | null = null;

          if (productId) {
            const rows = await sql`
              SELECT images, color_variants FROM products WHERE id::text = ${productId} LIMIT 1
            `;
            if (rows && rows.length > 0) {
              if (colorParam) {
                const cvList = Array.isArray(rows[0].color_variants)
                  ? rows[0].color_variants
                  : typeof rows[0].color_variants === "string"
                    ? JSON.parse(rows[0].color_variants)
                    : [];
                const matchCv = cvList.find(
                  (c: any) =>
                    String(c?.name || "").trim().toLowerCase() === colorParam.trim().toLowerCase(),
                );
                if (matchCv?.imageUrl) {
                  dataUrl = matchCv.imageUrl;
                }
              }
              if (!dataUrl) {
                const images = Array.isArray(rows[0].images)
                  ? rows[0].images
                  : typeof rows[0].images === "string"
                    ? JSON.parse(rows[0].images)
                    : [];
                dataUrl = images[idx] || images[0] || null;
              }
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

          // If the dataUrl recursively refers to /api/public/product-image, resolve or fall back to images[0]
          if (dataUrl.startsWith("/api/public/product-image")) {
            if (productId && idx !== 0) {
              // Try fallback to image 0
              const rows = await sql`SELECT images FROM products WHERE id::text = ${productId} LIMIT 1`;
              const images = Array.isArray(rows?.[0]?.images)
                ? rows[0].images
                : typeof rows?.[0]?.images === "string"
                  ? JSON.parse(rows[0].images)
                  : [];
              const firstImg = images[0];
              if (firstImg && firstImg !== dataUrl && !firstImg.startsWith("/api/public/product-image")) {
                dataUrl = firstImg;
              } else {
                return new Response("Image not found", { status: 404 });
              }
            } else {
              return new Response("Image not found", { status: 404 });
            }
          }

          // If the dataUrl is a local relative asset path, redirect safely
          if (dataUrl.startsWith("/") && !dataUrl.startsWith("//") && !dataUrl.includes("\\")) {
            return Response.redirect(dataUrl, 302);
          }

          // Allow trusted external image origins only
          if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
            try {
              const parsed = new URL(dataUrl);
              const allowedHosts = [
                "riotous.store",
                "localhost",
                "images.unsplash.com",
                "res.cloudinary.com",
              ];
              if (
                allowedHosts.includes(parsed.hostname) ||
                parsed.hostname.endsWith(".workers.dev") ||
                parsed.hostname.endsWith(".riotous.store")
              ) {
                return Response.redirect(dataUrl, 302);
              }
            } catch {
              // invalid url
            }
            return new Response("Invalid external image URL", { status: 400 });
          }

          // If it is a base64 data URL: strictly require safe image MIME type
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const contentType = match[1].toLowerCase().trim();
            const allowedImageMimes = [
              "image/jpeg",
              "image/jpg",
              "image/png",
              "image/webp",
              "image/avif",
              "image/gif",
            ];
            if (!allowedImageMimes.includes(contentType)) {
              return new Response("Unsupported or unsafe image format", { status: 400 });
            }

            try {
              const base64Data = match[2].replace(/[\r\n\s]/g, "");
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              const etag = `"${(cacheKey || "img").replace(/[^a-zA-Z0-9_-]/g, "_")}-${bytes.byteLength}"`;

              if (cacheKey) {
                setCachedImage(cacheKey, { bytes, contentType, etag });
              }

              if (checkNoneMatch(request, etag)) {
                return new Response(null, {
                  status: 304,
                  headers: {
                    ETag: etag,
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "X-Content-Type-Options": "nosniff",
                  },
                });
              }

              return new Response(bytes as unknown as BodyInit, {
                status: 200,
                headers: {
                  "Content-Type": contentType,
                  "Cache-Control": "public, max-age=31536000, immutable",
                  "Content-Length": String(bytes.byteLength),
                  "X-Content-Type-Options": "nosniff",
                  ETag: etag,
                },
              });
            } catch {
              return new Response("Invalid base64 payload", { status: 400 });
            }
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
