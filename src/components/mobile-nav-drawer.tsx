import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  X,
  Search,
  ShoppingBag,
  Pencil,
  Info,
  Phone,
  ChevronRight,
  Settings,
  LogOut,
  Package,
  Heart,
  Star,
  User,
  ArrowRight,
  Instagram,
  Youtube,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminPanelAccess } from "@/lib/auth.types";
import type { WebsiteConfig } from "@/lib/website-config.types";
import { toast } from "sonner";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  config?: WebsiteConfig;
}

function PinterestIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8.5 17c.5-2 1.3-5.2 1.3-5.2s-.3-.6-.3-1.6c0-1.5.9-2.7 2-2.7 1 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.8-.3 1.1.6 2.1 1.7 2.1 2 0 3.6-2.1 3.6-5.2 0-2.7-2-4.6-4.7-4.6-3.2 0-5.1 2.4-5.1 4.9 0 1 .4 2 .8 2.5.1.1.1.2.1.3-.1.4-.3 1.1-.3 1.3-.1.2-.2.3-.4.2-1.6-.7-2.6-2.9-2.6-4.6 0-3.7 2.7-7.2 7.8-7.2 4.2 0 7.4 3 7.4 6.9 0 4.1-2.6 7.4-6.2 7.4-1.2 0-2.4-.6-2.8-1.4l-.8 2.9c-.3 1.1-.9 2.2-1.4 3" />
    </svg>
  );
}

export function MobileNavDrawer({
  open,
  onClose,
  onOpenSearch,
  config,
}: MobileNavDrawerProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasAdminPanelAccess(user);

  // Lock background body scroll while drawer is open
  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open]);

  // Support closing with Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleSignOut() {
    onClose();
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  // Account initials & display name
  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U";

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.email ? user.email.split("@")[0] : "Member");

  // Check if promotional offer is active according to store config
  const isPromoActive = useMemo(() => {
    const offer = config?.buy2get1Offer;
    if (!offer) return true; // Default fallback active
    if (offer.enabled === false) return false;

    const now = Date.now();
    if (offer.startDate && new Date(offer.startDate).getTime() > now) return false;
    if (offer.endDate && new Date(offer.endDate).getTime() < now) return false;

    return true;
  }, [config?.buy2get1Offer]);

  // Social links from website configuration
  const socialLinks = config?.footer?.socialLinks;
  const instagramUrl = socialLinks?.instagram || "https://www.instagram.com/riotous_store";
  const youtubeUrl = socialLinks?.youtube || "";
  const pinterestUrl = (socialLinks as any)?.pinterest || "";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] md:hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      {/* Dark backdrop overlay over storefront */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Navigation Drawer */}
      <div className="fixed inset-y-0 left-0 w-[86vw] max-w-[390px] min-w-[300px] bg-white text-zinc-900 shadow-2xl flex flex-col z-[65] animate-in slide-in-from-left duration-300 ease-out">
        {/* A. Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100 shrink-0">
          <Link
            to="/"
            onClick={onClose}
            className="flex flex-col group select-none"
            aria-label="RIOTOUS Home"
          >
            <span className="text-xl sm:text-2xl font-black tracking-[0.2em] leading-none text-black font-sans">
              RI<span className="text-[#e50914]">O</span>T<span className="text-[#e50914]">O</span>US
            </span>
            <span className="text-[8.5px] font-bold tracking-[0.32em] text-zinc-400 uppercase mt-1">
              WEAR THE NOISE
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:text-black hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5 stroke-[2]" />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain px-5 pt-3.5 pb-8 space-y-4">
          {/* Subtle Mascot Watermark in Drawer Background */}
          <div
            className="absolute -bottom-10 -right-6 w-56 h-56 opacity-[0.06] pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <img
              src="/favicon.svg"
              alt=""
              width={224}
              height={224}
              className="w-full h-full object-contain grayscale"
              loading="lazy"
            />
          </div>

          {/* B. Search Bar */}
          <div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSearch();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full border border-zinc-200/90 bg-[#f4f4f5]/80 hover:bg-zinc-100 hover:border-zinc-300 transition-colors text-left text-sm text-zinc-400 group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e50914]"
              aria-label="Search products"
            >
              <Search className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0" />
              <span className="truncate text-sm text-zinc-500 font-normal">
                Search products...
              </span>
            </button>
          </div>

          {/* C. Primary Navigation */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {/* Shop Row - Highlighted in soft red */}
            <Link
              to="/shop"
              onClick={onClose}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#fef2f2] border border-red-100/70 text-[#e50914] hover:bg-red-100/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-[#e50914] stroke-[1.75]" />
                <span className="text-[15px] font-bold text-zinc-900 group-hover:text-[#e50914] transition-colors">
                  Shop
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#e50914] stroke-[2]" />
            </Link>

            {/* Design Your Own Row */}
            <Link
              to="/design"
              onClick={onClose}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Pencil className="h-4 w-4 text-zinc-800 stroke-[1.75]" />
                <span className="text-[14.5px] font-medium text-zinc-800 group-hover:text-black transition-colors">
                  Design Your Own
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </Link>
            <div className="border-b border-zinc-100 mx-3.5" />

            {/* About Row */}
            <Link
              to="/about"
              onClick={onClose}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4 text-zinc-800 stroke-[1.75]" />
                <span className="text-[14.5px] font-medium text-zinc-800 group-hover:text-black transition-colors">
                  About
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </Link>
            <div className="border-b border-zinc-100 mx-3.5" />

            {/* Contact Row */}
            <Link
              to="/contact"
              onClick={onClose}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-zinc-800 stroke-[1.75]" />
                <span className="text-[14.5px] font-medium text-zinc-800 group-hover:text-black transition-colors">
                  Contact
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </Link>
          </nav>

          {/* D. Signed-In Account Card / Welcome Card */}
          <div className="rounded-2xl border border-zinc-200/80 bg-[#f8f8f9] overflow-hidden shadow-xs">
            {user ? (
              <>
                {/* Profile Header Row */}
                <Link
                  to="/account/orders"
                  onClick={onClose}
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-100/70 transition-colors group"
                  aria-label="My Account Overview"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e50914] text-white text-sm font-bold shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-950 truncate leading-tight group-hover:text-[#e50914] transition-colors">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">
                        Signed in
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0" />
                </Link>

                <div className="border-t border-zinc-200/60" />

                {/* Account Settings Row */}
                <Link
                  to={isAdmin ? "/admin/settings" : "/account/orders"}
                  onClick={onClose}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-100/70 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="h-4 w-4 text-zinc-700 group-hover:text-black transition-colors" />
                    <span className="text-xs font-semibold text-zinc-800 group-hover:text-black transition-colors">
                      Account Settings
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0" />
                </Link>

                <div className="border-t border-zinc-200/60" />

                {/* Logout Row */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-100/70 transition-colors group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="h-4 w-4 text-zinc-700 group-hover:text-[#e50914] transition-colors" />
                    <span className="text-xs font-semibold text-zinc-800 group-hover:text-[#e50914] transition-colors">
                      Logout
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0" />
                </button>
              </>
            ) : (
              /* Guest / Welcome State */
              <Link
                to="/auth"
                onClick={onClose}
                className="flex items-center justify-between p-3.5 hover:bg-zinc-100/70 transition-colors group"
                aria-label="Sign In or Register"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 group-hover:bg-[#e50914] group-hover:text-white transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-950 leading-tight">
                      Welcome to RIOTOUS
                    </p>
                    <p className="text-xs text-[#e50914] font-semibold leading-tight mt-0.5">
                      Sign In / Create Account →
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0" />
              </Link>
            )}
          </div>

          {/* E. Quick-Access Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* My Orders Card */}
            <Link
              to="/account/orders"
              onClick={onClose}
              className="flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border border-zinc-200/80 bg-white hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-xs group text-center"
            >
              <Package className="h-6 w-6 text-[#e50914] stroke-[1.75] group-hover:scale-110 transition-transform" />
              <span className="mt-1.5 text-xs font-semibold text-zinc-800 leading-tight">
                My Orders
              </span>
            </Link>

            {/* Wishlist Card */}
            <Link
              to="/account/favorites"
              onClick={onClose}
              className="flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border border-zinc-200/80 bg-white hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-xs group text-center"
            >
              <Heart className="h-6 w-6 text-[#e50914] stroke-[1.75] group-hover:scale-110 transition-transform" />
              <span className="mt-1.5 text-xs font-semibold text-zinc-800 leading-tight">
                Wishlist
              </span>
            </Link>

            {/* Saved Card */}
            <Link
              to="/account/favorites"
              onClick={onClose}
              className="flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border border-zinc-200/80 bg-white hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-xs group text-center"
            >
              <Star className="h-6 w-6 text-[#e50914] stroke-[1.75] group-hover:scale-110 transition-transform" />
              <span className="mt-1.5 text-xs font-semibold text-zinc-800 leading-tight">
                Saved
              </span>
            </Link>
          </div>

          {/* F. Promotional Offer Banner */}
          {isPromoActive && (
            <div className="relative overflow-hidden rounded-2xl border border-red-100/90 bg-gradient-to-r from-[#fef2f2] via-[#fff5f5] to-[#fdeeed] p-4 shadow-xs">
              <div className="relative z-10 max-w-[58%]">
                <span className="text-[10px] font-bold tracking-wider text-[#e50914] uppercase">
                  SPECIAL OFFER
                </span>
                <h3 className="mt-0.5 text-base sm:text-lg font-black tracking-tight text-zinc-950 leading-tight">
                  BUY 2 GET 1 FREE
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500 font-medium">
                  Limited time only
                </p>

                <Link
                  to="/shop"
                  onClick={onClose}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e50914] hover:bg-[#c80812] active:scale-95 text-white text-[11px] font-bold uppercase tracking-wide transition-all shadow-xs cursor-pointer"
                >
                  <span>SHOP NOW</span>
                  <ArrowRight className="h-3 w-3 stroke-[2.5]" />
                </Link>
              </div>

              {/* Decorative Red Graffiti Crown Accent behind T-shirt */}
              <div
                className="absolute top-2 right-6 w-20 h-16 pointer-events-none select-none text-[#e50914] opacity-85"
                aria-hidden="true"
              >
                <svg viewBox="0 0 100 80" fill="none" className="w-full h-full">
                  <path
                    d="M 12 65 L 22 22 L 46 44 L 70 18 L 84 44 L 94 30 L 88 65 Z"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="22" cy="18" r="3.5" fill="currentColor" />
                  <circle cx="70" cy="14" r="3.5" fill="currentColor" />
                  <circle cx="94" cy="26" r="3.5" fill="currentColor" />
                </svg>
              </div>

              {/* T-Shirt Graphic Asset on the right */}
              <div className="absolute -bottom-2 -right-4 w-32 sm:w-36 h-32 sm:h-36 pointer-events-none select-none flex items-end justify-end">
                <img
                  src="/assets/promo-tee-banner.jpg"
                  alt="RIOTOUS Streetwear T-Shirt"
                  width={150}
                  height={150}
                  className="w-full h-full object-contain drop-shadow-md rotate-[-6deg] translate-x-2 translate-y-1"
                  style={{ mixBlendMode: "multiply" }}
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* G. Footer */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-700 hover:text-[#e50914] hover:bg-zinc-100 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-700 hover:text-[#e50914] hover:bg-zinc-100 transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {pinterestUrl && (
                <a
                  href={pinterestUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Pinterest"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-700 hover:text-[#e50914] hover:bg-zinc-100 transition-colors"
                >
                  <PinterestIcon className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* STAY CONNECTED link */}
            <Link
              to="/contact"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-zinc-600 hover:text-black uppercase transition-colors group"
            >
              <span>STAY CONNECTED</span>
              <ArrowRight className="h-3 w-3 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
