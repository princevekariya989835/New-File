# RIOTOUS Cloudflare Workers Deployment Guide

> **Runtime**: Cloudflare Workers (Module format) • Nitro 3 Preset • D1 Native SQLite Database  
> **Custom Domain**: `riotous.store`  
> **Key Configuration**: `wrangler.json`, `vite.config.ts`, `scripts/ensure-build-deps.mjs`, `scripts/copy-dist.mjs`

This guide details the Cloudflare Workers production configuration, build process, environment bindings, and deployment procedures for RIOTOUS.

---

## 1. Production Deployment Architecture

```text
Local / CI Repository
         │
         ▼  npm run build
  1. scripts/ensure-build-deps.mjs  (Checks rolldown / entities dependencies)
  2. vite build                      (TanStack Start SSR + Nitro worker compiler)
  3. scripts/copy-dist.mjs           (Aligns public assets and server output)
         │
         ▼  .output/ Directory
  ├── .output/public/                (Static assets bound to ASSETS)
  └── .output/server/index.mjs       (Compiled Worker module entry)
         │
         ▼  npx wrangler deploy
Cloudflare Global Edge Network
  ├── Custom Domain Binding: riotous.store
  ├── D1 Database Binding: DB -> riotous-db
  └── Static Assets CDN: Bound to ASSETS
```

---

## 2. Wrangler Configuration (`wrangler.json`)

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "new-file0",
  "main": ".output/server/index.mjs",
  "compatibility_date": "2025-09-01",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "binding": "ASSETS",
    "directory": ".output/public"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "riotous-db",
      "database_id": "7487ac0f-706e-4560-baf8-e79031b2dd5e",
      "migrations_dir": "migrations"
    }
  ],
  "vars": {
    "EMAIL_FROM": "RIOTOUS <order@riotous.store>",
    "EMAIL_MODE": "production",
    "ZIPPYY_BASE_URL": "https://sellingpartnerapi-in.zippyy.ai",
    "ZIPPYY_PICKUP_PINCODE": "395006",
    "ZIPPYY_LOCATION_ID": "1ee605b9-d07e-47d4-a887-64a9e728ef50",
    "ZIPPYY_DEFAULT_WAREHOUSE_ID": "1ee605b9-d07e-47d4-a887-64a9e728ef50",
    "ZIPPYY_SANDBOX_MODE": "false"
  },
  "observability": {
    "enabled": true
  }
}
```

---

## 3. Build & Deployment Commands

### 3.1 Local Production Build
```bash
# Compiles full client and edge server bundle
npm run build
```
The build runs three coordinated phases:
1. `node scripts/ensure-build-deps.mjs`: Ensures required entity and parser dependencies are present.
2. `vite build`: Compiles TanStack Start routes, SSR server bundle, and client assets.
3. `node scripts/copy-dist.mjs`: Copies generated files into `.output/` directories expected by Wrangler.

### 3.2 Deploying to Cloudflare
```bash
# Deploy worker bundle and static assets to Cloudflare
npx wrangler deploy
```

### 3.3 Deploying Database Migrations
```bash
# Apply pending SQL migrations to remote D1
npx wrangler d1 migrations apply riotous-db --remote
```

---

## 4. Setting Production Secrets via Wrangler

Secrets MUST NOT be committed to git or stored in plain text. Configure them using the Wrangler CLI:

```bash
# Razorpay Credentials
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET

# Email APIs
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put RESEND_API_KEY

# Zippyy Logistics Credentials
npx wrangler secret put ZIPPYY_EMAIL
npx wrangler secret put ZIPPYY_PASSWORD
npx wrangler secret put ZIPPYY_WEBHOOK_SECRET

# Auth Secret & Database
npx wrangler secret put AUTH_SECRET
npx wrangler secret put DATABASE_URL
```

---

## 5. Logs & Live Troubleshooting

To stream live logs and unhandled runtime exceptions from production Cloudflare Workers:
```bash
# Tail live production worker logs
npx wrangler tail

# Check D1 database status & storage metrics
npx wrangler d1 info riotous-db
```
