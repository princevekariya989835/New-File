export const MAX_REVIEW_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function reviewImageUrl(path: string): string {
  if (!path || typeof path !== "string") return "/products/zoro-black-1.jpg";
  const trimmed = path.trim();
  if (/^data:image\/(jpeg|jpg|png|webp|avif);base64,/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `/api/public/review-image?path=${encodeURIComponent(trimmed)}`;
}

export function validateReviewImage(file: File) {
  if (!ALLOWED.includes(file.type)) {
    return `${file.name}: unsupported type (use JPG, PNG, WebP or AVIF)`;
  }
  if (file.size > MAX_BYTES) return `${file.name}: too large (max 5 MB)`;
  return null;
}

export async function uploadReviewImage(file: File, _userId: string) {
  const invalid = validateReviewImage(file);
  if (invalid) throw new Error(invalid);

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
