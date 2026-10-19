# RIOTOUS UI Design System & Brand Guidelines

> **Design Theme**: Premium Streetwear • Dark Minimalist Aesthetic • High-Contrast Bold Typography  
> **Color Identity**: Signature Riotous Red (`#F00B11`) on Deep Charcoal / Zinc (`#0C0C0E`)

This guide establishes the brand guidelines, color palettes, typography, UI components, and responsive interaction standards for the RIOTOUS platform.

---

## 1. Brand Identity & Visual Philosophy

RIOTOUS represents modern Indian streetwear culture: bold, unapologetic, and premium. The interface balances high-impact visual design with clean, fast, and accessible ecommerce functionality.

### 1.1 Brand Color Palette

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| **`brand-red`** | `#F00B11` | Primary brand accent: CTA buttons, active states, discount tags, logo accent. |
| **`brand-red-hover`** | `#D0090F` | Darkened red for hover states and active button presses. |
| **`brand-black`** | `#0C0C0E` | Master dark background for headers, footers, admin sidebar, and dark mode containers. |
| **`brand-zinc`** | `#18181B` | Secondary dark background for cards, modals, and surface elevations. |
| **`brand-border`** | `#27272A` | Subtle border separators for dark surfaces. |
| **`brand-white`** | `#FFFFFF` | Primary high-contrast text on dark surfaces. |
| **`brand-muted`** | `#A1A1AA` | Secondary typography, captions, and metadata. |

### 1.2 Logo Usage
- **Primary Brandmark**: `public/assets/riotous-logo.png`.
- **Usage**: Displayed in `site-header.tsx` with `h-7 sm:h-8 w-auto`, centered or left-aligned depending on viewport width. Always wrapped with a link to `/`.

---

## 2. Typography

Configured via `@theme` tokens in `src/styles.css`:
- **Display & Headings**: Uppercase, heavy font weight (`font-extrabold` or `font-black`), tracking tight (`tracking-tighter` or `tracking-tight`).
- **Body & Product Information**: Clean, highly readable sans-serif (`Inter`, system UI font fallback).
- **Price Displays**: Bold tabular numbers (`font-bold`, `tabular-nums`) with Indian Rupee symbol (`₹`).

---

## 3. UI Component Library (`src/components/ui/`)

All standard user interface primitives are located in `src/components/ui/` and built on top of Radix UI primitives:

### 3.1 Buttons (`src/components/ui/button.tsx`)
- **`default`**: High-contrast dark button with subtle elevation.
- **`destructive`**: Signature brand red (`bg-[#F00B11] text-white hover:bg-[#D0090F]`).
- **`outline`**: Bordered button with subtle background hover.
- **`secondary`**: Muted zinc container for secondary actions.
- **`ghost`**: Clean transparent button for icons and navigation links.

### 3.2 Product Cards (`src/components/product-card.tsx`)
- **Aspect Ratio**: Standardized `aspect-[3/4]` portrait image container.
- **Micro-Interactions**: Image hover zoom (`scale-105 transition-transform duration-500`).
- **Tags**: Badges for "NEW DROP", "BESTSELLER", or discount percentage ("33% OFF").
- **Quick Action**: Direct click opens `/product/:handle` with preselected default variant.

### 3.3 Modals, Sheets & Drawers
- **`src/components/cart-drawer.tsx`**: Accessible slide-out sheet (`Radix Sheet`) from the right viewport edge.
- **`src/components/search-dialog.tsx`**: Center-screen modal overlay with focus trapping and instant search input.
- **`src/components/product/product-size-guide-modal.tsx`**: Garment size measurement chart modal.

---

## 4. Responsive & Mobile-First Conventions

Over 70% of streetwear shoppers browse on mobile devices. The following conventions are strictly maintained:
1. **Sticky Header & Mobile Navigation**:
   - Header stays sticky at `top-0 z-50` with backdrop blur (`backdrop-blur-md bg-background/80`).
   - Mobile navigation drawer opens smoothly via hamburger trigger.
2. **Bottom Offer Bar (`src/components/home/mobile-bottom-offer-bar.tsx`)**:
   - Sticky mobile bottom bar displaying flash sales and active discount countdowns.
3. **Category Pills (`src/components/home/mobile-category-navigation.tsx`)**:
   - Horizontally scrollable category pills on mobile (`overflow-x-auto no-scrollbar`).
4. **Touch Target Size**:
   - All interactive buttons and touch targets maintain a minimum dimension of $44 \times 44\text{px}$.

---

## 5. UI States & User Feedback

- **Loading States**:
  - Storefront uses `src/components/site-loader.tsx` for initial page transitions.
  - Skeletons (`src/components/ui/skeleton.tsx` and `admin-skeletons.tsx`) mirror real component shapes during data fetching.
- **Empty States**:
  - `src/components/empty-products.tsx` displays stylized streetwear illustrations and recommendations when search results or categories have zero items.
- **Toast Notifications**:
  - Global Sonner toast provider (`sonner`) configured in `__root.tsx`.
  - Notifications for "Added to Bag", "Coupon Applied", and "Order Placed" appear cleanly at the bottom right.
