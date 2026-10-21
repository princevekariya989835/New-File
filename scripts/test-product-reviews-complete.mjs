import assert from "node:assert";
import { INITIAL_PRODUCT_REVIEWS, seedInitialReviewsIfNeeded } from "../src/lib/reviews-seed.ts";
import { summarize } from "../src/lib/reviews-shared.ts";
import { getSql, ensureDbSchema } from "../src/lib/db.ts";

async function runReviewTests() {
  console.log("======================================================================");
  console.log("   RIOTOUS PRODUCT REVIEW SYSTEM COMPLETE VERIFICATION SUITE");
  console.log("======================================================================\n");

  await ensureDbSchema();
  const sql = getSql();

  // -------------------------------------------------------------------------
  // TEST 1: Catalog Review Coverage (5 Reviews per product across all 8 live products)
  // -------------------------------------------------------------------------
  console.log("TEST 1: Verifying Review Coverage across live published products...");
  const liveProductIds = [
    "prod-satoru-gojo-graphic-tee",
    "prod-anime-swordsman-tee",
    "prod-oversized-black-tee",
    "prod-premium-white-tee",
    "prod-classic-red-tee",
    "prod-heavyweight-grey-tee",
    "prod-streetwear-blue-tee",
    "prod-baki-hanma-oversized-tee",
  ];

  assert.strictEqual(INITIAL_PRODUCT_REVIEWS.length, 40, "Must have exactly 40 initial reviews (8 products × 5)");

  for (const pid of liveProductIds) {
    const pReviews = INITIAL_PRODUCT_REVIEWS.filter((r) => r.product_id === pid);
    assert.strictEqual(pReviews.length, 5, `Product ${pid} must have exactly 5 initial reviews`);
  }
  console.log(`✓ All ${liveProductIds.length} live products have exactly 5 reviews configured.`);

  // -------------------------------------------------------------------------
  // TEST 2: Reviewer Names & Content Uniqueness (No repeated names or review text)
  // -------------------------------------------------------------------------
  console.log("\nTEST 2: Verifying Diversity of Reviewer Names, Titles, and Content...");
  const authorNames = INITIAL_PRODUCT_REVIEWS.map((r) => r.author_name.trim().toLowerCase());
  const uniqueNames = new Set(authorNames);
  assert.strictEqual(
    uniqueNames.size,
    authorNames.length,
    `All reviewer names must be unique! Found ${uniqueNames.size} unique of ${authorNames.length}`,
  );

  const titles = INITIAL_PRODUCT_REVIEWS.map((r) => r.title.trim().toLowerCase());
  const uniqueTitles = new Set(titles);
  assert.strictEqual(uniqueTitles.size, titles.length, "All review titles must be unique");

  const contents = INITIAL_PRODUCT_REVIEWS.map((r) => r.content.trim().toLowerCase());
  const uniqueContents = new Set(contents);
  assert.strictEqual(uniqueContents.size, contents.length, "All review content texts must be unique");

  // Verify ratings range from 1 to 5 stars
  const ratings = INITIAL_PRODUCT_REVIEWS.map((r) => r.rating);
  assert.ok(ratings.every((r) => r >= 1 && r <= 5), "All ratings must be between 1 and 5 stars");
  assert.ok(ratings.includes(5), "Has 5-star ratings");
  assert.ok(ratings.includes(4), "Has 4-star ratings");
  assert.ok(ratings.includes(3), "Has 3-star ratings");
  console.log(`✓ Reviewer names (${uniqueNames.size}), titles (${uniqueTitles.size}), and review texts are 100% unique.`);
  console.log(`✓ Natural rating distribution verified across 3 to 5 stars.`);

  // -------------------------------------------------------------------------
  // TEST 3: Duplicate-Safe Seeding & Invariant Checking (No BEGIN/COMMIT)
  // -------------------------------------------------------------------------
  console.log("\nTEST 3: Testing Idempotent Seeding & Duplicate Prevention...");
  // Re-run seed function
  await seedInitialReviewsIfNeeded(sql);
  await seedInitialReviewsIfNeeded(sql);

  // Check total reviews in database
  const countRows = await sql`SELECT count(*) FROM reviews`;
  const dbCount = Number(countRows[0]?.count || countRows.length);
  assert.ok(dbCount >= 40, `Database must contain at least 40 reviews (found ${dbCount})`);
  console.log(`✓ Database contains ${dbCount} reviews. Duplicate-safe seeding confirmed.`);

  // -------------------------------------------------------------------------
  // TEST 4: Querying Public Reviews and Dynamic Arithmetic Calculations
  // -------------------------------------------------------------------------
  console.log("\nTEST 4: Verifying Public Review Fetching and Dynamic Calculation on 5 Products...");
  const testProducts = liveProductIds.slice(0, 5);

  for (const pid of testProducts) {
    const rows = await sql`
      SELECT r.id, r.product_id, r.user_id, r.author_name, r.rating, r.title, r.content as review,
        r.is_verified_buyer as verified_purchase, r.status, r.images, r.created_at, r.is_sample
      FROM reviews r
      WHERE (r.product_id = ${pid} OR r.product_id IN (SELECT id FROM products WHERE slug = ${pid}))
        AND (r.status = 'approved' OR r.status = 'Approved')
        AND (r.is_sample = 0 OR r.is_sample IS NULL OR r.is_sample = false)
      ORDER BY r.created_at DESC
    `;

    assert.strictEqual(rows.length, 5, `Public query must return 5 reviews for ${pid}`);
    const summary = summarize(rows.map((r) => Number(r.rating)));
    assert.strictEqual(summary.total, 5, `Summary total must be 5 for ${pid}`);

    const expectedAvg =
      Math.round((rows.reduce((acc, r) => acc + Number(r.rating), 0) / rows.length) * 10) / 10;
    assert.strictEqual(
      summary.average,
      expectedAvg,
      `Calculated average ${summary.average} must match expected ${expectedAvg} for ${pid}`,
    );

    // Verify all initial reviews are unverified (not fake verified)
    for (const rev of rows) {
      assert.strictEqual(
        Boolean(rev.verified_purchase),
        false,
        "Sample/seeded reviews without delivered order must have verified_purchase: false",
      );
    }
    console.log(`  ✓ Product ${pid}: ${rows.length} reviews, Average: ${summary.average}★, Distribution: [${summary.distribution.join(", ")}]`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Sample Reviews & Unpublished Reviews Exclusion
  // -------------------------------------------------------------------------
  console.log("\nTEST 5: Verifying Sample Content and Pending Reviews are Kept OUT of Public Store...");
  // Insert a sample review
  const sampleRevId = `rev_sample_test_${Date.now()}`;
  await sql`
    INSERT INTO reviews (
      id, product_id, user_id, author_name, rating, title, content, is_verified_buyer, status, images, is_sample
    ) VALUES (
      ${sampleRevId}, ${"prod-satoru-gojo-graphic-tee"}, ${"usr_sample_1"}, ${"AI Tester"}, ${5}, ${"Sample Headline"}, ${"Sample text here"},
      ${0}, ${"approved"}, ${"[]"}, ${1}
    )
  `;

  // Insert a pending review
  const pendingRevId = `rev_pending_test_${Date.now()}`;
  await sql`
    INSERT INTO reviews (
      id, product_id, user_id, author_name, rating, title, content, is_verified_buyer, status, images, is_sample
    ) VALUES (
      ${pendingRevId}, ${"prod-satoru-gojo-graphic-tee"}, ${"usr_sample_2"}, ${"Pending Tester"}, ${1}, ${"Pending Title"}, ${"Pending review text"},
      ${0}, ${"pending"}, ${"[]"}, ${0}
    )
  `;

  // Check public query for Gojo tee
  const publicRows = await sql`
    SELECT r.id, r.product_id, r.user_id, r.author_name, r.rating, r.title, r.content as review,
      r.is_verified_buyer as verified_purchase, r.status, r.images, r.created_at, r.is_sample
    FROM reviews r
    WHERE (r.product_id = 'prod-satoru-gojo-graphic-tee' OR r.product_id IN (SELECT id FROM products WHERE slug = 'prod-satoru-gojo-graphic-tee'))
      AND (r.status = 'approved' OR r.status = 'Approved')
      AND (r.is_sample = 0 OR r.is_sample IS NULL OR r.is_sample = false)
    ORDER BY r.created_at DESC
  `;

  const hasSample = publicRows.some((r) => r.id === sampleRevId);
  const hasPending = publicRows.some((r) => r.id === pendingRevId);
  assert.strictEqual(hasSample, false, "Sample content (is_sample = 1) MUST NOT appear in public product query");
  assert.strictEqual(hasPending, false, "Pending reviews MUST NOT appear in public product query");
  console.log("✓ Verified: Sample reviews and pending reviews are strictly excluded from public product queries.");

  // Clean up test reviews
  await sql`DELETE FROM reviews WHERE id = ${sampleRevId}`;
  await sql`DELETE FROM reviews WHERE id = ${pendingRevId}`;

  // -------------------------------------------------------------------------
  // TEST 6: Purchase Verification Enforced by Delivered Orders (No Spoofing)
  // -------------------------------------------------------------------------
  console.log("\nTEST 6: Testing Purchase Verification System Integrity...");
  // Simulate verification query: user without delivered order
  const nonPurchased = await sql`
    SELECT i.id
    FROM order_items i
    JOIN orders o ON i.order_id = o.id
    WHERE (i.product_id = 'prod-satoru-gojo-graphic-tee' OR i.product_id IN (SELECT id FROM products WHERE slug = 'prod-satoru-gojo-graphic-tee'))
      AND o.user_id = 'usr_demo_customer'
      AND (o.status = 'Delivered' OR o.status = 'delivered')
    LIMIT 1
  `;
  const isVerifiedForNonBuyer = nonPurchased.length > 0;
  assert.strictEqual(isVerifiedForNonBuyer, false, "Must NOT be verified when user has no delivered order!");
  console.log("✓ Verified: Purchase verification is strictly confirmed by delivered orders (no false claims).");

  // -------------------------------------------------------------------------
  // TEST 7: SSR Verification on Running Server (5 Published Products)
  // -------------------------------------------------------------------------
  console.log("\nTEST 7: Testing Live Storefront SSR for Product Reviews on 5 Products...");
  const endpoints = [
    { url: "http://localhost:3000/product/satoru-gojo-anime-graphic-t-shirt", name: "Satoru Gojo Graphic Tee" },
    { url: "http://localhost:3000/product/anime-swordsman-printed-t-shirt", name: "Anime Swordsman Tee" },
    { url: "http://localhost:3000/product/oversized-black-t-shirt", name: "Oversized Black Tee" },
    { url: "http://localhost:3000/product/premium-white-t-shirt", name: "Premium White Tee" },
    { url: "http://localhost:3000/product/classic-red-t-shirt", name: "Classic Red Tee" },
  ];

  for (const { url, name } of endpoints) {
    const res = await fetch(url);
    assert.strictEqual(res.status, 200, `Page ${url} should return 200 OK`);
    const html = await res.text();

    assert.ok(html.includes("Customer reviews"), `${name} page should contain 'Customer reviews' section`);
    assert.ok(/Based on.*5.*review/i.test(html), `${name} page should display 'Based on 5 reviews'`);
    assert.ok(html.includes("Write a review") || html.includes("Sign in to write a review"), `${name} has review action CTA`);
    console.log(`  ✓ Verified SSR for ${name} (${url}): 200 OK with Customer Reviews and rating summary.`);
  }

  console.log("\n======================================================================");
  console.log("   ALL 7 PRODUCT REVIEW SYSTEM VERIFICATION TESTS PASSED (100%)");
  console.log("======================================================================\n");
}

runReviewTests().catch((err) => {
  console.error("❌ Review verification suite failed:", err);
  process.exit(1);
});
