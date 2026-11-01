import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Cookie as CookieIcon, X } from "lucide-react";
import { getCookie, setSecureCookie } from "@/lib/cookie";

const CONSENT_COOKIE_KEY = "riotous_cookie_consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = getCookie(CONSENT_COOKIE_KEY);
    if (!consent) {
      // Delay slightly for smooth fade-in after initial page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    setSecureCookie(CONSENT_COOKIE_KEY, "all", { maxAge: 365 * 24 * 60 * 60 });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cookie_consent_accepted"));
      if (typeof (window as any).__triggerAnalyticsConsent === "function") {
        (window as any).__triggerAnalyticsConsent();
      }
    }
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    setSecureCookie(CONSENT_COOKIE_KEY, "essential", { maxAge: 365 * 24 * 60 * 60 });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl border border-border/80 bg-background/95 p-5 shadow-2xl backdrop-blur-xl transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CookieIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold tracking-tight">We value your privacy</h3>
          </div>
          <button
            type="button"
            onClick={handleEssentialOnly}
            aria-label="Close and accept essential cookies only"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          We use strictly essential cookies for secure login, cart checkout, and fraud protection. No unnecessary tracking. Learn more in our{" "}
          <Link
            to="/privacy"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
          >
            Privacy & Cookie Policy
          </Link>
          .
        </p>

        <div className="mt-4 flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background shadow hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Accept All
          </button>
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary/60 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
          >
            Essential Only
          </button>
        </div>
      </div>
    </div>
  );
}
