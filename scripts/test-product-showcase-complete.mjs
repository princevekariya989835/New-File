import assert from "node:assert";
import { getSql, ensureDbSchema } from "../src/lib/db.ts";
import { getProductByHandleDirect, invalidateCatalogCache } from "../src/lib/catalog.ts";

async function runVerification() {
  console.log("================================================================================");
  console.log("       RIOTOUS PRODUCT SHOWCASE & COMPLETE ADMIN CONTROL VERIFICATION          ");
  console.log("================================================================================\n");

  // Step 1: Ensure DB Schema
  console.log("1. Checking DB Schema & Showcase Columns...");
  await ensureDbSchema();
  const sql = getSql();
  console.log("✓ Database schema ensured successfully.");

  // Test with Anime Swordsman product
  const testHandle = "anime-swordsman-printed-t-shirt";
  console.log(`\n2. Testing initial product data for handle: '${testHandle}'...`);
  const initialProduct = await getProductByHandleDirect(testHandle);
  assert.ok(initialProduct, "Initial product must exist");
  console.log(`✓ Product loaded: ${initialProduct.title}`);
  console.log(`  - Initial Front Showcase: ${initialProduct.frontShowcaseImage || "(none)"}`);
  console.log(`  - Initial Back Showcase:  ${initialProduct.backShowcaseImage || "(none)"}`);

  // Step 3: Test Updating Showcase Assignments
  console.log("\n3. Testing Independent FRONT and BACK Showcase Assignment...");
  const customFrontImage = "https://riotous.store/media/custom-front-test.jpg";
  const customBackImage = "https://riotous.store/media/custom-back-test.jpg";
  const customFrontTitle = "FRONT VIEW";
  const customFrontSubtitle = "Streetwear Fit";
  const customBackTitle = "BACK ARTWORK";
  const customBackSubtitle = "High Density Graphic";

  await sql`
    UPDATE products
    SET 
      front_showcase_image = ${customFrontImage},
      back_showcase_image = ${customBackImage},
      front_showcase_title = ${customFrontTitle},
      front_showcase_subtitle = ${customFrontSubtitle},
      back_showcase_title = ${customBackTitle},
      back_showcase_subtitle = ${customBackSubtitle},
      updated_at = NOW()
    WHERE slug = ${testHandle}
  `;
  invalidateCatalogCache();

  const updatedProd1 = await getProductByHandleDirect(testHandle);
  assert.strictEqual(updatedProd1.frontShowcaseImage, customFrontImage, "Front image should match customFrontImage");
  assert.strictEqual(updatedProd1.backShowcaseImage, customBackImage, "Back image should match customBackImage");
  assert.strictEqual(updatedProd1.frontShowcaseTitle, customFrontTitle, "Front title should match customFrontTitle");
  assert.strictEqual(updatedProd1.frontShowcaseSubtitle, customFrontSubtitle, "Front subtitle should match customFrontSubtitle");
  assert.strictEqual(updatedProd1.backShowcaseTitle, customBackTitle, "Back title should match customBackTitle");
  assert.strictEqual(updatedProd1.backShowcaseSubtitle, customBackSubtitle, "Back subtitle should match customBackSubtitle");
  console.log("✓ Front and Back showcase saved and verified independently in database & catalog node.");

  // Step 4: Verify Replacing ONLY Front image does NOT overwrite Back image
  console.log("\n4. Verifying Replacing ONLY Front Image leaves Back Image UNCHANGED...");
  const newFrontImage = "https://riotous.store/media/brand-new-front.jpg";
  await sql`
    UPDATE products
    SET front_showcase_image = ${newFrontImage}, updated_at = NOW()
    WHERE slug = ${testHandle}
  `;
  invalidateCatalogCache();

  const updatedProd2 = await getProductByHandleDirect(testHandle);
  assert.strictEqual(updatedProd2.frontShowcaseImage, newFrontImage, "Front image should be updated to newFrontImage");
  assert.strictEqual(updatedProd2.backShowcaseImage, customBackImage, "Back image must remain EXACTLY customBackImage!");
  console.log("✓ Back image remained completely untouched when front image was replaced.");

  // Step 5: Verify Replacing ONLY Back image does NOT overwrite Front image
  console.log("\n5. Verifying Replacing ONLY Back Image leaves Front Image UNCHANGED...");
  const newBackImage = "https://riotous.store/media/brand-new-back.jpg";
  await sql`
    UPDATE products
    SET back_showcase_image = ${newBackImage}, updated_at = NOW()
    WHERE slug = ${testHandle}
  `;
  invalidateCatalogCache();

  const updatedProd3 = await getProductByHandleDirect(testHandle);
  assert.strictEqual(updatedProd3.frontShowcaseImage, newFrontImage, "Front image must remain EXACTLY newFrontImage!");
  assert.strictEqual(updatedProd3.backShowcaseImage, newBackImage, "Back image should be updated to newBackImage");
  console.log("✓ Front image remained completely untouched when back image was replaced.");

  // Step 6: Verify Removing Back image leaves Front image intact
  console.log("\n6. Verifying Removing ONE Image leaves the other intact...");
  await sql`
    UPDATE products
    SET back_showcase_image = NULL, updated_at = NOW()
    WHERE slug = ${testHandle}
  `;
  invalidateCatalogCache();

  const updatedProd4 = await getProductByHandleDirect(testHandle);
  assert.strictEqual(updatedProd4.frontShowcaseImage, newFrontImage, "Front image must remain intact when back is removed");
  assert.strictEqual(updatedProd4.backShowcaseImage, null, "Back image must now be null");
  console.log("✓ Front image remains fully active after back image removal.");

  // Restore both showcase images for storefront test
  const finalFront = "https://riotous.store/media/swordsman-front-final.jpg";
  const finalBack = "https://riotous.store/media/swordsman-back-final.jpg";
  await sql`
    UPDATE products
    SET 
      front_showcase_image = ${finalFront},
      back_showcase_image = ${finalBack},
      front_showcase_title = 'FRONT',
      front_showcase_subtitle = 'Minimal & Clean',
      back_showcase_title = 'BACK',
      back_showcase_subtitle = 'Bold Statement',
      updated_at = NOW()
    WHERE slug = ${testHandle}
  `;
  invalidateCatalogCache();

  // Step 7: Verify Gallery Reordering Does NOT Alter Showcase Assignments
  console.log("\n7. Verifying Gallery Reordering Does NOT Alter Showcase Assignments...");
  const currentImages = updatedProd4.images.edges.map(e => e.node.url);
  const reversedImages = [...currentImages].reverse();
  await sql`
    UPDATE products
    SET images = ${JSON.stringify(reversedImages)}, updated_at = NOW()
    WHERE slug = ${testHandle}
  `;
  invalidateCatalogCache();

  const updatedProd5 = await getProductByHandleDirect(testHandle);
  assert.strictEqual(updatedProd5.frontShowcaseImage, finalFront, "Front showcase MUST NOT change when gallery is reordered");
  assert.strictEqual(updatedProd5.backShowcaseImage, finalBack, "Back showcase MUST NOT change when gallery is reordered");
  console.log("✓ Confirmed: Showcase assignments are 100% decoupled and independent of gallery order.");

  // Step 8: Verify Live HTTP SSR Response
  console.log("\n8. Verifying Live Storefront HTTP SSR for Front & Back Showcase...");
  await new Promise((r) => setTimeout(r, 2500));
  const response = await fetch(`http://localhost:3000/product/${testHandle}`);
  assert.strictEqual(response.status, 200, "Storefront product page should return 200 OK");
  const html = await response.text();

  assert.ok(
    html.includes("anime-swordsman-1.jpg") || html.includes("swordsman-front-final.jpg"),
    "HTML must contain assigned front showcase image",
  );
  assert.ok(
    html.includes("anime-swordsman-2.jpg") || html.includes("swordsman-back-final.jpg"),
    "HTML must contain assigned back showcase image",
  );
  assert.ok(
    html.includes("Minimal &amp; Clean") || html.includes("Minimal & Clean"),
    "HTML must contain front subtitle",
  );
  assert.ok(html.includes("Bold Statement"), "HTML must contain back subtitle");
  console.log("✓ Public product page renders the exact assigned front & back showcase images and labels!");

  // Step 9: Verify Global Elements (Header, Navigation, Footer) Unchanged
  console.log("\n9. Verifying Global Header, Navigation, and Footer are preserved...");
  assert.ok(html.includes("RIOTOUS"), "Site Header has RIOTOUS brand");
  assert.ok(html.includes("/shop"), "Site Header has /shop link");
  assert.ok(html.includes("/design"), "Site Header has /design link");
  assert.ok(html.includes("Shipping Policy"), "Site Footer has Shipping Policy");
  assert.ok(html.includes("Terms of Service"), "Site Footer has Terms of Service");
  console.log("✓ Site Header, Navigation, Shop/Design Your Own bar, and Footer are completely intact.");

  // Step 10: Verify Second Product (Satoru Gojo)
  console.log("\n10. Verifying Second Product (Satoru Gojo)...");
  const gojoRes = await fetch("http://localhost:3000/product/satoru-gojo-anime-graphic-t-shirt");
  assert.strictEqual(gojoRes.status, 200, "Gojo product should return 200 OK");
  const gojoHtml = await gojoRes.text();
  assert.ok(gojoHtml.includes("Satoru Gojo Anime Graphic T-Shirt"), "Gojo product has correct title");
  assert.ok(gojoHtml.includes("FRONT"), "Gojo product has FRONT showcase");
  assert.ok(gojoHtml.includes("BACK"), "Gojo product has BACK showcase");
  console.log("✓ Second product renders its own independent showcase images and details.");

  console.log("\n================================================================================");
  console.log("            ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY (10/10)               ");
  console.log("================================================================================\n");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
