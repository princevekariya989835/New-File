import { createFileRoute } from "@tanstack/react-router";
import { ensureDbSchema, getSql } from "@/lib/db";

function extractMediaId(params: any, request: Request): string {
  if (params?.id) return String(params.id);
  if (params?.$id) return String(params.$id);
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== "media") return decodeURIComponent(last);
  } catch {
    // fallback
  }
  return "";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Accept, Authorization",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, Content-Type",
};

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },

      HEAD: async ({ params, request }) => {
        const id = extractMediaId(params, request);
        if (!id) {
          return new Response(null, { status: 400, headers: CORS_HEADERS });
        }

        try {
          await ensureDbSchema();
          const sql = getSql();

          const rows = await sql`
            SELECT id, file_name, mime_type, media_type, size_bytes
            FROM website_media
            WHERE id = ${id}
            LIMIT 1
          `;

          if (!rows || rows.length === 0) {
            return new Response(null, { status: 404, headers: CORS_HEADERS });
          }

          const media = rows[0];
          const mimeType =
            media.mime_type || (media.media_type === "video" ? "video/mp4" : "image/jpeg");

          return new Response(null, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": mimeType,
              "Content-Length": String(media.size_bytes || 0),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response(null, { status: 500, headers: CORS_HEADERS });
        }
      },

      GET: async ({ params, request }) => {
        const id = extractMediaId(params, request);
        if (!id) {
          return new Response("Missing media ID", {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
          });
        }

        try {
          await ensureDbSchema();
          const sql = getSql();

          const rows = await sql`
            SELECT id, file_name, mime_type, media_type, size_bytes, data_base64
            FROM website_media
            WHERE id = ${id}
            LIMIT 1
          `;

          if (!rows || rows.length === 0) {
            return new Response("Media not found", {
              status: 404,
              headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
            });
          }

          const media = rows[0];
          let base64 = String(media.data_base64 || "").trim();
          if (base64.includes(",")) {
            base64 = base64.split(",")[1];
          }
          base64 = base64.replace(/\s+/g, "");

          const binaryBuffer = Buffer.from(base64, "base64");
          const totalSize = binaryBuffer.length;
          const mimeType =
            media.mime_type || (media.media_type === "video" ? "video/mp4" : "image/jpeg");

          const rangeHeader = request.headers.get("range");

          if (rangeHeader && rangeHeader.startsWith("bytes=")) {
            const rangeSpec = rangeHeader.substring(6).trim();
            const parts = rangeSpec.split("-");
            let start = 0;
            let end = totalSize - 1;

            if (parts[0] !== "" && parts[1] !== "") {
              start = parseInt(parts[0], 10);
              end = parseInt(parts[1], 10);
            } else if (parts[0] !== "") {
              start = parseInt(parts[0], 10);
              end = totalSize - 1;
            } else if (parts[1] !== "") {
              const suffix = parseInt(parts[1], 10);
              start = Math.max(0, totalSize - suffix);
              end = totalSize - 1;
            }

            if (
              isNaN(start) ||
              isNaN(end) ||
              start < 0 ||
              start >= totalSize ||
              end >= totalSize ||
              start > end
            ) {
              return new Response(null, {
                status: 416,
                headers: {
                  ...CORS_HEADERS,
                  "Content-Range": `bytes */${totalSize}`,
                  "Accept-Ranges": "bytes",
                },
              });
            }

            const chunkSize = end - start + 1;
            // Create a dedicated clean Uint8Array slice to ensure zero byteOffset corruption
            const chunkSlice = new Uint8Array(
              binaryBuffer.buffer.slice(
                binaryBuffer.byteOffset + start,
                binaryBuffer.byteOffset + end + 1,
              ),
            );

            return new Response(chunkSlice, {
              status: 206,
              headers: {
                ...CORS_HEADERS,
                "Content-Range": `bytes ${start}-${end}/${totalSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": String(chunkSize),
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }

          // Full content (200 OK)
          const fullSlice = new Uint8Array(
            binaryBuffer.buffer.slice(binaryBuffer.byteOffset, binaryBuffer.byteOffset + totalSize),
          );

          return new Response(fullSlice, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": mimeType,
              "Content-Length": String(totalSize),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Disposition": `inline; filename="${encodeURIComponent(media.file_name || "media")}"`,
            },
          });
        } catch (error: any) {
          console.error("[Media Serving Error]:", error);
          return new Response("Internal server error serving media", {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
          });
        }
      },
    },
  },
});
