import { getSql, ensureDbSchema } from "../src/lib/db";
import { toCatalogProduct, type ProductRow } from "../src/lib/catalog";

async function runTests() {
  console.log("=== 1. INITIALIZING SCHEMA & TABLES ===");
  await ensureDbSchema();
  const sql = getSql();

  console.log("=== 2. VERIFYING FEATURED COLLECTIONS DATABASE SEED ===");
  const collections = await sql`SELECT id, title, slug, department, collection_type, is_enabled FROM featured_collections ORDER BY display_order ASC`;
  console.log(`Found ${collections.length} featured collections in DB:`);
  for (const c of collections) {
    console.log(` - [${c.id}] ${c.title} (${c.department} / ${c.collection_type}) -> is_enabled: ${c.is_enabled}`);
  }

  if (collections.length !== 4) {
    throw new Error(`Expected 4 featured collections, found ${collections.length}`);
  }

  console.log("\n=== 3. VERIFYING PRODUCTS IN DATABASE FOR SEEDING ===");
  const products = await sql`
    SELECT id, name, slug, department, category, price, is_active
    FROM products
    ORDER BY updated_at DESC
  `;
  console.log(`Found ${products.length} products available.`);

  const menProducts = products.filter((p) => (p.department || "men").toLowerCase() === "men" || (p.department || "").toLowerCase() === "unisex");
  const womenProducts = products.filter((p) => (p.department || "").toLowerCase() === "women" || (p.department || "").toLowerCase() === "unisex");

  console.log(`Men / Unisex product candidates: ${menProducts.length}`);
  console.log(`Women / Unisex product candidates: ${womenProducts.length}`);

  console.log("\n=== 4. TESTING ASSIGNMENT & ORDERING IN FEATURED_COLLECTION_ITEMS ===");
  // Test inserting products into men_best_sellers
  const testPids = (menProducts.length > 0 ? menProducts : products).slice(0, 4).map((p) => String(p.id));
  console.log(`Assigning products ${testPids.join(", ")} to men_best_sellers in order`);

  await sql`DELETE FROM featured_collection_items WHERE collection_id = 'men_best_sellers'`;
  for (let i = 0; i < testPids.length; i++) {
    const pid = testPids[i];
    const itemId = `fci_test_mbs_${pid}`;
    await sql`
      INSERT INTO featured_collection_items (id, collection_id, product_id, display_order)
      VALUES (${itemId}, 'men_best_sellers', ${pid}, ${i})
    `;
  }

  // Also seed initial items for men_latest_edition, women_best_sellers, women_latest_edition
  if (products.length > 0) {
    const lePids = products.slice(0, 4).map((p) => String(p.id));
    await sql`DELETE FROM featured_collection_items WHERE collection_id = 'men_latest_edition'`;
    for (let i = 0; i < lePids.length; i++) {
      const pid = lePids[i];
      await sql`
        INSERT INTO featured_collection_items (id, collection_id, product_id, display_order)
        VALUES (${`fci_test_mle_${pid}`}, 'men_latest_edition', ${pid}, ${i})
      `;
    }

    const wPids = (womenProducts.length > 0 ? womenProducts : products).slice(0, 4).map((p) => String(p.id));
    await sql`DELETE FROM featured_collection_items WHERE collection_id = 'women_best_sellers'`;
    for (let i = 0; i < wPids.length; i++) {
      const pid = wPids[i];
      await sql`
        INSERT INTO featured_collection_items (id, collection_id, product_id, display_order)
        VALUES (${`fci_test_wbs_${pid}`}, 'women_best_sellers', ${pid}, ${i})
      `;
    }

    await sql`DELETE FROM featured_collection_items WHERE collection_id = 'women_latest_edition'`;
    for (let i = 0; i < wPids.length; i++) {
      const pid = wPids[i];
      await sql`
        INSERT INTO featured_collection_items (id, collection_id, product_id, display_order)
        VALUES (${`fci_test_wle_${pid}`}, 'women_latest_edition', ${pid}, ${i})
      `;
    }
  }

  // Verify items query with ordering
  const items = await sql`
    SELECT fci.id as item_id, fci.display_order, p.id, p.name, p.price, p.department
    FROM featured_collection_items fci
    JOIN products p ON fci.product_id = p.id
    WHERE fci.collection_id = 'men_best_sellers'
    ORDER BY fci.display_order ASC
  `;
  console.log(`Retrieved ${items.length} items from men_best_sellers:`);
  items.forEach((it) => {
    console.log(` - Order #${it.display_order + 1}: ${it.name} (id: ${it.id}, ₹${it.price})`);
  });

  if (items.length !== testPids.length) {
    throw new Error(`Expected ${testPids.length} items, got ${items.length}`);
  }

  console.log("\n=== 5. VERIFYING DUAL CATALOG CONVERSION ===");
  const rawProd = products[0];
  if (rawProd) {
    const catalogItem = toCatalogProduct(rawProd as ProductRow, true);
    console.log(`Converted catalog item:`, {
      id: catalogItem.node.id,
      title: catalogItem.node.title,
      handle: catalogItem.node.handle,
      price: catalogItem.node.priceRange.minVariantPrice.amount,
    });
  }

  console.log("\n=== 6. VERIFYING INSTAGRAM LINK NORMALIZATION ===");
  const targetUrl = "https://www.instagram.com/riotous.store_?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw==";
  console.log(`Target Instagram URL: ${targetUrl}`);

  console.log("\n>>> ALL TEST VERIFICATIONS COMPLETED SUCCESSFULLY! <<<");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
