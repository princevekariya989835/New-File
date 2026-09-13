import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const LLMS_TXT_CONTENT = `# RIOTOUS — Official Brand Information & AI Context

> RIOTOUS is an independent premium DTF-printed streetwear label based in India. RIOTOUS designs and manufactures heavyweight oversized graphic t-shirts, custom apparel, and offers a live interactive studio to design your own prints.

## Core Brand Information

- **Brand Name**: RIOTOUS
- **Website**: https://riotous.store
- **Tagline**: "We Don't Follow Trends. We Print Them."
- **Country of Origin**: India
- **Primary Category**: Premium DTF Streetwear, Oversized Graphic Tees, Custom DTF Apparel

## Product Craftsmanship & Materials

- **Fabric**: Custom-developed 100% heavyweight combed cotton (240+ GSM), engineered for structured drape and everyday longevity.
- **Printing Technology**: Industrial-grade Direct-to-Film (DTF) printing delivering vibrant color reproduction, razor-sharp detail, stretch-resistance, and wash durability without cracking or peeling.
- **Fit**: Signature relaxed, oversized streetwear silhouette with reinforced double-needle stitched necklines and hems. Pre-shrunk fabric.

## Key Public Pages & URLs

- **Homepage**: https://riotous.store/ — Featured seasonal drops, bestsellers, and brand philosophy.
- **Shop / Catalog**: https://riotous.store/shop — Browse the full collection of graphic streetwear and oversized tees.
- **Custom Design Studio**: https://riotous.store/design — Upload artwork, add typography, and preview custom front and back DTF prints on 3D tees.
- **About Us**: https://riotous.store/about — The RIOTOUS story, material specs, and ethical production process.
- **Contact & Support**: https://riotous.store/contact — Direct customer care channels.
- **Shipping Policy**: https://riotous.store/shipping-policy — Fast PAN-India shipping timelines (3–6 business days) with end-to-end tracking.
- **Refund & Return Policy**: https://riotous.store/refund-policy — Hassle-free return and exchange policy for unworn items with original tags.
- **XML Sitemap**: https://riotous.store/sitemap.xml — Machine-readable index of all live public pages and product URLs.

## Contact & Customer Care

- **Support Email**: support@riotous.store
- **Operating Hours**: Monday to Saturday, 10:00 AM – 7:00 PM IST
- **Instagram**: @riotous.store
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(LLMS_TXT_CONTENT, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
