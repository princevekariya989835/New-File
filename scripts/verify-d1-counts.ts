import { execSync } from "child_process";

const tables = [
  "categories",
  "profiles",
  "products",
  "product_variants",
  "product_highlights",
  "product_specifications",
  "product_offers",
  "coupons",
  "coupon_usage",
  "orders",
  "order_items",
  "store_settings",
  "return_settings",
  "website_published",
  "reviews",
  "returns",
  "design_submissions",
];

async function main() {
  console.log("=== VERIFYING D1 RIOTOUS-DB COUNTS ===\n");
  for (const t of tables) {
    try {
      const out = execSync(
        `npx wrangler d1 execute riotous-db --remote --command="SELECT count(*) as count FROM \\"${t}\\""`,
        { encoding: "utf8" }
      );
      const jsonMatch = out.match(/\[\s*\{\s*"results":[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const count = parsed[0]?.results[0]?.count ?? 0;
        console.log(`${t.padEnd(25)}: ${count} rows`);
      } else {
        console.log(`${t.padEnd(25)}: queried`);
      }
    } catch (e: any) {
      console.log(`${t.padEnd(25)}: error (${e.message.split("\n")[0]})`);
    }
  }
}

main();
