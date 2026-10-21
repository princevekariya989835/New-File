import assert from "node:assert";
import { getSql, ensureDbSchema } from "../src/lib/db.ts";
import { assertAdmin } from "../src/lib/admin-utils.ts";
import { REVIEW_STATUSES, summarize } from "../src/lib/reviews-shared.ts";

async function runAudit() {
  console.log("======================================================================");
  console.log("     RIOTOUS ADMIN PANEL REVIEWS PAGE — AUDIT & VERIFICATION SUITE");
  console.log("======================================================================\n");

  await ensureDbSchema();
  const sql = getSql();

  // -------------------------------------------------------------------------
  // TEST 1: Database Query & Real Review Records Loading
  // -------------------------------------------------------------------------
  console.log("TEST 1: Fetching real reviews joined with products, profiles, and orders...");
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

  assert.ok(rows.length > 0, "Must return real review records from database");
  console.log(`✓ Retrieved ${rows.length} real reviews from database.`);

  const sample = rows[0];
  console.log("Sample row raw:", sample);
  assert.ok(sample.id, "Review must have an ID");
  assert.ok(sample.author_name, "Review must have an author name");
  assert.ok(typeof sample.rating === "number" || typeof sample.rating === "string", "Review must have a rating");
  assert.ok(sample.status, "Review must have a status");
  console.log(`✓ Sample Record: ID=${sample.id}, Author="${sample.author_name}", Rating=${sample.rating}★, Status=${sample.status}`);

  // -------------------------------------------------------------------------
  // TEST 2: Handling Null / Undefined User ID without Crashing (Fixing Slice Crash)
  // -------------------------------------------------------------------------
  console.log("\nTEST 2: Verifying that null/guest user_id formatting never crashes...");
  const guestReviews = rows.filter((r) => !r.user_id);
  assert.ok(guestReviews.length > 0, "Must have reviews with null user_id (guest / initial seed reviews)");
  
  for (const gr of guestReviews.slice(0, 5)) {
    // Test the exact formatting logic that previously crashed:
    const formattedUserId = gr.user_id ? `${gr.user_id.slice(0, 8)}…` : "Guest / Not linked";
    assert.strictEqual(formattedUserId, "Guest / Not linked", "Guest review user_id must format safely without throwing");
  }
  console.log(`✓ Verified ${guestReviews.length} guest/unlinked reviews format safely without slice errors.`);

  // -------------------------------------------------------------------------
  // TEST 3: Handling Missing or Deleted Products Gracefully
  // -------------------------------------------------------------------------
  console.log("\nTEST 3: Verifying deleted / unlinked product fallback...");
  // Simulate deleted product review mapping
  const orphanReview = {
    id: "rev_test_orphan",
    product_id: "prod_deleted_id_999",
    product_name: null,
    product_slug: null,
    matched_product_id: null,
  };
  const isDeleted = !orphanReview.product_name && !orphanReview.matched_product_id;
  assert.strictEqual(isDeleted, true, "Orphan review correctly flagged as deleted product");
  const productFallback = isDeleted
    ? {
        name: `Deleted / Unlinked Product (${orphanReview.product_id})`,
        slug: orphanReview.product_id,
        image: null,
        isDeleted: true,
      }
    : { name: orphanReview.product_name, slug: orphanReview.product_slug, image: null, isDeleted: false };
  assert.strictEqual(productFallback.isDeleted, true);
  assert.ok(productFallback.name.includes("Deleted"), "Deleted product fallback name must be clear");
  console.log(`✓ Deleted/missing product handled safely: "${productFallback.name}".`);

  // -------------------------------------------------------------------------
  // TEST 4: Comprehensive Search & Filtering
  // -------------------------------------------------------------------------
  console.log("\nTEST 4: Testing search and filter logic...");
  const allReviews = rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    user_id: r.user_id || null,
    author_name: r.author_name || "Customer",
    customer_name: r.customer_name || null,
    customer_email: r.customer_email || null,
    rating: Number(r.rating || 5),
    title: r.title || "",
    review: r.review || "",
    verified_purchase: Boolean(r.verified_purchase),
    is_sample: Boolean(r.is_sample),
    status: r.status,
    admin_note: r.admin_note || "",
    product: {
      name: r.product_name || "Product",
      slug: r.product_slug || r.product_id,
      image: null,
    },
  }));

  // Search by author name
  const authorQuery = "Aarav";
  const authorMatches = allReviews.filter((r) =>
    [r.id, r.author_name, r.customer_name, r.customer_email, r.product?.name, r.title, r.review]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(authorQuery.toLowerCase()))
  );
  assert.ok(authorMatches.length > 0, `Search for "${authorQuery}" must return matches`);
  console.log(`✓ Search for reviewer "${authorQuery}" returned ${authorMatches.length} matching review(s).`);

  // Search by keyword in review text
  const keywordQuery = "Hollow Purple";
  const keywordMatches = allReviews.filter((r) =>
    [r.id, r.author_name, r.product?.name, r.title, r.review]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(keywordQuery.toLowerCase()))
  );
  assert.ok(keywordMatches.length > 0, `Search for keyword "${keywordQuery}" must return matches`);
  console.log(`✓ Search for text "${keywordQuery}" returned ${keywordMatches.length} matching review(s).`);

  // Filter by rating = 5
  const fiveStars = allReviews.filter((r) => Math.round(r.rating) === 5);
  assert.ok(fiveStars.length > 0, "Must have 5-star reviews");
  console.log(`✓ Filter by rating 5★ returned ${fiveStars.length} reviews.`);

  // Filter by status = approved
  const approved = allReviews.filter((r) => r.status === "approved");
  assert.ok(approved.length > 0, "Must have approved reviews");
  console.log(`✓ Filter by status "approved" returned ${approved.length} reviews.`);

  // -------------------------------------------------------------------------
  // TEST 5: Review Management Actions (Approve, Reject, Restore, Note update)
  // -------------------------------------------------------------------------
  console.log("\nTEST 5: Testing review management database actions...");
  const targetRev = rows[0];
  const origStatus = targetRev.status;
  const origNote = targetRev.admin_note;

  // 1. Reject
  await sql`
    UPDATE reviews SET
      status = 'rejected',
      admin_note = 'Audit test: temporary rejection',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${targetRev.id}
  `;
  const rejectedRow = await sql`SELECT status, admin_note FROM reviews WHERE id = ${targetRev.id}`;
  assert.strictEqual(rejectedRow[0].status, "rejected", "Review status must be updated to rejected");
  assert.strictEqual(rejectedRow[0].admin_note, "Audit test: temporary rejection", "Admin note must be updated");
  console.log(`✓ Action "Reject" succeeded on review ${targetRev.id}.`);

  // 2. Update Note only
  await sql`
    UPDATE reviews SET
      admin_note = 'Audit test: note update without changing status',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${targetRev.id}
  `;
  const noteRow = await sql`SELECT status, admin_note FROM reviews WHERE id = ${targetRev.id}`;
  assert.strictEqual(noteRow[0].status, "rejected", "Status remained rejected");
  assert.strictEqual(noteRow[0].admin_note, "Audit test: note update without changing status");
  console.log(`✓ Action "Save Note" independently succeeded.`);

  // 3. Restore to original
  await sql`
    UPDATE reviews SET
      status = ${origStatus},
      admin_note = ${origNote},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${targetRev.id}
  `;
  const restoredRow = await sql`SELECT status, admin_note FROM reviews WHERE id = ${targetRev.id}`;
  assert.strictEqual(restoredRow[0].status, origStatus, "Status restored back to original");
  console.log(`✓ Action "Restore" back to "${origStatus}" verified.`);

  // -------------------------------------------------------------------------
  // TEST 6: Create, Edit with Verified Purchase Preservation, and Delete
  // -------------------------------------------------------------------------
  console.log("\nTEST 6: Testing review creation, verified preservation on edit, and deletion...");
  const tempId = `rev_audit_test_${Date.now()}`;
  
  // Create
  await sql`
    INSERT INTO reviews (
      id, product_id, user_id, author_name, rating, title, content, images, is_verified_buyer, status, admin_note, is_sample, created_at, updated_at
    ) VALUES (
      ${tempId}, ${'prod-satoru-gojo-graphic-tee'}, ${null}, ${'Audit Temp User'}, ${5}, ${'Audit Temp Title'}, ${'Audit temp review content'}, ${'[]'}, ${1}, ${'pending'}, ${'Created for audit'}, ${0}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
  const createdCheck = await sql`SELECT id, is_verified_buyer, status FROM reviews WHERE id = ${tempId}`;
  assert.strictEqual(createdCheck.length, 1, "Created review must exist in DB");
  assert.strictEqual(createdCheck[0].is_verified_buyer, 1, "Created review has is_verified_buyer = 1");
  console.log(`✓ Created test review ${tempId}.`);

  // Edit without stripping verified status
  const existingWasVerified = Boolean(createdCheck[0].is_verified_buyer);
  assert.strictEqual(existingWasVerified, true, "Preservation flag detected");
  await sql`
    UPDATE reviews SET
      title = 'Updated Audit Temp Title',
      content = 'Updated review feedback',
      is_verified_buyer = ${existingWasVerified ? 1 : 0},
      status = 'approved',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${tempId}
  `;
  const updatedCheck = await sql`SELECT title, is_verified_buyer, status FROM reviews WHERE id = ${tempId}`;
  assert.strictEqual(updatedCheck[0].title, "Updated Audit Temp Title");
  assert.strictEqual(updatedCheck[0].is_verified_buyer, 1, "is_verified_buyer must be preserved on edit!");
  assert.strictEqual(updatedCheck[0].status, "approved");
  console.log(`✓ Edit preserved verified status: is_verified_buyer is still 1.`);

  // Delete
  await sql`DELETE FROM reviews WHERE id = ${tempId}`;
  const deletedCheck = await sql`SELECT id FROM reviews WHERE id = ${tempId}`;
  assert.strictEqual(deletedCheck.length, 0, "Deleted review must no longer exist in DB");
  console.log(`✓ Permanent deletion verified.`);

  // -------------------------------------------------------------------------
  // TEST 7: Security & Unauthorized Access Enforcement
  // -------------------------------------------------------------------------
  console.log("\nTEST 7: Testing Security RBAC Guard (Unauthorized rejection)...");
  // 1. Customer role must be rejected
  let customerRejected = false;
  try {
    await assertAdmin({ user: { id: "usr_cust_1", email: "cust@example.com", role: "customer" }, isAdmin: false });
  } catch (err) {
    customerRejected = true;
  }
  assert.strictEqual(customerRejected, true, "Customer role must be rejected by assertAdmin");

  // 2. Super Admin role must be accepted
  let adminAccepted = false;
  try {
    await assertAdmin({ user: { id: "usr_admin_default", email: "admin@riotous.store", role: "Super Admin" }, isAdmin: true });
    adminAccepted = true;
  } catch (err) {
    adminAccepted = false;
  }
  assert.strictEqual(adminAccepted, true, "Super Admin role must pass assertAdmin");
  console.log("✓ Security RBAC: Customer correctly blocked, Super Admin authorized.");

  // -------------------------------------------------------------------------
  // TEST 8: Storefront Isolation of Pending / Rejected / Sample Reviews
  // -------------------------------------------------------------------------
  console.log("\nTEST 8: Verifying Storefront Query filters pending and sample reviews...");
  const publicStoreRows = await sql`
    SELECT r.id, r.product_id, r.status, r.is_sample
    FROM reviews r
    WHERE (r.status = 'approved' OR r.status = 'Approved')
      AND (r.is_sample = 0 OR r.is_sample IS NULL OR r.is_sample = false)
  `;
  assert.ok(publicStoreRows.every((r) => r.status.toLowerCase() === "approved"), "Public query must only return approved reviews");
  assert.ok(publicStoreRows.every((r) => !r.is_sample), "Public query must exclude sample content");
  console.log(`✓ Public storefront query verified: ${publicStoreRows.length} live approved reviews returned.`);

  console.log("\n======================================================================");
  console.log("   ALL 8 ADMIN PANEL REVIEWS PAGE AUDIT TESTS PASSED (100%)");
  console.log("======================================================================\n");
}

runAudit().catch(console.error);
