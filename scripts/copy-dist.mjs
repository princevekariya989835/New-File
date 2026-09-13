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
  console.log("✓ Successfully copied build output to dist directory");
}
