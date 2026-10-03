import fs from "fs";
import path from "path";

const root = process.cwd();
const outputDir = path.join(root, ".output");
const distDir = path.join(root, "dist");
const outputPublicDir = path.join(outputDir, "public");

if (fs.existsSync(outputDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  fs.cpSync(outputDir, distDir, { recursive: true });
  if (fs.existsSync(outputPublicDir)) {
    fs.cpSync(outputPublicDir, distDir, { recursive: true });
  }

  // Ensure D1 database binding in wrangler.json
  const wranglerPaths = [
    path.join(distDir, "server", "wrangler.json"),
    path.join(outputDir, "server", "wrangler.json"),
  ];

  for (const wPath of wranglerPaths) {
    if (fs.existsSync(wPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(wPath, "utf8"));
        config.name = "new-file0";
        config.d1_databases = [
          {
            binding: "DB",
            database_name: "riotous-db",
            database_id: "7487ac0f-706e-4560-baf8-e79031b2dd5e",
          },
        ];
        fs.writeFileSync(wPath, JSON.stringify(config, null, 2), "utf8");
      } catch (err) {
        console.warn(`Could not patch ${wPath}:`, err);
      }
    }
  }

  console.log("✓ Successfully copied build output and synced D1 bindings");
}
