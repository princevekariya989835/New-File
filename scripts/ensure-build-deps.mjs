import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * Ensures required native platform bindings are present before Vite build.
 * Fixes npm issue #4828 where npm ci skips optionalDependencies on Linux CI
 * when package-lock.json was touched on a different platform or node engine.
 */
function ensureBuildDeps() {
  if (process.platform === "linux") {
    const root = process.cwd();
    const gnuBinding = path.join(root, "node_modules", "@rolldown", "binding-linux-x64-gnu");
    const muslBinding = path.join(root, "node_modules", "@rolldown", "binding-linux-x64-musl");

    const hasGnu = fs.existsSync(gnuBinding);
    const hasMusl = fs.existsSync(muslBinding);

    if (!hasGnu && !hasMusl) {
      console.log(
        "[build-deps] Linux rolldown native binding missing in node_modules. Installing...",
      );
      try {
        execSync("npm install --no-save --ignore-scripts @rolldown/binding-linux-x64-gnu@1.2.8", {
          stdio: "inherit",
        });
        console.log("[build-deps] Successfully installed @rolldown/binding-linux-x64-gnu.");
      } catch (err) {
        console.warn("[build-deps] Warning installing binding-linux-x64-gnu:", err?.message);
      }
    } else {
      console.log("[build-deps] Rolldown Linux native binding verified.");
    }
  }
}

ensureBuildDeps();
