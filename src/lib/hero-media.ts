import { uploadHeroMediaServerFn } from "./website-config.functions";

export interface UploadHeroMediaResult {
  success: boolean;
  mediaUrl: string;
  mediaId: string;
  mediaType: "image" | "video";
  fileName: string;
  sizeBytes: number;
}

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".avif", ".gif"];
export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov"];

export const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export function validateHeroMediaFile(file: File): {
  valid: boolean;
  mediaType: "image" | "video";
  error?: string;
} {
  if (!file) {
    return { valid: false, mediaType: "image", error: "No file selected." };
  }

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  const isVideo =
    mime.startsWith("video/") || ALLOWED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));

  const isImage =
    mime.startsWith("image/") || ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!isImage && !isVideo) {
    return {
      valid: false,
      mediaType: "image",
      error:
        "Unsupported file type. Please upload a valid image (JPG, PNG, WEBP, SVG) or video (MP4, WebM).",
    };
  }

  const mediaType: "image" | "video" = isVideo ? "video" : "image";

  if (mediaType === "image" && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      mediaType: "image",
      error: "Image is too large. Maximum allowed size is 25MB.",
    };
  }

  if (mediaType === "video" && file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      mediaType: "video",
      error: "Video is too large. Maximum allowed size is 100MB.",
    };
  }

  return { valid: true, mediaType };
}

export async function uploadHeroMedia(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadHeroMediaResult> {
  const validation = validateHeroMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  if (onProgress) onProgress(5);

  // 1. Try direct upload via XHR to /api/media/upload for real streaming progress
  try {
    const result = await new Promise<UploadHeroMediaResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/media/upload", true);

      let token: string | null = null;
      if (typeof window !== "undefined") {
        try {
          token = localStorage.getItem("riotous_session");
        } catch {
          // ignore
        }
      }

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("x-riotous-session", token);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.min(95, Math.round((e.loaded / e.total) * 100));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.mediaUrl) {
              if (onProgress) onProgress(100);
              resolve(data);
              return;
            }
          } catch (jsonErr) {
            // fall through
          }
        }
        reject(new Error(xhr.responseText || `Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => {
        reject(new Error("Network error during media upload."));
      };

      const formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
    });

    return result;
  } catch (xhrError) {
    console.warn(
      "[uploadHeroMedia] XHR upload attempt failed, falling back to RPC server function:",
      xhrError,
    );
  }

  // 2. Fallback to Server Function with FileReader
  if (onProgress) onProgress(30);

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = 30 + Math.round((e.loaded / e.total) * 35);
        onProgress(percent);
      }
    };
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file from disk."));
    reader.readAsDataURL(file);
  });

  if (onProgress) onProgress(70);

  const res = await uploadHeroMediaServerFn({
    data: {
      fileName: file.name,
      mimeType: file.type || (validation.mediaType === "video" ? "video/mp4" : "image/jpeg"),
      mediaType: validation.mediaType,
      dataBase64: base64Data,
      sizeBytes: file.size,
    },
  });

  if (onProgress) onProgress(100);

  return {
    success: true,
    mediaUrl: res.mediaUrl,
    mediaId: res.mediaId,
    mediaType: res.mediaType,
    fileName: res.fileName,
    sizeBytes: res.sizeBytes,
  };
}
