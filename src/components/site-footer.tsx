import { Link } from "@tanstack/react-router";
import {
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  MessageCircle,
  Globe,
  Mail,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { BrandName } from "@/components/brand-name";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";
import type { WebsiteConfig } from "@/lib/website-config.types";

export function SiteFooter({ customConfig }: { customConfig?: WebsiteConfig }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const { config: publishedConfig, isLoading } = usePublishedWebsiteConfig();
  const config = customConfig || publishedConfig;
  const footer = config?.footer as any;

  if (isLoading && !customConfig) {
    return <footer className="border-t border-border bg-background py-20" />;
  }

  if (footer && footer.enabled === false) {
    return null;
  }

  // Support both sections (array) and columns (array)
  const columns: Array<{
    id: string;
    title: string;
    links: Array<{ id?: string; label: string; url?: string; to?: string }>;
  }> = Array.isArray(footer?.sections)
    ? footer.sections.filter((s: any) => s.enabled !== false)
    : Array.isArray(footer?.columns)
      ? footer.columns
      : [];

  // Support both object socialLinks { instagram, youtube, ... } and array socialLinks [{ platform, url, ... }]
  let socialList: Array<{ id: string; platform: string; url: string; label?: string }> = [];
  if (Array.isArray(footer?.socialLinks)) {
    socialList = footer.socialLinks.filter((s: any) => s.enabled !== false);
  } else if (footer?.socialLinks && typeof footer.socialLinks === "object") {
    Object.entries(footer.socialLinks).forEach(([key, val]) => {
      if (typeof val === "string" && val.trim()) {
        socialList.push({ id: key, platform: key, url: val, label: key });
      }
    });
  }

  function getSocialIcon(platform: string) {
    const p = platform.toLowerCase();
    switch (p) {
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "facebook":
        return <Facebook className="h-4 w-4" />;
      case "twitter":
      case "x":
        return <Twitter className="h-4 w-4" />;
      case "whatsapp":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  }

  const tagline =
    footer?.brandTagline ||
    config?.settings?.tagline ||
    (config as any)?.general?.tagline ||
    "RIOTOUS creates heavyweight, DTF-printed streetwear made in India. Built for creators, artists, and culture shifters.";

  // Normalize long all-caps headings to title case (Issue 5)
  const rawHeading = footer?.heading || "Wear the print.";
  const displayHeading =
    rawHeading === rawHeading.toUpperCase() && rawHeading.length > 15
      ? rawHeading
          .toLowerCase()
          .replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase())
      : rawHeading;

  const rawSubheading = footer?.subheading || "Not the trend.";
  const displaySubheading =
    rawSubheading === rawSubheading.toUpperCase() && rawSubheading.length > 15
      ? rawSubheading
          .toLowerCase()
          .replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase())
      : rawSubheading;

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            {/* Scaled footer heading - clearly subordinate to hero H1 (Issue 2) */}
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl leading-snug text-foreground">
              {displayHeading}
              <br />
              <span className="text-muted-foreground font-semibold">{displaySubheading}</span>
            </h3>
            {tagline ? (
              <p className="mt-3.5 max-w-md text-sm text-muted-foreground leading-relaxed">
                {tagline}
              </p>
            ) : null}

            {/* Prominent newsletter signup with unified pill button (Issue 2, 4) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes("@")) {
                  setSubscribed(true);
                  setEmail("");
                }
              }}
              className="mt-6 flex max-w-md items-center rounded-full border-2 border-border/80 bg-secondary/80 p-1.5 transition-all focus-within:border-foreground/60 focus-within:ring-2 focus-within:ring-foreground/10 shadow-sm"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email for exclusive drops"
                suppressHydrationWarning
                className="h-11 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground text-foreground"
              />
              <button
                type="submit"
                suppressHydrationWarning
                className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-foreground px-6 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-brand hover:text-brand-foreground active:scale-95 cursor-pointer shadow-sm"
              >
                Join
              </button>
            </form>
            {subscribed && (
              <p className="mt-3 text-xs text-brand">Thanks — you're on the drop list.</p>
            )}

            {(footer?.contactEmail ||
              footer?.contactPhone ||
              config?.settings?.storeEmail ||
              (config as any)?.general?.contactEmail) && (
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {(footer?.contactEmail ||
                  config?.settings?.storeEmail ||
                  (config as any)?.general?.contactEmail) && (
                  <a
                    href={`mailto:${footer?.contactEmail || config?.settings?.storeEmail || (config as any)?.general?.contactEmail}`}
                    className="inline-flex min-h-[44px] items-center gap-2 py-2 hover:text-foreground transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {footer?.contactEmail ||
                      config?.settings?.storeEmail ||
                      (config as any)?.general?.contactEmail}
                  </a>
                )}
                {(footer?.contactPhone ||
                  config?.settings?.storePhone ||
                  (config as any)?.general?.contactPhone) && (
                  <a
                    href={`tel:${footer?.contactPhone || config?.settings?.storePhone || (config as any)?.general?.contactPhone}`}
                    className="inline-flex min-h-[44px] items-center gap-2 py-2 hover:text-foreground transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {footer?.contactPhone ||
                      config?.settings?.storePhone ||
                      (config as any)?.general?.contactPhone}
                  </a>
                )}
              </div>
            )}
          </div>

          {columns.length > 0 ? (
            columns.map((sec) => (
              <div key={sec.id} className="md:col-span-2">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {sec.title}
                </p>
                <ul className="space-y-3">
                  {(sec.links || []).map((l: any, idx: number) => {
                    const target = l.url || l.to || "/";
                    return (
                      <li key={l.id || idx}>
                        {target.startsWith("http") ? (
                          <a
                            href={target}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {l.label}
                          </a>
                        ) : (
                          <Link
                            to={target}
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {l.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <>
              <FooterCol
                title="Shop"
                links={[
                  { to: "/shop", label: "All Products" },
                  { to: "/design", label: "Design Your Own" },
                  { to: "/shop", label: "Best Sellers" },
                  { to: "/shop", label: "New Arrivals" },
                ]}
              />
              <FooterCol
                title="Company"
                links={[
                  { to: "/about", label: "About" },
                  { to: "/contact", label: "Contact" },
                  { to: "/terms", label: "Terms of Service" },
                ]}
              />
              <FooterCol
                title="Support"
                links={[
                  { to: "/contact", label: "Help Center" },
                  { to: "/shipping-policy", label: "Shipping Policy" },
                  { to: "/refund-policy", label: "Returns & Refunds" },
                  { to: "/privacy", label: "Privacy Policy" },
                ]}
              />
            </>
          )}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center">
          <div className="text-xs text-muted-foreground" suppressHydrationWarning>
            {footer?.copyrightText || `© 2026 RIOTOUS. Made in India.`}
          </div>
          {socialList.length > 0 ? (
            <div className="flex items-center gap-3">
              {socialList.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label || s.platform}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border transition-colors hover:border-foreground hover:text-brand hover:bg-secondary/50"
                >
                  {getSocialIcon(s.platform)}
                </a>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/riotous_store"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border transition-colors hover:border-foreground hover:text-brand hover:bg-secondary/50"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border transition-colors hover:border-foreground hover:text-brand hover:bg-secondary/50"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border transition-colors hover:border-foreground hover:text-brand hover:bg-secondary/50"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string }>;
}) {
  return (
    <div className="md:col-span-2">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-3">
        {links.map((l, i) => (
          <li key={i}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
