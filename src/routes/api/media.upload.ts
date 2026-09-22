import { createFileRoute } from "@tanstack/react-router";
import { ensureDbSchema, getSql } from "@/lib/db";
import { decodeToken, isAdminEmail, hasAdminPanelAccess } from "@/lib/auth";

export const Route = createFileRoute("/api/media/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await ensureDbSchema();
          const sql = getSql();

          // Auth check
          let token: string | null = null;
          const authHeader = request.headers.get("authorization");
          if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
          }
          if (!token) {
            token = request.headers.get("x-riotous-session");
          }
          if (!token) {
            const cookieHeader = request.headers.get("cookie");
            if (cookieHeader) {
              const match = cookieHeader.match(/riotous_session=([^;]+)/);
              if (match) {
                token = decodeURIComponent(match[1]);
              }
            }
          }

          let isAdmin = false;
          let userEmail = "Admin";
          if (token) {
            const user = decodeToken(token);
            if (user && hasAdminPanelAccess(user)) {
              isAdmin = true;
              userEmail = user.email;
            }
          }

          // In dev/admin environment, allow upload if authenticated or dev admin
          if (!isAdmin) {
            return new Response(
              JSON.stringify({ error: "Unauthorized: Admin privileges required" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const contentType = request.headers.get("content-type") || "";
          let fileName = "hero-media";
          let mimeType = "image/jpeg";
          let mediaType: "image" | "video" = "image";
          let dataBase64 = "";
          let sizeBytes = 0;

          if (contentType.includes("application/json")) {
            const body = await request.json();
            fileName = body.fileName || "hero-media";
            mimeType = body.mimeType || "image/jpeg";
            mediaType = body.mediaType === "video" ? "video" : "image";
            dataBase64 = String(body.dataBase64 || "");
            sizeBytes = Number(body.sizeBytes) || 0;
          } else if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File | null;
            if (!file) {
              return new Response(JSON.stringify({ error: "No file provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            fileName = file.name || "hero-media";
            mimeType = file.type || "application/octet-stream";
            sizeBytes = file.size;
            mediaType = mimeType.startsWith("video/") ? "video" : "image";

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            dataBase64 = buffer.toString("base64");
          } else {
            return new Response(JSON.stringify({ error: "Unsupported Content-Type" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!dataBase64) {
            return new Response(JSON.stringify({ error: "Empty media content" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Validate formats
          const allowedImageMimes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/svg+xml",
            "image/gif",
            "image/avif",
          ];
          const allowedVideoMimes = [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
            "video/x-matroska",
          ];

          if (
            mediaType === "video" &&
            !allowedVideoMimes.includes(mimeType) &&
            !mimeType.startsWith("video/")
          ) {
            return new Response(
              JSON.stringify({
                error: "Unsupported video format. Please upload MP4 or WebM.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          if (
            mediaType === "image" &&
            !allowedImageMimes.includes(mimeType) &&
            !mimeType.startsWith("image/")
          ) {
            return new Response(
              JSON.stringify({
                error: "Unsupported image format. Please upload JPG, PNG, WEBP, or SVG.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Validate size (Images: 25MB, Videos: 100MB)
          const maxImageSize = 25 * 1024 * 1024;
          const maxVideoSize = 100 * 1024 * 1024;
          const actualSize =
            sizeBytes ||
            Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64").length;

          if (mediaType === "image" && actualSize > maxImageSize) {
            return new Response(
              JSON.stringify({ error: "Image is too large. Maximum allowed size is 25MB." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          if (mediaType === "video" && actualSize > maxVideoSize) {
            return new Response(
              JSON.stringify({ error: "Video is too large. Maximum allowed size is 100MB." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, "");
          if (mimeType === "image/svg+xml") {
            const rawSvg = Buffer.from(cleanBase64, "base64").toString("utf-8");
            if (/<script/i.test(rawSvg) || /on\w+\s*=/i.test(rawSvg) || /javascript:/i.test(rawSvg)) {
              return new Response(
                JSON.stringify({ error: "SVG contains unsafe scripts or executable attributes." }),
                { status: 400, headers: { "Content-Type": "application/json" } },
              );
            }
          }
          const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const now = new Date().toISOString();

          await sql`
            INSERT INTO website_media (id, file_name, mime_type, media_type, size_bytes, data_base64, created_at, created_by)
            VALUES (${mediaId}, ${fileName}, ${mimeType}, ${mediaType}, ${actualSize}, ${cleanBase64}, ${now}, ${userEmail})
          `;

          const mediaUrl = `/api/media/${mediaId}`;

          return new Response(
            JSON.stringify({
              success: true,
              mediaId,
              mediaUrl,
              mediaType,
              fileName,
              sizeBytes: actualSize,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err: any) {
          console.error("[Media Upload Error]:", err);
          return new Response(JSON.stringify({ error: err.message || "Failed to upload media" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
