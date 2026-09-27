import React, { useMemo, useState } from "react";
import {
  Shirt,
  Sparkles,
  Factory,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Info,
  Layers,
  Scissors,
  Droplets,
  Award,
  Check,
} from "lucide-react";
import type { ManufacturingInfo, ProductSpecification } from "@/lib/catalog";

interface ProductDetailsUnifiedProps {
  description?: string | null;
  detailsHtml?: string | null;
  features?: string[];
  careInstructions?: string[];
  manufacturingInfo?: ManufacturingInfo | null;
  specifications?: ProductSpecification[];
  productTitle?: string;
  category?: string;
}

/**
 * Parses inline markdown formatting (bold, italic) into clean React elements.
 * Eliminates all raw markdown symbols like ** and *.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  // Match **bold** tokens
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Sanitizes and renders multi-line markdown text without raw ###, **, or raw bullets.
 * Converts headings, bullet points, and paragraphs to semantic HTML.
 */
export function renderMarkdownToHtml(rawText: string): React.ReactNode {
  if (!rawText) return null;

  const lines = rawText.split("\n");
  const elements: React.ReactNode[] = [];
  let currentBullets: string[] = [];

  const flushBullets = (key: string) => {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={key} className="my-2.5 space-y-1.5 pl-1">
          {currentBullets.map((bullet, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-red stroke-[2.5]" />
              <span>{renderInlineMarkdown(bullet)}</span>
            </li>
          ))}
        </ul>,
      );
      currentBullets = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Markdown Headings (###, ##, #)
    if (trimmed.startsWith("#")) {
      flushBullets(`bullets-${index}`);
      const cleanHeading = trimmed.replace(/^#+\s*/, "").replace(/:$/, "").trim();
      elements.push(
        <h3
          key={`heading-${index}`}
          className="mt-5 mb-2 text-sm sm:text-base font-bold text-foreground first:mt-0"
        >
          {renderInlineMarkdown(cleanHeading)}
        </h3>,
      );
      return;
    }

    // Bullet points (•, -, *)
    if (
      trimmed.startsWith("•") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      const cleanBullet = trimmed.replace(/^(•|-|\*)\s*/, "").trim();
      if (cleanBullet) {
        currentBullets.push(cleanBullet);
      }
      return;
    }

    // Blank lines
    if (!trimmed) {
      flushBullets(`bullets-${index}`);
      return;
    }

    // Regular paragraph
    flushBullets(`bullets-${index}`);
    elements.push(
      <p
        key={`para-${index}`}
        className="my-2 text-xs sm:text-sm text-muted-foreground leading-relaxed"
      >
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  });

  flushBullets("bullets-final");
  return elements;
}

/**
 * Consolidated authoritative Product Details section.
 * Eliminates duplicate information across Details and Product Description accordions.
 * Organizes information into ONE authoritative hierarchy:
 * 1. Primary Specifications Grid (Fit, Material, Manufactured In, Wash Care)
 * 2. Additional Specifications (Neck, Sleeve, GSM, etc.)
 * 3. Clean Product Story / Narrative (with clean markdown parsing, zero duplicate specs)
 * 4. Key Features
 */
export function ProductDetailsUnified({
  description = "",
  detailsHtml = "",
  features = [],
  careInstructions = [],
  manufacturingInfo,
  specifications = [],
  productTitle = "Product",
  category = "Oversized Tees",
}: ProductDetailsUnifiedProps) {
  const [isStoryOpen, setIsStoryOpen] = useState(true);

  // Extract structured details from raw description and props
  const parsedData = useMemo(() => {
    const rawContent = (detailsHtml || description || "").trim();
    const lines = rawContent.split("\n");

    let currentSection = "story";
    const storyLines: string[] = [];
    const extractedFit: string[] = [];
    const extractedWashCare: string[] = [];
    const extractedManufacture: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      if (
        lower.startsWith("#") &&
        (lower.includes("wash care") || lower.includes("care instruction"))
      ) {
        currentSection = "care";
        return;
      }
      if (
        lower.startsWith("#") &&
        (lower.includes("manufacture") || lower.includes("origin"))
      ) {
        currentSection = "manufacture";
        return;
      }
      if (
        lower.startsWith("#") &&
        (lower.includes("fit") || lower.includes("silhouette"))
      ) {
        currentSection = "fit";
        return;
      }
      if (lower.startsWith("#")) {
        currentSection = "story";
      }

      if (currentSection === "care") {
        const clean = trimmed.replace(/^(•|-|\*)\s*/, "").replace(/\*\*/g, "").trim();
        if (clean) extractedWashCare.push(clean);
      } else if (currentSection === "manufacture") {
        const clean = trimmed.replace(/^(•|-|\*)\s*/, "").replace(/\*\*/g, "").trim();
        if (clean) extractedManufacture.push(clean);
      } else if (currentSection === "fit") {
        const clean = trimmed.replace(/^(•|-|\*)\s*/, "").replace(/\*\*/g, "").trim();
        if (clean) extractedFit.push(clean);
      } else {
        storyLines.push(line);
      }
    });

    // 1. Authoritative FIT
    const specFit = specifications.find((s) => s.label.toLowerCase() === "fit")?.value;
    const authoritativeFit =
      specFit ||
      (extractedFit.length > 0
        ? extractedFit.join(" • ")
        : category.toLowerCase().includes("oversized")
          ? "Oversized Boxy Fit (Drop shoulders, relaxed aesthetic)"
          : "Standard Regular Fit");

    // 2. Authoritative MATERIAL / FABRIC
    const specFabric = specifications.find(
      (s) =>
        s.label.toLowerCase() === "fabric" ||
        s.label.toLowerCase() === "material",
    )?.value;
    const specGsm = specifications.find((s) => s.label.toLowerCase() === "gsm")?.value;
    const authoritativeMaterial =
      specFabric
        ? `${specFabric}${specGsm ? ` (${specGsm})` : ""}`
        : "100% Super Combed Cotton (240 GSM Heavyweight Fabric)";

    // 3. Authoritative MANUFACTURED IN
    const mfgCountry = manufacturingInfo?.country_of_origin;
    const mfgDetails = [
      mfgCountry ? `Made in ${mfgCountry}` : "Made in India",
      manufacturingInfo?.manufacturer ||
        (extractedManufacture.length > 0 ? extractedManufacture[0] : "Ethically crafted in Surat, India"),
    ]
      .filter(Boolean)
      .join(" • ");

    // 4. Authoritative WASH CARE
    const allCare = [
      ...careInstructions,
      ...extractedWashCare,
    ];
    const authoritativeWashCare =
      allCare.length > 0
        ? Array.from(new Set(allCare)).join(". ")
        : "Machine wash cold with similar colors. Do not bleach or tumble dry. Warm iron on reverse side. Do not iron directly on graphic print.";

    // 5. Remaining technical specifications not already in the 4 primary cards
    const excludedLabels = new Set(["fit", "fabric", "material", "country of origin"]);
    const extraSpecs = specifications.filter(
      (s) => !excludedLabels.has(s.label.toLowerCase()) && s.isActive !== false,
    );

    // 6. Clean story without duplicated wash care, fit, manufacture, or fabric/GSM blocks
    const cleanStoryLines = storyLines.filter((line) => {
      const lower = line.toLowerCase().trim();
      if (!lower) return true;
      if (lower.includes("wash care") || lower.includes("care instruction")) return false;
      if (lower.includes("manufacture") || lower.includes("origin") || lower.includes("crafted in")) return false;
      if (lower.includes("fit & silhouette") || lower.includes("boxy silhouette") || lower.includes("oversized aesthetic")) return false;
      if (lower.includes("240 gsm") || lower.includes("combed cotton") || lower.includes("heavyweight fabric")) return false;
      if (lower.includes("pre-shrunk") && lower.includes("hem")) return false;
      if (lower.includes("machine wash") || lower.includes("do not bleach") || lower.includes("tumble dry")) return false;
      return true;
    });

    const cleanStoryText = cleanStoryLines
      .join("\n")
      .replace(/###\s*(Wash Care|Manufacture|Fit)[^\n]*/gi, "")
      .trim();

    return {
      fit: authoritativeFit,
      material: authoritativeMaterial,
      manufacture: mfgDetails,
      washCare: authoritativeWashCare,
      extraSpecs,
      storyText: cleanStoryText,
    };
  }, [description, detailsHtml, specifications, manufacturingInfo, careInstructions, category]);

  return (
    <section
      aria-labelledby="product-details-heading"
      className="mt-16 sm:mt-20 md:mt-24 border-t border-border pt-12 md:pt-16"
    >
      {/* SECTION HEADER - Sentence case, H2 semantic heading */}
      <div className="mb-8 md:mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-red mb-2">
          Engineered Streetwear
        </p>
        <h2
          id="product-details-heading"
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
        >
          Product Details
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
          Authoritative specifications, fit guidance, and garment care instructions.
        </p>
      </div>

      {/* 1. AUTHORITATIVE 4-CARD DETAILS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
        {/* FIT */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 transition-colors hover:border-foreground/20 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-brand-red">
            <Scissors className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Fit
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground leading-snug">
            {parsedData.fit}
          </p>
        </div>

        {/* MATERIAL */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 transition-colors hover:border-foreground/20 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-brand-red">
            <Shirt className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Material
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground leading-snug">
            {parsedData.material}
          </p>
        </div>

        {/* MANUFACTURED IN */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 transition-colors hover:border-foreground/20 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-brand-red">
            <Factory className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Manufactured In
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground leading-snug">
            {parsedData.manufacture}
          </p>
        </div>

        {/* WASH CARE */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 transition-colors hover:border-foreground/20 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-brand-red">
            <Droplets className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Wash Care
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
            {parsedData.washCare}
          </p>
        </div>
      </div>

      {/* 2. EXTRA TECHNICAL SPECIFICATIONS (Neck, Sleeve, GSM, etc.) */}
      {parsedData.extraSpecs.length > 0 && (
        <div className="mb-8 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-red" />
            <span>Additional Specifications</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {parsedData.extraSpecs.map((spec, idx) => (
              <div key={idx} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  {spec.label}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground break-words">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PRODUCT STORY / OVERVIEW ACCORDION (Unique content only, clean Markdown-to-HTML) */}
      {parsedData.storyText && (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 transition-all shadow-2xs">
          <button
            type="button"
            onClick={() => setIsStoryOpen((prev) => !prev)}
            aria-expanded={isStoryOpen}
            className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-brand-red" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                About this Piece
              </h3>
            </div>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground transition-transform duration-200 ${
                isStoryOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </button>

          {isStoryOpen && (
            <div className="border-t border-border/60 p-4 sm:p-6 text-xs sm:text-sm animate-in fade-in-50 duration-200">
              <div className="max-w-3xl leading-relaxed text-muted-foreground">
                {renderMarkdownToHtml(parsedData.storyText)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
