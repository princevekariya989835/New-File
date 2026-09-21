"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorBoundary } from "./error-boundary";

export type CorridorPath = {
  /** Strength of the projection. Lower is a wider-angle, more dramatic rush. @default 30 */
  perspective?: number;
  /** Card width in world units. @default 18 */
  cardWidth?: number;
  /** Card height in world units. @default 25 */
  cardHeight?: number;
  /** Corner radius applied to each card. @default 0.6 */
  cardRadius?: number;
  /** On-screen card height at the waist, where a card is born. @default 2.6 */
  birthHeight?: number;
  /** On-screen card height as a card leaves the frame. @default 46 */
  exitHeight?: number;
  /**
   * Lateral offset at birth. Negative starts the card across the axis so the
   * centre never opens up. @default -11
   */
  railBirth?: number;
  /** Lateral offset once the rails have finished opening. @default 44 */
  railExit?: number;
  /** How front-loaded the opening is. >1 opens early then holds. @default 3.3 */
  fan?: number;
  /** Y-rotation at birth, degrees. @default 6 */
  turnBirth?: number;
  /** Y-rotation at exit, degrees. @default 28 */
  turnExit?: number;
  /** Keyframe stops used to trace the curve. @default 20 */
  stops?: number;
};

const DESKTOP_PATH: Required<CorridorPath> = {
  perspective: 30,
  cardWidth: 18,
  cardHeight: 25,
  cardRadius: 0.6,
  birthHeight: 2.6,
  exitHeight: 46,
  railBirth: -11,
  railExit: 44,
  fan: 3.3,
  turnBirth: 6,
  turnExit: 28,
  stops: 20,
};

const MOBILE_PATH: Required<CorridorPath> = {
  perspective: 26,
  cardWidth: 26,
  cardHeight: 35,
  cardRadius: 0.8,
  birthHeight: 3.8,
  exitHeight: 48,
  railBirth: -8,
  railExit: 46,
  fan: 2.6,
  turnBirth: 4,
  turnExit: 20,
  stops: 10,
};

/** Sample the path once so the CSS keyframes trace the real curve. */
function keyframes(dir: 1 | -1, name: string, p: Required<CorridorPath>) {
  const steps: string[] = [];
  for (let s = 0; s <= p.stops; s++) {
    const u = s / p.stops;
    const scale =
      (p.birthHeight / p.cardHeight) * Math.pow(p.exitHeight / p.birthHeight, u);
    const z = p.perspective * (1 - 1 / scale);
    const rail = p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
    const turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
    steps.push(
      `${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(2)}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`
    );
  }
  return `@keyframes ${name}{${steps.join("")}}`;
}

export type StreamImage = {
  src: string;
  alt?: string;
  title?: string;
};

export type ImageStreamHeroProps = {
  /** Images cycled onto the rails. */
  images: StreamImage[];
  /** Cards on each rail at once. @default 9 for desktop, 3 for mobile */
  cards?: number;
  /** Seconds for one card to travel the whole corridor. @default 18 */
  speed?: number;
  /** Vertical placement of the corridor's axis, as a percentage of height. @default 52 */
  axis?: number;
  /** Animation direction: normal (towards viewer) or reverse. @default "normal" */
  direction?: "normal" | "reverse";
  /** Corridor scale multiplier. @default 1 */
  scale?: number;
  /** Global animation toggle. @default true */
  enabled?: boolean;
  /** Desktop animation toggle. @default true */
  desktopEnabled?: boolean;
  /** Mobile animation toggle. @default true */
  mobileEnabled?: boolean;
  /** Override any part of the corridor geometry. Merged over the defaults. */
  path?: CorridorPath;
  /** Content rendered above the corridor. */
  children?: React.ReactNode;
  className?: string;
};

function ImageStreamHeroInner({
  images,
  cards,
  speed = 18,
  axis = 52,
  direction = "normal",
  scale = 1,
  enabled = true,
  desktopEnabled = true,
  mobileEnabled = true,
  path,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & ImageStreamHeroProps) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const isMobile = useIsMobile();
  const effectiveCards = cards ?? (isMobile ? 3 : 9);

  const isAnimActive =
    enabled !== false &&
    (isMobile ? mobileEnabled !== false : desktopEnabled !== false);

  const right = `ish-r-${id}`;
  const left = `ish-l-${id}`;
  const card = `ish-c-${id}`;

  const defaultPath = isMobile ? MOBILE_PATH : DESKTOP_PATH;
  const p = React.useMemo(() => {
    const base = { ...defaultPath, ...path };
    if (scale && scale !== 1) {
      return {
        ...base,
        cardWidth: base.cardWidth * scale,
        cardHeight: base.cardHeight * scale,
      };
    }
    return base;
  }, [defaultPath, path, scale]);

  const css = React.useMemo(
    () => `
      ${keyframes(1, right, p)}
      ${keyframes(-1, left, p)}
      @media (max-width: 767px) {
        .${card} {
          box-shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.45) !important;
        }
        /* Mobile performance: hide excess cards if SSR rendered extra */
        .${card}:nth-child(n+4) {
          display: none !important;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .${card} {
          animation: none !important;
          transform: none !important;
          opacity: 0.15 !important;
        }
      }
    `,
    [right, left, card, p]
  );

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...props}
      style={{ containerType: "inline-size", ...props.style }}
    >
      <style>{css}</style>
      {isAnimActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            perspective: `${p.perspective}cqw`,
            perspectiveOrigin: `50% ${axis}%`,
          }}
        >
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {[right, left].map((name) =>
              Array.from({ length: effectiveCards }, (_, i) => {
                const img = images[i % Math.max(images.length, 1)];
                const isFirst = i === 0;
                return (
                  <div
                    key={`${name}-${i}`}
                    className={cn(
                      card,
                      "absolute overflow-hidden bg-neutral-900 border border-neutral-800/80 ring-1 ring-white/10 shadow-2xl transition-shadow will-change-transform"
                    )}
                    style={{
                      left: "50%",
                      top: `${axis}%`,
                      width: `${p.cardWidth}cqw`,
                      height: `${p.cardHeight}cqw`,
                      marginLeft: `${-p.cardWidth / 2}cqw`,
                      marginTop: `${-p.cardHeight / 2}cqw`,
                      borderRadius: `${p.cardRadius}cqw`,
                      animation: `${name} ${speed}s linear infinite ${direction === "reverse" ? "reverse" : "normal"}`,
                      animationDelay: `${-(i * speed) / effectiveCards}s`,
                      backfaceVisibility: "hidden",
                      contain: "layout paint",
                    }}
                  >
                    {img ? (
                      <img
                        src={img.src}
                        alt={img.alt ?? ""}
                        loading={isFirst ? "eager" : "lazy"}
                        fetchPriority={isFirst ? "high" : "low"}
                        decoding="async"
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function ImageStreamHero(props: React.ComponentProps<"div"> & ImageStreamHeroProps) {
  return (
    <ErrorBoundary
      fallback={
        <div
          className={cn("relative overflow-hidden flex items-center justify-center", props.className)}
          style={props.style}
        >
          {/* Static lightweight fallback background in case 3D corridor fails */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-radial from-transparent via-neutral-900/5 to-neutral-900/20"
          />
          {props.children}
        </div>
      }
    >
      <ImageStreamHeroInner {...props} />
    </ErrorBoundary>
  );
}

export default ImageStreamHero;
