import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  Menu,
  Search,
  User,
  X,
  LogOut,
  Package,
  Heart,
  RotateCcw,
  ShieldCheck,
  Star,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";
import { CartDrawer } from "./cart-drawer";
import { SearchDialog } from "./search-dialog";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { AnnouncementBar } from "./announcement-bar";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminPanelAccess } from "@/lib/auth.types";
import { BrandName } from "@/components/brand-name";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";
import type { WebsiteConfig } from "@/lib/website-config.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const defaultNav = [
  { to: "/shop", label: "Shop" },
  { to: "/design", label: "Design Your Own" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader({ customConfig }: { customConfig?: WebsiteConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCheckoutPage = location.pathname === "/checkout";
  const isAdmin = hasAdminPanelAccess(user);
  const { config: publishedConfig, isLoading } = usePublishedWebsiteConfig();
  const config = customConfig || publishedConfig;

  const cartItems = useCartStore((s) => s.items);
  const totalCartItems = cartItems.reduce((s, i) => s + (Number(i?.quantity) || 0), 0);

  const rawNavItems: any[] = Array.isArray(config?.navigation)
    ? config.navigation
    : Array.isArray((config as any)?.navigation?.items)
      ? (config as any).navigation.items
      : [];

  const navItems = rawNavItems
    .filter((n) => n && n.enabled !== false)
    .map((n) => ({
      to: n.to || "/",
      label: n.label || "Link",
      isExternal: Boolean(n.isExternal),
    }));

  const activeNav = config || !isLoading ? (navItems.length > 0 ? navItems : defaultNav) : [];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U";

  return (
    <>
      {!isCheckoutPage ? (
        <AnnouncementBar config={config?.announcement || (config as any)?.announcementBar} />
      ) : (
        <div className="hidden md:block">
          <AnnouncementBar config={config?.announcement || (config as any)?.announcementBar} />
        </div>
      )}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Dedicated Mobile Checkout Header (approx 64px, mobile-only, solid dark #111111 for high logo contrast) */}
      {isCheckoutPage && (
        <header className="fixed inset-x-0 top-0 z-50 flex md:hidden h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#111111] px-3.5 sm:px-4 shadow-md">
          {/* Left: Back arrow */}
          <div className="flex w-12 items-center justify-start">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/shop" });
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Center: RIOTOUS Logo (high contrast on dark background) */}
          <div className="flex flex-1 items-center justify-center">
            <Link to="/" className="flex items-center justify-center py-1" aria-label="RIOTOUS home">
              <img
                src="/assets/riotous-logo.png"
                alt="RIOTOUS"
                width={130}
                height={32}
                loading="eager"
                decoding="async"
                className="h-7 sm:h-8 w-auto max-w-[140px] object-contain drop-shadow-sm select-none"
                draggable={false}
              />
            </Link>
          </div>

          {/* Right: Cart icon + badge */}
          <div className="flex w-12 items-center justify-end">
            <CartDrawer
              trigger={
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                  aria-label={`Cart, ${totalCartItems} items`}
                >
                  <ShoppingBag className="h-5 w-5 text-white" />
                  {totalCartItems > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f00b11] px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-[#111111]">
                      {totalCartItems}
                    </span>
                  )}
                </button>
              }
            />
          </div>
        </header>
      )}

      {/* Standard Header (preserved on desktop always, and on mobile when not checkout) */}
      <header
        className={`${isCheckoutPage ? "hidden md:flex" : "flex"} fixed inset-x-0 top-0 z-50 justify-center pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? "pt-3 px-3 sm:px-4 bg-transparent pb-0"
            : "pt-0 px-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent pb-8"
        }`}
      >
        <div
          className={`pointer-events-auto flex items-center justify-between border-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled
              ? "h-[50px] md:h-12 w-auto max-w-[96vw] md:max-w-5xl rounded-full bg-black/80 px-3 md:px-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 gap-2 md:gap-6"
              : "h-[72px] md:h-20 w-full max-w-[1400px] rounded-none bg-transparent px-3.5 sm:px-6 md:px-10 gap-2 sm:gap-4"
          }`}
        >
          {!mobileOpen && (
            <button
              className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-brand-red hover:text-white md:hidden cursor-pointer"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/" className="flex shrink-0 items-center" aria-label="RIOTOUS home">
            <img
              src="/assets/riotous-logo.png"
              alt="RIOTOUS"
              width={145}
              height={37}
              loading="eager"
              decoding="async"
              className={`shrink-0 object-contain transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                scrolled ? "w-[105px] sm:w-[115px] h-auto md:w-auto md:h-7" : "w-[115px] sm:w-[135px] md:w-auto md:h-9"
              }`}
              draggable={false}
            />
          </Link>

          <nav
            className={`hidden items-center md:flex transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "gap-1" : "gap-6"}`}
          >
            {activeNav.map((n) =>
              (n as any).isExternal ? (
                <a
                  key={n.to}
                  href={n.to}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:text-brand-red"
                >
                  {n.label}
                </a>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: true }}
                  className="relative rounded-full px-3.5 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:text-brand-red"
                  activeProps={{
                    className: "text-white font-semibold after:content-[''] after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-0.5 after:bg-brand-red after:rounded-full",
                  }}
                >
                  {scrolled && n.label === "Design Your Own" ? "Design" : n.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1 transition-all duration-300">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-brand-red hover:text-white cursor-pointer"
              aria-label="Search collection"
              title="Search products (Cmd+K)"
            >
              <Search className="h-5 w-5" />
            </button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-brand-red hover:text-white cursor-pointer"
                    aria-label="Account"
                    title={user.email}
                  >
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/account/orders" })}
                    className="cursor-pointer"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    My orders
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/account/favorites" })}
                    className="cursor-pointer"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/account/reviews" })}
                    className="cursor-pointer"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    My reviews
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/account/returns" })}
                    className="cursor-pointer"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Returns & support
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate({ to: "/admin" })}
                        className="cursor-pointer"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/auth"
                className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-brand-red hover:text-white"
                activeProps={{
                  className: "bg-brand-red text-white ring-2 ring-brand-red/40 shadow-[0_0_12px_rgba(240,11,17,0.5)]",
                }}
                aria-label="Sign in"
                title="Sign in"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            <CartDrawer />
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      <MobileNavDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenSearch={() => {
          setMobileOpen(false);
          setSearchOpen(true);
        }}
        config={config}
      />
    </>
  );
}
