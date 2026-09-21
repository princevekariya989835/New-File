# Project Guidelines

- Application built with React, TanStack Start, Tailwind CSS, and Neon PostgreSQL.
- Maintain standard TypeScript code quality and test builds with `npm run build`.
- **Admin Panel Real-time Consistency**: Whatever is changed in the admin panel (products, pricing, stock/inventory, website config, banners, theme, shipping, settings, etc.) MUST immediately reflect for ALL users—both logged-in users and non-logged-in (guest) visitors. All caching layers (server in-memory and client-side SWR) must invalidate instantly upon admin mutation so data is always synchronized across all users while maintaining lightning-fast performance.

