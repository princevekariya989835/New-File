import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SiteLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "fullscreen" | "overlay" | "inline" | "minimal";
  text?: string | null;
  subtext?: string | null;
  showRings?: boolean;
  showSpinnerRing?: boolean;
  showLogo?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: {
    logoWidth: "w-20",
    spinnerSize: "h-4 w-4",
    textSize: "text-[10px]",
  },
  md: {
    logoWidth: "w-28",
    spinnerSize: "h-5 w-5",
    textSize: "text-xs",
  },
  lg: {
    logoWidth: "w-36",
    spinnerSize: "h-6 w-6",
    textSize: "text-xs",
  },
  xl: {
    logoWidth: "w-44",
    spinnerSize: "h-7 w-7",
    textSize: "text-sm",
  },
};

export function SiteLoader({
  size = "md",
  variant = "inline",
  text = "LOADING...",
  subtext,
  showLogo = true,
  className,
}: SiteLoaderProps) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;
  const isMinimal = variant === "minimal";

  const loaderVisual = (
    <div
      role="status"
      aria-label={text || "Loading content"}
      className="relative flex flex-col items-center justify-center select-none gap-3"
    >
      {showLogo && (
        <img
          src="/assets/riotous-logo.png"
          alt="RIOTOUS"
          width={145}
          height={37}
          className={cn("h-auto object-contain select-none pointer-events-none opacity-90", config.logoWidth)}
        />
      )}
      <Loader2 className={cn("animate-spin text-brand-red", config.spinnerSize)} />
    </div>
  );

  const textSection = !isMinimal && text && (
    <div className="mt-2 flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-[0.2em] text-foreground/80">
        <span className={config.textSize}>{text}</span>
      </div>
      {subtext && (
        <p className="text-xs text-muted-foreground tracking-wider font-medium">{subtext}</p>
      )}
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm px-4 transition-all duration-200",
          className,
        )}
      >
        <div className="flex flex-col items-center">
          {loaderVisual}
          {textSection}
        </div>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 transition-all duration-200",
          className,
        )}
      >
        <div className="flex flex-col items-center">
          {loaderVisual}
          {textSection}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-6 px-4", className)}>
      {loaderVisual}
      {textSection}
    </div>
  );
}
