# RIOTOUS Frontend Development Guide

> **UI Stack**: React 19.2 • TanStack Router 1.170 • Tailwind CSS v4.2 • Radix UI • Zustand 5 • Fabric.js 7.4

This guide establishes the conventions, component architecture, state management patterns, and design system rules for frontend development in the RIOTOUS codebase.

---

## 1. Component Architecture & Conventions

### 1.1 Directory Structure
Storefront and administrative components are organized under `src/components/`:
- `src/components/ui/`: Standardized atomic design elements (Button, Card, Dialog, Dropdown, Input, Skeleton, Sonner, Sheet, Switch, Tabs).
- `src/components/home/`: Homepage visual elements (`streetwear-hero.tsx`, `image-stream-hero.tsx`, `website-homepage-content.tsx`, `mobile-bottom-offer-bar.tsx`).
- `src/components/product/`: Product detail modules (`product-details-unified.tsx`, `product-description-accordion.tsx`, `product-highlights.tsx`, `product-offers-section.tsx`, `product-recommendations.tsx`, `product-size-guide-modal.tsx`, `product-specifications.tsx`).
- `src/components/admin/`: Admin console editors (`product-details-editor.tsx`, `product-ui.tsx`, `hero-media-uploader.tsx`, `admin-erase-dialog.tsx`, `admin-skeletons.tsx`).
- `src/components/reviews/`: Customer star rating displays, review forms, and verified purchase badges.
- `src/components/site-header.tsx` & `src/components/site-footer.tsx`: Global navigation header, mobile drawer menu, search icon, bag counter, and footer links.
- `src/components/cart-drawer.tsx`: Slide-out bag panel.
- `src/components/search-dialog.tsx`: Global search modal with debounced query matching.

### 1.2 Lazy Loading Convention (`.lazy.tsx`)
Heavy routes and administrative panels MUST use TanStack Router's `.lazy.tsx` code-splitting pattern:
```text
src/routes/_authenticated/admin/orders.tsx       <-- Route definition & head metadata
src/routes/_authenticated/admin/orders.lazy.tsx  <-- Heavy client component bundle
```
This keeps initial storefront bundle sizes ultra-lean (~60KB gzip) while deferring admin panels and custom design tools until needed.

---

## 2. State Management Strategy

### 2.1 Shopping Cart Store (`src/stores/cart-store.ts`)
The customer shopping cart is managed globally via Zustand with local storage persistence under the key `riotous_cart`:
- **State Properties**:
  - `items: CartItem[]`: Selected items with unique compound ID (`productId|size|color`), title, unit price, quantity, size, color, and thumbnail image.
  - `isOpen: boolean`: Controls visibility of `cart-drawer.tsx`.
- **Core Actions**:
  - `addItem(item)`: Adds an item or increments quantity if the variant already exists in the bag.
  - `removeItem(compoundId)`: Removes the specified item.
  - `updateQuantity(compoundId, quantity)`: Updates quantity (removes if quantity <= 0).
  - `clearCart()`: Wipes all items after successful checkout.
  - `getTotalItems()` & `getSubtotal()`: Derives total item count and currency sum.

### 2.2 Client Query State (TanStack Query)
- Server function data is fetched and cached using `@tanstack/react-query`.
- **Query Keys**: Structured hierarchically:
  - `["products"]`, `["product", handle]`
  - `["admin", "orders"]`, `["admin", "inventory"]`, `["admin", "notifications"]`
  - `["is-admin", userId]`

### 2.3 Custom Hooks (`src/hooks/`)
- `useAuth()` (`src/hooks/use-auth.ts`): Provides client-side user state, sign-in, sign-up, OTP verification, and sign-out helpers.
- `useCartSync()` (`src/hooks/use-cart-sync.ts`): Synchronizes client bag with server database carts for logged-in users.
- `useFavorites()` (`src/hooks/use-favorites.ts`): Toggles and checks customer wishlist items.
- `useMobile()` (`src/hooks/use-mobile.tsx`): Responsive breakpoint listener (defaults to `<768px`).
- `useWebsiteConfig()` (`src/hooks/use-website-config.ts`): Client hook fetching live theme, announcements, and storefront layout.

---

## 3. Styling & Tailwind CSS v4

### 3.1 Master Theme Configuration (`src/styles.css`)
Tailwind CSS v4 replaces legacy config files with `@theme` blocks directly in CSS:
```css
@theme {
  --color-brand-red: #F00B11;
  --color-brand-red-hover: #D0090F;
  --color-brand-black: #0C0C0E;
  --color-brand-zinc: #18181B;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Oswald', 'Impact', sans-serif;
}
```

### 3.2 Design Principles & Aesthetics
1. **Bold Streetwear Typography**: High-contrast, uppercase headings paired with clean, legible Inter body text.
2. **Curated Dark Aesthetic**: Deep zinc backgrounds (`#0C0C0E`, `#18181B`) accented by vibrant signature red (`#F00B11`).
3. **Micro-Interactions**: Smooth hover translations, image scale transitions (`scale-105`), active button press depressions (`active:scale-95`), and sticky mobile action bars.
4. **Never Use Unstyled Placeholders**: Images must load with aspect-ratio containers, blur-up transitions, or skeleton loaders (`src/components/ui/skeleton.tsx`).

---

## 4. Custom Design Studio (`src/routes/design.lazy.tsx`)

The design studio allows customers to create custom garments:
- **Canvas Engine**: Powered by `fabric.Canvas` (Fabric.js v7.4).
- **Features**:
  - Dual-side t-shirt editor (Front and Back toggle).
  - Dynamic text insertion with font selection, color picker, and curved text effects.
  - Custom image upload with client-side canvas scaling.
  - Drag-and-drop layer management and alignment guides.
  - Final composite export to PNG data URLs for admin queue submission.

---

## 5. Frontend Performance Best Practices

1. **Optimize Image URLs**:
   Use the binary streaming endpoint `/api/public/product-image?id=:id&idx=:idx&v=:hash` instead of raw in-memory base64 strings to ensure browser caching and minimal DOM overhead.
2. **Prevent Layout Shifts (CLS)**:
   Always enforce explicit aspect ratios on product cards and banner containers (e.g., `aspect-[3/4]` for apparel).
3. **Accessible Dialogs & Menus**:
   Always use Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`) for accessible keyboard navigation and focus trapping.
