import fs from "fs";
import path from "path";
import zlib from "zlib";

function getFiles(dir) {
  let res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      res = res.concat(getFiles(full));
    } else {
      res.push(full);
    }
  }
  return res;
}

const dir = ".output/public/assets";
const allFiles = getFiles(dir);

const js = allFiles.filter(f => f.endsWith(".js") || f.endsWith(".mjs")).map(f => {
  const raw = fs.readFileSync(f);
  const gz = zlib.gzipSync(raw);
  return { path: f, name: path.basename(f), raw: raw.length, gz: gz.length };
});

const css = allFiles.filter(f => f.endsWith(".css")).map(f => {
  const raw = fs.readFileSync(f);
  return { path: f, name: path.basename(f), raw: raw.length };
});

const totalJs = js.reduce((a, b) => a + b.raw, 0);
const totalJsGz = js.reduce((a, b) => a + b.gz, 0);
const totalCss = css.reduce((a, b) => a + b.raw, 0);

console.log("=== CURRENT PRODUCTION BUILD METRICS ===");
console.log("Total JS:", (totalJs / 1024).toFixed(2), "KB (gzipped:", (totalJsGz / 1024).toFixed(2), "KB) across", js.length, "chunks");
console.log("Total CSS:", (totalCss / 1024).toFixed(2), "KB across", css.length, "files");

console.log("\nTop 25 Largest JS Chunks:");
js.sort((a, b) => b.raw - a.raw).slice(0, 25).forEach(f => {
  console.log(
    (f.raw / 1024).toFixed(2).padStart(8) + " KB (gz: " +
    (f.gz / 1024).toFixed(2).padStart(6) + " KB)  " + f.name
  );
});
