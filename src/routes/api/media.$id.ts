import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

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
  "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, Content-Type",
};

interface CachedMediaItem {
  binaryBuffer: Buffer;
  mimeType: string;
  fileName: string;
  totalSize: number;
  etag: string;
}

const MAX_CACHED_MEDIA = 100;
const _mediaCache = new Map<string, CachedMediaItem>();


function getCachedMedia(id: string): CachedMediaItem | undefined {
  const item = _mediaCache.get(id);
  if (item) {
    _mediaCache.delete(id);
    _mediaCache.set(id, item);
  }
  return item;
}

function setCachedMedia(id: string, item: CachedMediaItem) {
  if (_mediaCache.size >= MAX_CACHED_MEDIA) {
    const oldest = _mediaCache.keys().next().value;
    if (oldest) _mediaCache.delete(oldest);
  }
  _mediaCache.set(id, item);
}

function checkNoneMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) return false;
  return ifNoneMatch === etag || ifNoneMatch === `W/${etag}` || ifNoneMatch.includes(etag);
}

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

        // Cache hit path: skip ensureDbSchema and SQL query completely
        const cached = getCachedMedia(id);
        if (cached) {
          if (checkNoneMatch(request, cached.etag)) {
            return new Response(null, {
              status: 304,
              headers: {
                ...CORS_HEADERS,
                ETag: cached.etag,
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }
          return new Response(null, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": cached.mimeType,
              "Content-Length": String(cached.totalSize),
              "Accept-Ranges": "bytes",
              ETag: cached.etag,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }

        try {
          await guardEnsureSchema();
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
          const totalSize = Number(media.size_bytes || 0);
          const mimeType =
            media.mime_type || (media.media_type === "video" ? "video/mp4" : "image/jpeg");
          const etag = `"${id}-${totalSize}"`;

          if (checkNoneMatch(request, etag)) {
            return new Response(null, {
              status: 304,
              headers: {
                ...CORS_HEADERS,
                ETag: etag,
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }

          return new Response(null, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": mimeType,
              "Content-Length": String(totalSize),
              "Accept-Ranges": "bytes",
              ETag: etag,
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
          let cached = getCachedMedia(id);

          if (!cached) {
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
            const fileName = media.file_name || "media";
            const etag = `"${id}-${totalSize}"`;

            cached = {
              binaryBuffer,
              mimeType,
              fileName,
              totalSize,
              etag,
            };
            setCachedMedia(id, cached);
          }

          // Check ETag
          if (checkNoneMatch(request, cached.etag)) {
            return new Response(null, {
              status: 304,
              headers: {
                ...CORS_HEADERS,
                ETag: cached.etag,
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }

          const { binaryBuffer, totalSize, mimeType, fileName, etag } = cached;
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
                  ETag: etag,
                },
              });
            }

            const chunkSize = end - start + 1;
            const chunkSlice = new Uint8Array(
              binaryBuffer.buffer.slice(
                binaryBuffer.byteOffset + start,
                binaryBuffer.byteOffset + end + 1,
              ),
            );

            return new Response(chunkSlice as unknown as BodyInit, {
              status: 206,
              headers: {
                ...CORS_HEADERS,
                "Content-Range": `bytes ${start}-${end}/${totalSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": String(chunkSize),
                "Content-Type": mimeType,
                ETag: etag,
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }

          // Full content (200 OK)
          const fullSlice = new Uint8Array(
            binaryBuffer.buffer.slice(binaryBuffer.byteOffset, binaryBuffer.byteOffset + totalSize),
          );

          const isSvg = mimeType === "image/svg+xml";
          return new Response(fullSlice as unknown as BodyInit, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": mimeType,
              "Content-Length": String(totalSize),
              "Accept-Ranges": "bytes",
              "X-Content-Type-Options": "nosniff",
              ...(isSvg
                ? {
                    "Content-Security-Policy":
                      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
                  }
                : {}),
              ETag: etag,
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
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
