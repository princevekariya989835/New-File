import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { REVIEW_STATUSES, type AdminReview, type ReviewStatus } from "@/lib/reviews-shared";
import { getSql, ensureDbSchema } from "@/lib/db";
import { invalidateCatalogCache } from "@/lib/catalog";

function toIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") {
    const s = val.trim();
    if (s.includes(" ") && !s.includes("T")) {
      const parsed = new Date(s.replace(" ", "T") + "Z");
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = new Date(val);
  return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function parseImagesJson(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      return [];
    }
  }
  return [];
}

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminReview[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT 
        r.id, 
        r.product_id, 
        r.user_id, 
        r.author_name, 
        r.rating, 
        r.title, 
        r.content as review, 
        r.images, 
        r.is_verified_buyer as verified_purchase,
        r.status, 
        r.created_at, 
        r.updated_at, 
        r.admin_note, 
        r.is_sample, 
        p.id as matched_product_id,
        p.name as product_name, 
        p.slug as product_slug, 
        p.images as product_images,
        prof.email as customer_email, 
        prof.full_name as customer_name,
        ord_match.matched_order_id as matched_order_id
      FROM reviews r
      LEFT JOIN products p ON (r.product_id = p.id OR r.product_id = p.slug)
      LEFT JOIN profiles prof ON r.user_id = prof.id
      LEFT JOIN (
        SELECT o.id as matched_order_id, o.user_id, i.product_id
        FROM orders o
        JOIN order_items i ON o.id = i.order_id
        WHERE LOWER(o.status) = 'delivered'
      ) ord_match ON ord_match.user_id = r.user_id AND (ord_match.product_id = r.product_id OR ord_match.product_id = p.id)
      ORDER BY r.created_at DESC
      LIMIT 500
    `;

    return rows.map((r: any) => {
      const pImages = parseImagesJson(r.product_images);
      const revImages = parseImagesJson(r.images);
      const isProductDeleted = !r.product_name && !r.matched_product_id;

      return {
        id: r.id,
        product_id: r.product_id || "",
        user_id: r.user_id ? String(r.user_id) : null,
        order_id: r.matched_order_id ? String(r.matched_order_id) : null,
        author_name: r.author_name || r.customer_name || "Customer",
        rating: Number(r.rating || 5),
        title: r.title || null,
        review: r.review || null,
        images: revImages,
        verified_purchase: Boolean(r.verified_purchase),
        is_sample: Boolean(r.is_sample),
        status: (r.status || "approved") as ReviewStatus,
        admin_note: r.admin_note || null,
        created_at: toIsoDate(r.created_at),
        updated_at: toIsoDate(r.updated_at),
        customer_email: r.customer_email || null,
        customer_name: r.customer_name || r.author_name || null,
        product: isProductDeleted
          ? {
              name: `Deleted / Unlinked Product (${r.product_id || "unknown"})`,
              slug: r.product_id || "",
              image: null,
              isDeleted: true,
            }
          : {
              name: r.product_name || "Product",
              slug: r.product_slug || r.product_id || "",
              image: pImages[0] ?? null,
              isDeleted: false,
            },
      } as AdminReview;
    });
  });

export const adminUpdateReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { reviewId: string; status?: ReviewStatus; adminNote?: string | null }) => {
    if (!d.reviewId || typeof d.reviewId !== "string" || !d.reviewId.trim()) {
      throw new Error("Valid review ID is required");
    }
    if (d.status && !REVIEW_STATUSES.includes(d.status)) {
      throw new Error(`Invalid review status: ${d.status}`);
    }
    return {
      reviewId: String(d.reviewId).trim(),
      status: d.status,
      adminNote: d.adminNote !== undefined ? (d.adminNote ? String(d.adminNote).trim().slice(0, 500) : "") : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    // Verify review exists
    const existing = await sql`SELECT id, status, admin_note FROM reviews WHERE id = ${data.reviewId} LIMIT 1`;
    if (!existing || existing.length === 0) {
      throw new Error(`Review with ID "${data.reviewId}" was not found in database.`);
    }

    const newStatus = data.status || existing[0].status;
    const newNote = data.adminNote !== undefined ? (data.adminNote || null) : existing[0].admin_note;

    await sql`
      UPDATE reviews SET
        status = ${newStatus},
        admin_note = ${newNote},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${data.reviewId}
    `;

    invalidateCatalogCache();
    await logAudit(context as any, "review.status", "review", data.reviewId, {
      previousStatus: existing[0].status,
      newStatus,
      adminNoteUpdated: data.adminNote !== undefined,
    });

    return { ok: true, id: data.reviewId, status: newStatus };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { reviewId: string }) => {
    if (!d.reviewId || typeof d.reviewId !== "string" || !d.reviewId.trim()) {
      throw new Error("Valid review ID is required");
    }
    return { reviewId: String(d.reviewId).trim() };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const existing = await sql`SELECT id, author_name, product_id FROM reviews WHERE id = ${data.reviewId} LIMIT 1`;
    if (!existing || existing.length === 0) {
      throw new Error(`Review with ID "${data.reviewId}" does not exist or has already been deleted.`);
    }

    await sql`DELETE FROM reviews WHERE id = ${data.reviewId}`;

    invalidateCatalogCache();
    await logAudit(context as any, "review.delete", "review", data.reviewId, {
      authorName: existing[0].author_name,
      productId: existing[0].product_id,
    });

    return { ok: true, id: data.reviewId };
  });

export const adminReviewFormOptions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const [products, customers] = await Promise.all([
      sql`SELECT id, name, slug, images FROM products ORDER BY name ASC LIMIT 500`,
      sql`SELECT id, email, full_name FROM profiles ORDER BY created_at DESC LIMIT 500`,
    ]);

    return {
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: parseImagesJson(p.images),
      })),
      customers: customers.map((c: any) => ({
        id: c.id,
        email: c.email,
        full_name: c.full_name,
      })),
    };
  });

export const adminSaveReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      reviewId?: string | null;
      productId: string;
      userId?: string | null;
      authorName?: string | null;
      rating: number;
      title?: string | null;
      review?: string | null;
      images?: string[];
      isSample?: boolean;
      status: ReviewStatus;
      adminNote?: string | null;
    }) => {
      if (!d.productId || !String(d.productId).trim()) {
        throw new Error("Associated product is required.");
      }
      const rating = Number(d.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new Error("Rating must be an integer between 1 and 5.");
      }
      const reviewText = String(d.review ?? "").trim();
      if (!reviewText) {
        throw new Error("Review feedback content cannot be empty.");
      }

      return {
        reviewId: d.reviewId ? String(d.reviewId).trim() : null,
        productId: String(d.productId).trim(),
        userId: d.userId && String(d.userId).trim() ? String(d.userId).trim() : null,
        authorName: d.authorName ? String(d.authorName).trim().slice(0, 100) : null,
        rating: Math.max(1, Math.min(5, Math.round(rating))),
        title: d.title ? String(d.title).trim().slice(0, 120) : null,
        review: reviewText.slice(0, 2000),
        images: Array.isArray(d.images) ? d.images.filter((x): x is string => typeof x === "string" && Boolean(x)).slice(0, 5) : [],
        isSample: Boolean(d.isSample),
        status: (d.status || "approved") as ReviewStatus,
        adminNote: d.adminNote ? String(d.adminNote).trim().slice(0, 500) : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;

    let authorName = data.authorName || "";
    if (!authorName && data.userId) {
      const profs = await sql`
        SELECT full_name, email FROM profiles WHERE id = ${data.userId} LIMIT 1
      `;
      if (profs.length > 0) {
        authorName = profs[0].full_name || profs[0].email?.split("@")[0] || "";
      }
    }
    if (!authorName) {
      authorName = "Customer";
    }

    // Preservation & Validation of Verified Purchase Status
    let isVerified = false;
    if (data.reviewId) {
      // Preserve existing legitimate verified status if already marked verified
      const existingRows = await sql`SELECT is_verified_buyer FROM reviews WHERE id = ${data.reviewId} LIMIT 1`;
      if (existingRows.length > 0 && Boolean(existingRows[0].is_verified_buyer)) {
        isVerified = true;
      }
    }

    // If not already verified, check if the linked user actually has a delivered order for this product
    if (!isVerified && data.userId) {
      const purchased = await sql`
        SELECT i.id
        FROM order_items i
        JOIN orders o ON i.order_id = o.id
        WHERE (i.product_id = ${data.productId} OR i.product_id IN (SELECT id FROM products WHERE slug = ${data.productId}))
          AND o.user_id = ${data.userId}
          AND (LOWER(o.status) = 'delivered')
        LIMIT 1
      `;
      isVerified = purchased.length > 0;
    }

    if (data.reviewId) {
      const existing = await sql`SELECT id FROM reviews WHERE id = ${data.reviewId} LIMIT 1`;
      if (!existing || existing.length === 0) {
        throw new Error(`Review "${data.reviewId}" was not found to update.`);
      }

      await sql`
        UPDATE reviews SET
          product_id = ${data.productId},
          user_id = ${data.userId},
          author_name = ${authorName},
          rating = ${data.rating},
          title = ${data.title},
          content = ${data.review},
          images = ${JSON.stringify(data.images)},
          is_verified_buyer = ${isVerified ? 1 : 0},
          is_sample = ${data.isSample ? 1 : 0},
          admin_note = ${data.adminNote},
          status = ${data.status},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${data.reviewId}
      `;

      invalidateCatalogCache();
      await logAudit(context as any, "review.update", "review", data.reviewId, {
        rating: data.rating,
        status: data.status,
        authorName,
        isVerified,
        isSample: data.isSample,
      });

      return { ok: true, id: data.reviewId, isVerified };
    }

    // Create New Review
    const id = `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO reviews (
        id, product_id, user_id, author_name, rating, title, content, images, is_verified_buyer, status, admin_note, is_sample, created_at, updated_at
      ) VALUES (
        ${id},
        ${data.productId},
        ${data.userId || authCtx.userId || null},
        ${authorName},
        ${data.rating},
        ${data.title},
        ${data.review},
        ${JSON.stringify(data.images)},
        ${isVerified ? 1 : 0},
        ${data.status},
        ${data.adminNote},
        ${data.isSample ? 1 : 0},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    invalidateCatalogCache();
    await logAudit(context as any, "review.create", "review", id, {
      rating: data.rating,
      status: data.status,
      authorName,
      isVerified,
      isSample: data.isSample,
    });

    return { ok: true, id, isVerified };
  });
