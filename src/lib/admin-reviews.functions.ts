import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { REVIEW_STATUSES, type AdminReview, type ReviewStatus } from "@/lib/reviews-shared";
import { getSql } from "@/lib/db";
import { invalidateCatalogCache } from "@/lib/catalog";

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminReview[]> => {
    await assertAdmin(context as any);
    const sql = getSql();

    const rows = await sql`
      SELECT r.id, r.product_id, r.user_id, r.author_name, r.rating, r.title, r.content as review, r.images, r.is_verified_buyer as verified_purchase,
        r.status, r.created_at, r.updated_at, r.admin_note, r.is_sample, p.name as product_name, p.slug as product_slug, p.images as product_images,
        prof.email as customer_email, prof.full_name as customer_name
      FROM reviews r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN profiles prof ON r.user_id = prof.id
      ORDER BY r.created_at DESC
      LIMIT 500
    `;

    return rows.map((r: any) => {
      const pImages = Array.isArray(r.product_images)
        ? r.product_images
        : typeof r.product_images === "string"
          ? JSON.parse(r.product_images)
          : [];
      return {
        id: r.id,
        product_id: r.product_id,
        user_id: r.user_id,
        author_name: r.author_name || r.customer_name || "Customer",
        rating: Number(r.rating || 5),
        title: r.title || null,
        review: r.review || null,
        images: Array.isArray(r.images)
          ? r.images
          : typeof r.images === "string"
            ? JSON.parse(r.images)
            : [],
        verified_purchase: Boolean(r.verified_purchase),
        is_sample: Boolean(r.is_sample),
        status: r.status as ReviewStatus,
        admin_note: r.admin_note || null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        customer_email: r.customer_email || null,
        customer_name: r.customer_name || r.author_name || null,
        product: r.product_name
          ? {
              name: r.product_name,
              slug: r.product_slug,
              image: pImages[0] ?? null,
            }
          : null,
      } as AdminReview;
    });
  });

export const adminUpdateReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { reviewId: string; status: ReviewStatus; adminNote?: string | null }) => {
    if (!REVIEW_STATUSES.includes(d.status)) throw new Error("Invalid review status");
    return {
      reviewId: String(d.reviewId),
      status: d.status,
      adminNote: d.adminNote?.trim() ? d.adminNote.trim().slice(0, 500) : null,
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    await sql`
      UPDATE reviews SET
        status = ${data.status},
        admin_note = COALESCE(${data.adminNote}, admin_note),
        updated_at = NOW()
      WHERE id = ${data.reviewId}
    `;
    invalidateCatalogCache();
    await logAudit(context as any, "review.status", "review", data.reviewId, {
      status: data.status,
    });
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { reviewId: string }) => ({ reviewId: String(d.reviewId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    await sql`DELETE FROM reviews WHERE id = ${data.reviewId}`;
    invalidateCatalogCache();
    await logAudit(context as any, "review.delete", "review", data.reviewId, {});
    return { ok: true };
  });

export const adminReviewFormOptions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const [products, customers] = await Promise.all([
      sql`SELECT id, name, images FROM products ORDER BY name ASC LIMIT 500`,
      sql`SELECT id, email, full_name FROM profiles ORDER BY created_at DESC LIMIT 500`,
    ]);

    return {
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        images: Array.isArray(p.images)
          ? p.images
          : typeof p.images === "string"
            ? JSON.parse(p.images)
            : [],
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
    }) => ({
      reviewId: d.reviewId ? String(d.reviewId) : null,
      productId: String(d.productId),
      userId: d.userId ? String(d.userId) : null,
      authorName: d.authorName ? String(d.authorName).trim().slice(0, 100) : null,
      rating: Math.max(1, Math.min(5, Number(d.rating) || 5)),
      title: d.title ? String(d.title).trim().slice(0, 100) : null,
      review: d.review ? String(d.review).trim().slice(0, 2000) : "",
      images: Array.isArray(d.images) ? d.images.filter(Boolean).slice(0, 5) : [],
      isSample: Boolean(d.isSample),
      status: d.status || "approved",
      adminNote: d.adminNote ? String(d.adminNote).trim().slice(0, 500) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
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

    // System-confirmed purchase verification check:
    // Only mark review as verified when confirmed by a delivered purchase in the system.
    // Manual spoofing is strictly prevented.
    let isVerified = false;
    if (data.userId) {
      const purchased = await sql`
        SELECT i.id
        FROM order_items i
        JOIN orders o ON i.order_id = o.id
        WHERE (i.product_id = ${data.productId} OR i.product_id IN (SELECT id FROM products WHERE slug = ${data.productId}))
          AND o.user_id = ${data.userId}
          AND (o.status = 'Delivered' OR o.status = 'delivered')
        LIMIT 1
      `;
      isVerified = purchased.length > 0;
    }

    if (data.reviewId) {
      await sql`
        UPDATE reviews SET
          author_name = COALESCE(${data.authorName || null}, author_name, 'Customer'),
          rating = ${data.rating},
          title = ${data.title || null},
          content = ${data.review || ""},
          images = ${JSON.stringify(data.images || [])},
          is_verified_buyer = ${isVerified ? 1 : 0},
          is_sample = ${data.isSample ? 1 : 0},
          admin_note = ${data.adminNote || null},
          status = ${data.status},
          updated_at = NOW()
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

    const id = `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO reviews (
        id, product_id, user_id, author_name, rating, title, content, images, is_verified_buyer, status, admin_note, is_sample
      ) VALUES (
        ${id},
        ${data.productId},
        ${data.userId || authCtx.userId},
        ${authorName},
        ${data.rating},
        ${data.title || null},
        ${data.review || ""},
        ${JSON.stringify(data.images || [])},
        ${isVerified ? 1 : 0},
        ${data.status},
        ${data.adminNote || null},
        ${data.isSample ? 1 : 0}
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
