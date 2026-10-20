# RIOTOUS Environment Configuration Reference

> **Security Rule**: NEVER commit real secrets, API keys, or live credentials to source control or documentation.  
> **Local Configuration**: `.env` (Ignored by Git, modeled after `.env.example`)  
> **Production Configuration**: `wrangler.json` (`vars`) & `npx wrangler secret put <KEY>`

This document catalogs every environment variable and Cloudflare binding used in the RIOTOUS codebase, explaining its purpose, source, and formatting requirements.

---

## 1. Master Environment Variable Matrix

| Variable Name | Required By | Environment | Description & Format |
| :--- | :--- | :--- | :--- |
| **`DATABASE_URL`** | `src/lib/db.ts` | Secret (Local / Prod) | Neon PostgreSQL connection URI (`postgres://user:pass@host/dbname?sslmode=require`). Used as cloud fallback when Cloudflare D1 binding is not used. |
| **`AUTH_SECRET`** | `src/lib/auth.server.ts` | Secret (Local / Prod) | Cryptographic secret string (min 32 chars) used to sign and verify session JWTs. |
| **`ADMIN_RESET_PASSWORD`**| `src/lib/admin-reset.functions.ts` | Secret (Optional) | Master password used for emergency administrator password reset. |
| **`RAZORPAY_KEY_ID`** | `src/lib/razorpay.server.ts` | Secret (Local / Prod) | Public Razorpay API Key ID (e.g. `rzp_live_...` or `rzp_test_...`). |
| **`RAZORPAY_KEY_SECRET`**| `src/lib/razorpay.server.ts` | Secret (Local / Prod) | Private Razorpay API Key Secret used for order creation and HMAC verification. |
| **`RAZORPAY_WEBHOOK_SECRET`**| `src/routes/api/razorpay.webhook.ts` | Secret (Local / Prod) | Webhook secret configured in Razorpay Dashboard to sign incoming event payloads. |
| **`ADMIN_NOTIFICATION_EMAIL`** | `src/lib/env.server.ts` | Secret (Cloudflare Worker Secret / `.dev.vars`) | Administrator destination email address receiving private notices for new registrations and verified orders. Never exposed to client. |
| **`SITE_URL`** | `src/lib/env.server.ts` | Plain text (`wrangler.json` / `.env`) | Trusted canonical HTTPS site URL (e.g. `https://riotous.store`). Used to construct password reset links; never trusts incoming Host header. |
| **`BREVO_API_KEY`** | `src/lib/email/brevo.ts` | Secret (Local / Prod) | Brevo (formerly Sendinblue) API v3 key (`xkeysib-...`) for transactional order emails and admin notifications. |
| **`RESEND_API_KEY`** | `src/lib/email/resend.ts` | Secret (Optional) | Resend API key (`re_...`) used as secondary transactional email delivery provider. |
| **`EMAIL_FROM`** | `src/lib/email/*` | Plain text (`wrangler.json` / `.env`) | Standard sender name and email (e.g. `RIOTOUS <order@riotous.store>`). |
| **`EMAIL_MODE`** | `src/lib/email/*` | Plain text (`wrangler.json` / `.env`) | Email execution mode: `'production'` (sends real emails) or `'development'` (logs to console). |
| **`RETURN_EMAIL_FROM`** | `src/lib/email/*` | Plain text (Optional) | Dedicated sender email for return and exchange correspondence. |
| **`ZIPPYY_BASE_URL`** | `src/lib/zippyy/client.ts` | Plain text (`wrangler.json` / `.env`) | Zippyy logistics API endpoint (`https://sellingpartnerapi-in.zippyy.ai` in prod, `https://api.zippyy.in` in sandbox). |
| **`ZIPPYY_EMAIL`** | `src/lib/zippyy/client.ts` | Secret (Local / Prod) | Account email for Zippyy logistics OAuth authentication. |
| **`ZIPPYY_PASSWORD`** | `src/lib/zippyy/client.ts` | Secret (Local / Prod) | Account password for Zippyy logistics OAuth authentication. |
| **`ZIPPYY_PICKUP_PINCODE`**| `src/lib/zippyy/*` | Plain text (`wrangler.json` / `.env`) | Origin warehouse postal pincode (`395006` for Surat, Gujarat facility). |
| **`ZIPPYY_LOCATION_ID`** | `src/lib/zippyy/*` | Plain text (`wrangler.json` / `.env`) | Warehouse location identifier UUID in Zippyy system. |
| **`ZIPPYY_DEFAULT_WAREHOUSE_ID`**| `src/lib/zippyy/*` | Plain text (`wrangler.json` / `.env`) | Default warehouse ID assigned for pickup dispatch. |
| **`ZIPPYY_WEBHOOK_URL`** | `src/lib/zippyy/*` | Plain text (`.env`) | Public webhook endpoint URL (`https://riotous.store/api/zippyy/webhook`). |
| **`ZIPPYY_WEBHOOK_SECRET`**| `src/routes/api/zippyy.webhook.ts` | Secret (Local / Prod) | Cryptographic secret verifying inbound Zippyy tracking status webhooks. |
| **`ZIPPYY_SANDBOX_MODE`**| `src/lib/zippyy/*` | Plain text (`wrangler.json` / `.env`) | Boolean string: `'false'` for live dispatch, `'true'` for sandbox mocking. |
| **`NITRO_PRESET`** | `vite.config.ts` | Build flag (Optional) | Server preset (defaults to `'cloudflare_module'` or `'cloudflare-pages'`). |
| **`NODE_ENV`** | Vite & Nitro | System | Environment mode (`'development'` or `'production'`). |

---

## 2. Cloudflare D1 Native Database Binding

Cloudflare D1 is bound natively inside `wrangler.json` and injected into the request execution context:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "riotous-db",
    "database_id": "7487ac0f-706e-4560-baf8-e79031b2dd5e",
    "migrations_dir": "migrations"
  }
]
```
In server functions and `src/server.ts`, this binding is accessed via `env.DB` or `getD1Binding()` from `src/lib/db.ts`.

---

## 3. Local Development Configuration (`.env`)

For local testing, duplicate `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Ensure you provide test keys (e.g. `rzp_test_...`) when testing payment flows locally.
