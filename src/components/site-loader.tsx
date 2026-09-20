import { cn } from "@/lib/utils";

export interface SiteLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "fullscreen" | "overlay" | "inline" | "minimal";
  text?: string | null;
  subtext?: string | null;
  showRings?: boolean;
  showSpinnerRing?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: {
    container: "w-16 h-16",
    imgSize: "w-11 h-11",
    spinnerInset: "-inset-2",
    svgView: 100,
    radius: 44,
    strokeWidth: 3.5,
    textSize: "text-[10px]",
    dotSize: "h-1 w-1",
  },
  md: {
    container: "w-24 h-24",
    imgSize: "w-16 h-16",
    spinnerInset: "-inset-2.5",
    svgView: 100,
    radius: 45,
    strokeWidth: 3,
    textSize: "text-xs",
    dotSize: "h-1.5 w-1.5",
  },
  lg: {
    container: "w-32 h-32",
    imgSize: "w-22 h-22",
    spinnerInset: "-inset-3",
    svgView: 100,
    radius: 46,
    strokeWidth: 2.5,
    textSize: "text-xs",
    dotSize: "h-1.5 w-1.5",
  },
  xl: {
    container: "w-40 h-40",
    imgSize: "w-28 h-28",
    spinnerInset: "-inset-3.5",
    svgView: 100,
    radius: 46,
    strokeWidth: 2.5,
    textSize: "text-sm",
    dotSize: "h-2 w-2",
  },
};

export function SiteLoader({
  size = "lg",
  variant = "inline",
  text = "LOADING...",
  subtext,
  showRings = true,
  showSpinnerRing = true,
  className,
}: SiteLoaderProps) {
  const config = SIZE_MAP[size] || SIZE_MAP.lg;
  const isMinimal = variant === "minimal";

  const loaderVisual = (
    <div
      role="status"
      aria-label={text || "Loading content"}
      className={cn("relative flex items-center justify-center select-none", config.container)}
    >
      {/* Radar Pulse Wave 1 */}
      {showRings && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-red-500/40 bg-red-600/10 animate-kookaburra-radar-1 pointer-events-none"
        />
      )}

      {/* Radar Pulse Wave 2 */}
      {showRings && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-red-500/25 bg-red-500/5 animate-kookaburra-radar-2 pointer-events-none"
        />
      )}

      {/* Outer Rotating Buffering SVG Rings */}
      {showSpinnerRing && (
        <div
          aria-hidden="true"
          className={cn("absolute pointer-events-none z-10", config.spinnerInset, "w-[calc(100%+1.5rem)] h-[calc(100%+1.5rem)]")}
        >
          {/* Main glowing spinning buffering arc */}
          <svg
            viewBox={`0 0 ${config.svgView} ${config.svgView}`}
            className="w-full h-full animate-kookaburra-spin overflow-visible"
          >
            <defs>
              <linearGradient id="kookaburra-buffering-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f00b11" stopOpacity="1" />
                <stop offset="60%" stopColor="#ff4d4f" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>
              <filter id="kookaburra-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f00b11" floodOpacity="0.7" />
              </filter>
            </defs>

            {/* Subtle background track */}
            <circle
              cx="50"
              cy="50"
              r={config.radius}
              fill="none"
              stroke="#f00b11"
              strokeWidth={config.strokeWidth * 0.75}
              strokeOpacity="0.15"
            />

            {/* Glowing active buffering segment */}
            <circle
              cx="50"
              cy="50"
              r={config.radius}
              fill="none"
              stroke="url(#kookaburra-buffering-grad)"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray="75 140"
              filter="url(#kookaburra-glow)"
            />
          </svg>

          {/* Secondary subtle reverse tick ring */}
          <svg
            viewBox={`0 0 ${config.svgView} ${config.svgView}`}
            className="absolute inset-0 w-full h-full animate-kookaburra-spin-reverse opacity-40 overflow-visible"
          >
            <circle
              cx="50"
              cy="50"
              r={config.radius}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="3 14"
            />
          </svg>
        </div>
      )}

      {/* Central Animated Bird Emblem */}
      <div
        className={cn(
          "relative rounded-full overflow-hidden flex items-center justify-center animate-kookaburra-breathe z-20 shadow-2xl",
          config.imgSize,
        )}
      >
        <img
          src="/assets/kookaburra-loader.png"
          alt="Loading..."
          loading="eager"
          decoding="async"
          width={112}
          height={112}
          className="w-full h-full object-cover select-none pointer-events-none"
        />

        {/* Diagonal metallic shimmer overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none animate-kookaburra-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
      </div>
    </div>
  );

  const textSection = !isMinimal && text && (
    <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-[0.25em] text-foreground/90">
        <span className={config.textSize}>{text}</span>
        <span className="flex items-center gap-0.5 ml-0.5">
          <span className={cn("rounded-full bg-brand-red animate-kookaburra-dot-1", config.dotSize)} />
          <span className={cn("rounded-full bg-brand-red animate-kookaburra-dot-2", config.dotSize)} />
          <span className={cn("rounded-full bg-brand-red animate-kookaburra-dot-3", config.dotSize)} />
        </span>
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
          "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md px-4 transition-all duration-300",
          className,
        )}
      >
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
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
