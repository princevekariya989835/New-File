import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import path from "path";

// Load ALL env vars into process.env for server-side code (server routes / server functions).
const serverEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
      // React Email's htmlparser2 needs entities v4 deep imports; force the
      // hoisted v4.5.0 copy so any nested newer copy is never used.
      "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
      entities: path.resolve(process.cwd(), "node_modules/entities"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: [
      "@tanstack/react-start",
      "@tanstack/react-router",
      "@tanstack/react-router-devtools",
      "@tanstack/start-static-server-functions",
    ],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "lucide-react",
      "zustand",
      "zustand/middleware",
      "sonner",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
    ],
  },
  build: {
    rollupOptions: {},
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      client: { entry: "client" },
      server: { entry: "server" },
    }),
    nitro({
      preset:
        process.env.NITRO_PRESET || (process.env.CF_PAGES ? "cloudflare-pages" : "node-server"),
      compressPublicAssets: true,
      routeRules: {
        "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        "/videos/**": { headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=86400" } },
        "/favicon*": { headers: { "cache-control": "public, max-age=86400" } },
        "/_server/**": { headers: { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" } },
        "/_serverFn/**": { headers: { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" } },
        "/api/media/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        "/api/public/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        "/api/**": { headers: { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" } },
      },
    }),
    viteReact(),
  ],
});
