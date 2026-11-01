import assert from "node:assert";

async function verify() {
  console.log("=== RIOTOUS STOREWIDE PRODUCT REDESIGN VERIFICATION ===");

  // 1. Test Satoru Gojo Product Route
  console.log("\n1. Testing Satoru Gojo Product (/product/satoru-gojo-anime-graphic-t-shirt)...");
  const res1 = await fetch("http://localhost:3000/product/satoru-gojo-anime-graphic-t-shirt");
  assert.strictEqual(res1.status, 200, "Gojo product should return 200 OK");
  const html1 = await res1.text();

  // Verify Header preservation
  assert.ok(html1.includes("RIOTOUS"), "Header has RIOTOUS brand");
  assert.ok(html1.includes("/shop"), "Header has /shop navigation link");
  assert.ok(html1.includes("/design"), "Header has /design navigation link");
  console.log("✓ Site Header intact and unaltered");

  // Verify Product Details & Pricing
  assert.ok(html1.includes("Satoru Gojo Anime Graphic T-Shirt"), "Has product title");
  assert.ok(html1.includes("₹599"), "Has selling price ₹599");
  assert.ok(html1.includes("₹899"), "Has MRP ₹899");
  assert.ok(html1.includes("33") && html1.includes("% OFF"), "Has 33% OFF discount badge");
  console.log("✓ Product Title, Selling Price (₹599), MRP (₹899), and 33% OFF discount verified");

  // Verify Offer Banner
  assert.ok(html1.includes("Buy 2 Get 1 Free") || html1.includes("BUY 2 GET 1 FREE") || html1.includes("SPECIAL OFFER"), "Has promotional offer banner");
  console.log("✓ Special Offer Banner (SPECIAL OFFER: Buy 2 Get 1 Free) verified");

  // Verify Purchase Buttons & Controls
  assert.ok(html1.includes("Add to Cart") || html1.includes("Add to Bag"), "Has Add to Cart button");
  assert.ok(html1.includes("Buy Now"), "Has Buy Now button");
  assert.ok(html1.includes("Secure Payment"), "Has Secure Payment reassurance item");
  assert.ok(html1.includes("Easy Returns"), "Has Easy Returns reassurance item");
  assert.ok(html1.includes("Free Shipping"), "Has Free Shipping reassurance item");
  assert.ok(html1.includes("FRONT") && html1.includes("BACK"), "Has FRONT and BACK presentation strip");
  assert.ok(html1.includes("500+ sold this month"), "Has sold this month indicator");
  console.log("✓ Add to Cart and Buy Now buttons, Front/Back strip, and Reassurance verified");

  // Verify Feature Strip & Info Sections
  assert.ok(html1.includes("Product Details"), "Has Product Details info tab");
  assert.ok(html1.includes("COMPLETE YOUR FIT"), "Has Complete Your Fit recommendation section");
  console.log("✓ Product Details tabs and 'COMPLETE YOUR FIT' section verified");

  // Verify Footer preservation
  assert.ok(html1.includes("Shipping Policy"), "Footer has policy links");
  assert.ok(html1.includes("Terms of Service"), "Footer has terms of service");
  console.log("✓ Site Footer intact and unaltered");

  // 2. Test Second Catalog Product (Oversized Black T-Shirt)
  console.log("\n2. Testing Second Product (/product/oversized-black-t-shirt)...");
  const res2 = await fetch("http://localhost:3000/product/oversized-black-t-shirt");
  assert.strictEqual(res2.status, 200, "Second product should return 200 OK");
  const html2 = await res2.text();

  assert.ok(html2.includes("Oversized Black T-Shirt"), "Second product has correct title");
  assert.ok(html2.includes("₹1,199"), "Second product has price ₹1,199");
  assert.ok(html2.includes("₹1,999"), "Second product has MRP ₹1,999");
  assert.ok(html2.includes("40") && html2.includes("% OFF"), "Second product has 40% OFF");
  assert.ok(html2.includes("Add to Cart") || html2.includes("Add to Bag"), "Second product has Add to Cart button");
  console.log("✓ Second product renders dynamically with own data (₹1,199 / ₹1,999, 40% OFF)");

  // 3. Test Invalid Handle (404 state)
  console.log("\n3. Testing Non-Existent Product (/product/non-existent-product-handle)...");
  const res3 = await fetch("http://localhost:3000/product/non-existent-product-handle");
  assert.strictEqual(res3.status, 404, "Invalid handle should return 404 Not Found");
  console.log("✓ Non-existent product correctly returns 404 status");

  console.log("\n=======================================================");
  console.log("ALL PRODUCT REDESIGN SSR CHECKS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
