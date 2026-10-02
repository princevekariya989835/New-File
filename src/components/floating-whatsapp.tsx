import { MessageCircle } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";

export function FloatingWhatsApp() {
  const location = useLocation();
  const { config } = usePublishedWebsiteConfig();
  const pathname = location.pathname;

  // Do not display on checkout, admin, auth, or design studio (design has its own help button)
  const isExcluded =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/design");

  if (isExcluded) return null;

  const phone =
    (config?.footer as any)?.socialLinks?.whatsapp ||
    config?.settings?.storePhone ||
    (config as any)?.general?.contactPhone ||
    "919099866791";

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone || "919099866791"}?text=Hi%20RIOTOUS%20team%2C%20I%20have%20a%20question%20about%20your%20products`;

  return (
    <aside
      aria-label="WhatsApp customer support"
      className="fixed z-40 transition-all duration-300 pointer-events-auto"
      style={{
        bottom: "max(5rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))",
        right: "max(16px, env(safe-area-inset-right, 16px))",
      }}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with RIOTOUS on WhatsApp"
        className="group flex h-11 min-h-[44px] items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-foreground shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-brand-red hover:border-brand-red hover:text-white hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-brand-red focus-visible:outline-offset-2"
      >
        <MessageCircle className="h-4 w-4 text-brand-red transition-colors group-hover:text-white shrink-0" />
        <span className="hidden sm:inline">WhatsApp</span>
        <span className="sm:hidden">Chat</span>
      </a>
    </aside>
  );
}
