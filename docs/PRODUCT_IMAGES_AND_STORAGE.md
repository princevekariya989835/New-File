# RIOTOUS Product Images & Media Storage Architecture

> **Storage Model**: In-Database Media Storage (`website_media`) + Edge Binary Streaming + CDN Micro-Caching  
> **Key Files**: `src/lib/product-images.ts`, `src/routes/api/media.$id.ts`, `src/routes/api/public/product-image.tsx`, `src/routes/api/media.upload.ts`

This guide explains how images, banners, and media files are stored, streamed, and cached in the RIOTOUS ecommerce application.

---

## 1. Storage Architecture Overview

Rather than incurring external S3 or cloud storage fees and managing fragile third-party authentication tokens, RIOTOUS stores all site assets, hero banners, and uploaded product imagery directly in the database:
- **Primary Table**: `website_media`
  - `id`: Unique asset ID (e.g. `'med_hero_banner_01'`).
  - `file_name`: Original file name (e.g. `'oversized-tee-front.webp'`).
  - `mime_type`: Content type (e.g. `'image/webp'`, `'image/jpeg'`, `'video/mp4'`).
  - `size_bytes`: File size in bytes.
  - `data_base64`: Stored base64 data string.
  - `created_at`, `uploaded_by`: Audit metadata.
- **Benefits**:
  1. Zero external infrastructure dependencies or egress billing.
  2. Immediate atomic backup and restore alongside database migrations.
  3. Consistent sub-10ms delivery when served via Cloudflare Workers and cached at the edge.

---

## 2. Ingestion & Upload Pipeline (`src/routes/api/media.upload.ts`)

1. **Admin Form Submission**:
   - The admin selects an image via `src/components/admin/hero-media-uploader.tsx` or `product-details-editor.tsx`.
2. **Pre-Processing**:
   - The file is converted to a base64 payload.
3. **Upload Request**:
   - Sends `POST /api/media/upload` requiring staff authentication (`requireAuth`).
4. **Database Insertion**:
   - Inserts record into `website_media` and returns `{ id, url: '/api/media/' + id }`.
5. **Cache Invalidation**:
   - Calls `invalidateImageCache()` in `src/lib/product-images.ts`.

---

## 3. High-Performance Streaming Endpoints

### 3.1 Global Media Streamer (`GET /api/media/:id`)
- **File**: `src/routes/api/media.$id.ts`
- **Range Requests**: Supports HTTP `Range: bytes=0-1024` headers, enabling seamless scrubbing of MP4 video banners.
- **ETags & 304 Not Modified**: Automatically computes hash-based ETags. Returns `304 Not Modified` on repeat client visits.
- **CDN Caching**: Serves with `Cache-Control: public, max-age=31536000, immutable`.

### 3.2 Product Variant Streamer (`GET /api/public/product-image`)
- **File**: `src/routes/api/public/product-image.tsx`
- **Parameters**: `id` (Product ID), `color` (Variant Color), `idx` (Image Index), `v` (Cache-busting timestamp).
- **Optimization**: Resolves image arrays from `products` or `product_variants` and returns clean binary WebP/JPEG responses instead of raw inline base64 HTML strings.

---

## 4. In-Memory LRU Micro-Caching (`src/lib/product-images.ts`)

To avoid repeated database read queries for popular images:
```typescript
interface CachedImage {
  buffer: Uint8Array;
  mimeType: string;
  etag: string;
}

const MAX_CACHED_IMAGES = 200;
const _imageCache = new Map<string, CachedImage>();

export function getCachedImage(key: string): CachedImage | undefined {
  const item = _imageCache.get(key);
  if (item) {
    _imageCache.delete(key);
    _imageCache.set(key, item); // LRU refresh
  }
  return item;
}

export function invalidateImageCache() {
  _imageCache.clear();
}
```

---

## 5. Edge CDN Caching Directives (`vite.config.ts`)

Nitro route rules configure Cloudflare's edge cache automatically:
- `/assets/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/products/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/api/media/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/api/public/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/_server/**` & `/api/**`: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
