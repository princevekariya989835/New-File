import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";

export interface OrbitProduct {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  image: string;
  link: string;
  colorTag: string;
}

export const ORBIT_PRODUCTS: OrbitProduct[] = [
  {
    id: "orbit-zoro-back",
    name: "ONI ZORO ARCHIVE",
    subtitle: "HD DTF 12-Pass Back Graphic",
    price: "₹999",
    image: "/assets/tee-zoro-back-trans.png",
    link: "/shop",
    colorTag: "#141416",
  },
  {
    id: "orbit-zenitsu-back",
    name: "THUNDER BREATH MAROON",
    subtitle: "Zenitsu High-Voltage Canvas",
    price: "₹1,099",
    image: "/assets/tee-zenitsu-back-trans.png",
    link: "/shop",
    colorTag: "#45141c",
  },
  {
    id: "orbit-olive-front",
    name: "KATANA RONIN OLIVE",
    subtitle: "Tactical Pocket Katana Emblem",
    price: "₹999",
    image: "/assets/tee-olive-front-trans.png",
    link: "/shop",
    colorTag: "#2b3424",
  },
  {
    id: "orbit-zoro-front",
    name: "ONI SAMURAI EMBLEM",
    subtitle: "Minimal Chest Monogram Print",
    price: "₹999",
    image: "/assets/tee-zoro-front-trans.png",
    link: "/shop",
    colorTag: "#18181b",
  },
  {
    id: "orbit-zenitsu-archive",
    name: "LIGHTNING STRIKE HEAVYWEIGHT",
    subtitle: "Archival Boxy Streetwear Silhouette",
    price: "₹1,099",
    image: "/assets/tee-zenitsu-back-trans.png",
    link: "/shop",
    colorTag: "#3b1118",
  },
];

interface HeroOrbitProps {
  products?: OrbitProduct[];
  className?: string;
}

export function HeroOrbit({ products = ORBIT_PRODUCTS, className = "" }: HeroOrbitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ rx: 240, ry: 130, width: 560, height: 500 });
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const currentParallaxRef = useRef({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<OrbitProduct | null>(null);

  // Measure container for responsive radius
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    // Responsive radii calculation
    if (width < 400) {
      // Small mobile
      setDimensions({ rx: 125, ry: 65, width, height: 380 });
    } else if (width < 640) {
      // Mobile
      setDimensions({ rx: 155, ry: 80, width, height: 420 });
    } else if (width < 1024) {
      // Tablet
      setDimensions({ rx: 195, ry: 105, width, height: 460 });
    } else {
      // Desktop
      const rx = Math.min(255, Math.max(215, width * 0.38));
      const ry = rx * 0.52;
      setDimensions({ rx, ry, width, height: 520 });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, [updateDimensions]);

  // Smooth mouse parallax listener
  useEffect(() => {
    if (reducedMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return; // Desktop only
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseTargetRef.current = { x: x * 16, y: y * 12 };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [reducedMotion]);

  // Animation state driven by requestAnimationFrame for maximum GPU smoothness & zero jank
  const [itemsState, setItemsState] = useState(() =>
    products.map((_, i) => ({
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      zIndex: 10,
      depth: 0.5,
      rotation: 0,
    }))
  );

  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      // Static elegant layout for reduced motion users
      const n = products.length;
      setItemsState(
        products.map((_, i) => {
          const angle = (i * 2 * Math.PI) / n + Math.PI / 2;
          const x = dimensions.rx * Math.cos(angle);
          const y = dimensions.ry * Math.sin(angle);
          const depth = (Math.sin(angle) + 1) / 2;
          return {
            x,
            y,
            scale: 0.72 + 0.38 * depth,
            opacity: 0.65 + 0.35 * depth,
            zIndex: Math.round(depth * 100) + 10,
            depth,
            rotation: 0,
          };
        })
      );
      return;
    }

    let animationFrameId: number;
    const DURATION = 22000; // 22 seconds per orbit (within 18-26s specification)

    const tick = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      // Smooth mouse parallax interpolation (damping lerp)
      currentParallaxRef.current.x +=
        (mouseTargetRef.current.x - currentParallaxRef.current.x) * 0.05;
      currentParallaxRef.current.y +=
        (mouseTargetRef.current.y - currentParallaxRef.current.y) * 0.05;

      const elapsed = timestamp - startTimeRef.current;
      const t = elapsed / 1000; // time in seconds
      const baseAngle = (elapsed % DURATION) / DURATION * 2 * Math.PI;

      const n = products.length;
      const nextStates = products.map((_, i) => {
        // Parametric angle offset for each shirt around the ellipse
        // Phase shifted so first shirt starts in prominent lower-front position
        const angle = baseAngle + (i * 2 * Math.PI) / n + Math.PI * 0.5;

        // Base ellipse coordinates
        const rawX = dimensions.rx * Math.cos(angle);
        const rawY = dimensions.ry * Math.sin(angle);

        // Depth factor based on vertical orbit position:
        // sin(angle) = 1 is lowest point (closest to viewer, front center)
        // sin(angle) = -1 is highest point (furthest from viewer, back center)
        const depth = (Math.sin(angle) + 1) / 2; // normalized 0 to 1

        // Independent subtle floating movement (spec: ±8–15px vertical, tiny rotation)
        const floatY = Math.sin(t * 1.8 + i * 1.6) * 9;
        const floatRot = Math.sin(t * 1.4 + i * 2.1) * 2.2;
        const floatScale = Math.sin(t * 1.6 + i * 1.2) * 0.015;

        // Depth-dependent scale, opacity, and layering
        // Back: scale ~0.68, opacity ~0.55
        // Front (focal): scale ~1.12, opacity ~1.0
        const scale = 0.68 + 0.44 * depth + floatScale;
        const opacity = 0.55 + 0.45 * depth;
        const zIndex = Math.round(depth * 100) + 10;

        return {
          x: rawX + currentParallaxRef.current.x,
          y: rawY + floatY + currentParallaxRef.current.y,
          scale,
          opacity,
          zIndex,
          depth,
          rotation: floatRot,
        };
      });

      setItemsState(nextStates);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, products, reducedMotion]);

  // Find currently most prominent focal shirt
  const focalIndex = itemsState.reduce(
    (maxIdx, item, idx, arr) => (item.depth > arr[maxIdx].depth ? idx : maxIdx),
    0
  );
  const activeFocalProduct = products[focalIndex];

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex items-center justify-center select-none ${className}`}
      style={{ height: `${dimensions.height}px` }}
      aria-label="RIOTOUS Streetwear Floating T-shirt Orbit"
    >

      {/* 2. Soft Ambient Halo beneath the main focal garment */}
      <div
        className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-64 h-32 rounded-full bg-neutral-900/5 dark:bg-white/5 blur-2xl transition-opacity duration-500"
        aria-hidden="true"
      />

      {/* 3. Orbiting T-Shirts */}
      {products.map((product, idx) => {
        const state = itemsState[idx] || {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          zIndex: 10,
          depth: 0.5,
          rotation: 0,
        };

        const isFocal = idx === focalIndex;
        // Shadow gets progressively richer & deeper toward the front focal position
        const shadowBlur = Math.round(12 + state.depth * 28);
        const shadowSpread = Math.round(4 + state.depth * 10);
        const shadowOpacity = (0.12 + state.depth * 0.28).toFixed(2);

        return (
          <div
            key={product.id}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-shadow duration-300"
            style={{
              transform: `translate3d(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px), 0) scale(${state.scale}) rotate(${state.rotation}deg)`,
              opacity: state.opacity,
              zIndex: state.zIndex,
              willChange: "transform, opacity",
            }}
          >
            <Link
              to={product.link}
              className="group block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red rounded-xl"
              aria-label={`${product.name} - ${product.price}`}
              onMouseEnter={() => setHoveredProduct(product)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* T-Shirt Image with realistic physical soft shadow */}
              <div
                className="relative w-40 sm:w-52 md:w-56 lg:w-64 aspect-square flex items-center justify-center p-2 cursor-pointer"
                style={{
                  filter: `drop-shadow(0 ${shadowSpread}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity}))`,
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  loading={isFocal ? "eager" : "lazy"}
                  fetchPriority={isFocal ? "high" : "low"}
                  decoding="async"
                  className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Minimalist Focal Badge when shirt is in primary foreground */}
              {isFocal && (
                <div
                  className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neutral-900/90 dark:bg-white/90 text-white dark:text-neutral-950 text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap shadow-md transition-opacity duration-300 opacity-90 group-hover:opacity-100 flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-red animate-pulse" />
                  <span>{product.name.split(" ")[0]} · {product.price}</span>
                </div>
              )}
            </Link>
          </div>
        );
      })}

      {/* 4. Editorial Bottom Indicator / Micro Caption */}
      <div className="absolute -bottom-2 sm:bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono tracking-widest text-neutral-400 dark:text-neutral-500 uppercase pointer-events-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-red" />
        <span>ARCHIVAL SILHOUETTES · 240 GSM</span>
      </div>
    </div>
  );
}
