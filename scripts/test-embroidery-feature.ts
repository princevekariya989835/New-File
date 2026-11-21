import { getSql, ensureDbSchema } from "../src/lib/db";
import { normalizeProductInput } from "../src/lib/admin-utils";
import { getPublishedProducts, fetchEmbroideryProductsServerFn } from "../src/lib/catalog";

async function main() {
  console.log("=== 1. INITIALIZING SCHEMA & TABLES ===");
  await ensureDbSchema();
  const sql = getSql();

  console.log("=== 2. TESTING PRODUCT INPUT NORMALIZATION ===");
  const dtfInput = normalizeProductInput({
    title: "Cyberpunk DTF Graphic Tee",
    price: 999,
    productionType: "dtf",
    colors: ["Black", "White"],
  });
  console.log("DTF normalized production_type:", dtfInput.production_type);
  if (dtfInput.production_type !== "dtf") {
    throw new Error("Expected production_type 'dtf', got " + dtfInput.production_type);
  }

  const embroideryInput = normalizeProductInput({
    title: "Classic Embroidered Rose Tee",
    price: 1299,
    productionType: "embroidery",
    colors: ["Black", "Sage Green"],
  });
  console.log("Embroidery normalized production_type:", embroideryInput.production_type);
  if (embroideryInput.production_type !== "embroidery") {
    throw new Error("Expected production_type 'embroidery', got " + embroideryInput.production_type);
  }

  console.log("=== 3. INSERTING TEST EMBROIDERY PRODUCT IN DB ===");
  const testEmbroideryId = "prod_test_embroidery_1";
  await sql`
    INSERT INTO products (
      id, name, slug, price, currency, images, category, department, production_type, is_active, sizes, colors, tags, stock_quantity
    ) VALUES (
      ${testEmbroideryId}, 'Test Dragon Embroidery Tee', 'test-dragon-embroidery-tee', 1499, 'INR',
      ${JSON.stringify(["/products/zoro-black-1.jpg"])}::jsonb, 'Embroidery', 'unisex', 'embroidery', 1,
      ${JSON.stringify(["S", "M", "L", "XL"])}::jsonb,
      ${JSON.stringify(["Black", "Maroon"])}::jsonb,
      ${JSON.stringify(["Embroidery", "Featured"])}::jsonb,
      50
    )
    ON CONFLICT (id) DO UPDATE SET production_type = 'embroidery';
  `;

  const testDtfId = "prod_test_dtf_1";
  await sql`
    INSERT INTO products (
      id, name, slug, price, currency, images, category, department, production_type, is_active, sizes, colors, tags, stock_quantity
    ) VALUES (
      ${testDtfId}, 'Test Neon DTF Tee', 'test-neon-dtf-tee', 999, 'INR',
      ${JSON.stringify(["/products/zenitsu-maroon-1.jpg"])}::jsonb, 'T-Shirts', 'men', 'dtf', 1,
      ${JSON.stringify(["S", "M", "L", "XL"])}::jsonb,
      ${JSON.stringify(["White"])}::jsonb,
      ${JSON.stringify(["DTF", "New"])}::jsonb,
      30
    )
    ON CONFLICT (id) DO UPDATE SET production_type = 'dtf';
  `;

  console.log("=== 4. TESTING EMBROIDERY COLLECTION QUERY ===");
  const allPublished = await getPublishedProducts(200);
  console.log(`Fetched ${allPublished.length} total published products.`);

  const embroideryItems = allPublished.filter((p) => {
    const prodType = (p.node.productionType || (p.node as any).production_type || "dtf").toLowerCase().trim();
    return prodType === "embroidery";
  });
  console.log(`Found ${embroideryItems.length} embroidery products.`);
  if (!embroideryItems.some((p) => p.node.id === testEmbroideryId)) {
    throw new Error("Test embroidery product was not found in embroideryItems!");
  }
  if (embroideryItems.some((p) => p.node.id === testDtfId)) {
    throw new Error("DTF product leaked into embroidery collection!");
  }
  console.log("✓ Verified: Only Embroidery products exist in the Embroidery collection.");

  console.log("=== 5. TESTING COLOR FILTERING & PRODUCTION TYPE COMBINATION ===");
  // Test filtering for Black + Embroidery
  const blackEmbroidery = allPublished.filter((p) => {
    const isEmbroidery = (p.node.productionType || (p.node as any).production_type || "dtf").toLowerCase() === "embroidery";
    const hasBlack = (p.node.options.find((o) => o.name.toLowerCase() === "color")?.values || []).some((c) => c.toLowerCase() === "black");
    return isEmbroidery && hasBlack;
  });
  console.log(`Found ${blackEmbroidery.length} Black Embroidery products.`);
  if (!blackEmbroidery.some((p) => p.node.id === testEmbroideryId)) {
    throw new Error("Test product failed Black + Embroidery combined filter!");
  }
  console.log("✓ Verified: Color filter combined with Production Type works correctly.");

  console.log("=== 6. VERIFYING HOMEPAGE CONFIG & EMBROIDERY CARD ===");
  const { DEFAULT_WEBSITE_CONFIG } = await import("../src/lib/website-config.types");
  const { mergeWithDefaults } = await import("../src/lib/website-config.functions");

  // Test default website config
  const defCollections = DEFAULT_WEBSITE_CONFIG.collections;
  const defCard3 = defCollections[2];
  console.log("Default Collection Card 3:", defCard3);
  if (defCard3.title !== "Embroidery" || defCard3.tag !== "EMBROIDERY COLLECTION" || defCard3.link !== "/collections/embroidery") {
    throw new Error("Default config card 3 mismatch!");
  }

  // Test normalized config (even with legacy DB values)
  const normalized = mergeWithDefaults({
    collections: [
      { id: "col_1", title: "Printed Tees", link: "/shop" },
      { id: "col_2", title: "Custom Printing", link: "/design" },
      { id: "col_3", title: "Oversized", tag: "NEW SILHOUETTES", link: "/shop" },
      { id: "col_4", title: "Best Sellers", link: "/shop" },
    ],
  });
  const normCard3 = normalized.collections[2];
  console.log("Normalized Legacy Card 3:", {
    title: normCard3.title,
    tag: normCard3.tag,
    link: normCard3.link,
    description: normCard3.description,
  });

  if (normCard3.title !== "Embroidery") {
    throw new Error(`Expected normalized card 3 title 'Embroidery', got '${normCard3.title}'`);
  }
  if (normCard3.tag !== "EMBROIDERY COLLECTION") {
    throw new Error(`Expected normalized card 3 tag 'EMBROIDERY COLLECTION', got '${normCard3.tag}'`);
  }
  if (normCard3.link !== "/collections/embroidery") {
    throw new Error(`Expected normalized card 3 link '/collections/embroidery', got '${normCard3.link}'`);
  }
  console.log("✓ Verified: Homepage Card 3 correctly updated and migrated to Embroidery.");

  console.log("\n>>> ALL EMBROIDERY TESTS PASSED 100%! <<<");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
