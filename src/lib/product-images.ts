const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export interface CachedImage {
  bytes: Uint8Array;
  contentType: string;
  etag: string;
}

const MAX_CACHED_IMAGES = 200;
const _imageCache = new Map<string, CachedImage>();

export function getCachedImage(key: string): CachedImage | undefined {
  const item = _imageCache.get(key);
  if (item) {
    // Touch entry to preserve LRU ordering
    _imageCache.delete(key);
    _imageCache.set(key, item);
  }
  return item;
}

export function setCachedImage(key: string, img: CachedImage) {
  if (_imageCache.size >= MAX_CACHED_IMAGES) {
    const firstKey = _imageCache.keys().next().value;
    if (firstKey) _imageCache.delete(firstKey);
  }
  _imageCache.set(key, img);
}

export function invalidateImageCache(keyPrefix?: string) {
  if (!keyPrefix) {
    _imageCache.clear();
    return;
  }
  for (const k of _imageCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      _imageCache.delete(k);
    }
  }
}

export function productImageUrl(path: string) {
  if (!path) return "/placeholder-tee.jpg";
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/")
  ) {
    return path;
  }
  return `/api/public/product-image?path=${encodeURIComponent(path)}`;
}

export function validateImageFile(file: File) {
  if (!ALLOWED.includes(file.type) && !file.type.startsWith("image/")) {
    return `${file.name}: unsupported type (use JPG, PNG, WebP or AVIF)`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name}: too large (max 15 MB)`;
  }
  return null;
}

async function uploadViaServerFn(
  fileName: string,
  mimeType: string,
  dataBase64: string,
): Promise<string | null> {
  try {
    const { adminUploadProductMedia } = await import("@/lib/admin.functions");
    const res = await adminUploadProductMedia({
      data: { fileName, mimeType, dataBase64 },
    });
    if (res && res.ok && res.mediaUrl) {
      return res.mediaUrl;
    }
  } catch (err) {
    console.warn("[uploadProductImage] uploadViaServerFn failed:", err);
  }
  return null;
}

async function uploadToMediaEndpoint(
  fileName: string,
  mimeType: string,
  dataBase64: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    let token: string | null = null;
    try {
      token = localStorage.getItem("riotous_session");
    } catch {
      // ignore
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-riotous-session"] = token;
    }

    const res = await fetch("/api/media/upload", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        fileName,
        mimeType,
        mediaType: "image",
        dataBase64,
        sizeBytes: dataBase64.length,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.mediaUrl) {
        return data.mediaUrl;
      }
    }
  } catch (err) {
    console.warn("[uploadProductImage] Upload to /api/media/upload failed, falling back:", err);
  }
  return null;
}

async function persistImageFile(
  fileName: string,
  mimeType: string,
  dataUrl: string,
): Promise<string> {
  // 1. Try server function
  const serverFnUrl = await uploadViaServerFn(fileName, mimeType, dataUrl);
  if (serverFnUrl) return serverFnUrl;

  // 2. Try media upload HTTP endpoint
  const endpointUrl = await uploadToMediaEndpoint(fileName, mimeType, dataUrl);
  if (endpointUrl) return endpointUrl;

  // 3. Fallback to dataUrl (will be auto-persisted on server save)
  return dataUrl;
}

export async function uploadProductImage(file: File): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        try {
          const MAX_DIM = 1600;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            const resultUrl = await persistImageFile(file.name, file.type || "image/jpeg", dataUrl);
            resolve(resultUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const format = file.type === "image/png" ? "image/webp" : "image/jpeg";
          const compressed = canvas.toDataURL(format, 0.88);
          const resultUrl = await persistImageFile(file.name, format, compressed);
          resolve(resultUrl);
        } catch {
          const resultUrl = await persistImageFile(file.name, file.type || "image/jpeg", dataUrl);
          resolve(resultUrl);
        }
      };
      img.onerror = async () => {
        const resultUrl = await persistImageFile(file.name, file.type || "image/jpeg", dataUrl);
        resolve(resultUrl);
      };
      img.src = dataUrl;
    };
    reader.onerror = (e) => reject(e || new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

