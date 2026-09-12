import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import type { WebsiteAnnouncementConfig } from "@/lib/website-config.types";

export function AnnouncementBar({
  config,
}: {
  config?: WebsiteAnnouncementConfig | Record<string, any>;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (!config || !config.enabled || !config.text || dismissed) {
    return null;
  }

  const bgStyle = config.backgroundColor
    ? { backgroundColor: config.backgroundColor, color: config.textColor || "#FFFFFF" }
    : undefined;

  const targetLink = (config as any).link || (config as any).linkUrl;
  const targetLabel = (config as any).linkText || (config as any).linkLabel || "Learn more";

  return (
    <aside
      aria-label="Announcement"
      style={bgStyle}
      className="relative z-50 flex items-center justify-center px-4 py-2 text-center text-xs font-medium tracking-wide transition-all"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span>{config.text}</span>
        {targetLink && (
          <Link
            to={targetLink}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 font-semibold"
          >
            {targetLabel}
            <ArrowRight className="h-3 w-3 inline" />
          </Link>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
