import React, { useState } from "react";
import {
  FileText,
  Scissors,
  Shirt,
  Droplets,
  Truck,
  ChevronDown,
  Check,
  Ruler,
  Layers,
  Sparkles,
} from "lucide-react";
import { renderMarkdownToHtml } from "@/components/product/product-details-unified";
import type {
  ProductSpecification,
  ManufacturingInfo,
  GarmentMeasurement,
} from "@/lib/catalog";

export interface ProductInfoSectionsProps {
  description?: string | null;
  detailsHtml?: string | null;
  features?: string[];
  careInstructions?: string[];
  manufacturingInfo?: ManufacturingInfo | null;
  specifications?: ProductSpecification[];
  sizeMeasurements?: GarmentMeasurement[];
  productTitle?: string;
  category?: string;
  onOpenSizeGuide?: () => void;
  detailImageUrl?: string | null;
  reviewCount?: number;
}

type TabKey = "details" | "fit" | "fabric" | "care" | "shipping" | "reviews";

export function ProductInfoSections({
  description = "",
  detailsHtml = "",
  features = [],
  careInstructions = [],
  manufacturingInfo,
  specifications = [],
  sizeMeasurements = [],
  productTitle = "Product",
  category = "T-Shirts",
  onOpenSizeGuide,
  detailImageUrl,
  reviewCount = 124,
}: ProductInfoSectionsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    details: true,
    fit: false,
    fabric: false,
    care: false,
    shipping: false,
    reviews: false,
  });

  const toggleAccordion = (key: string) => {
    if (key === "reviews") {
      const el = document.getElementById("customer-reviews-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Derive authoritative specs
  const catLower = (category || "").toLowerCase();
  const specFabric = specifications.find(
    (s) => s.label.toLowerCase() === "fabric" || s.label.toLowerCase() === "material",
  )?.value;
  const specGsm = specifications.find((s) => s.label.toLowerCase() === "gsm")?.value;
  const specFit = specifications.find((s) => s.label.toLowerCase() === "fit")?.value;

  const resolvedFit =
    specFit ||
    (catLower.includes("oversized")
      ? "Oversized Streetwear Fit (Drop shoulder, boxy silhouette)"
      : "Standard Regular Fit");

  const resolvedMaterial = specFabric
    ? `${specFabric}${specGsm ? ` (${specGsm})` : ""}`
    : "100% Super Combed Heavyweight Cotton (240 GSM)";

  const cleanDescription = (detailsHtml || description || "").trim();

  // Wash Care Instructions
  const allCare =
    careInstructions.length > 0
      ? careInstructions
      : [
          "Machine wash cold with similar colours",
          "Wash inside out to protect graphic print",
          "Do not bleach or dry clean",
          "Do not iron directly over the print",
          "Warm iron on reverse side",
          "Line dry in shade or tumble dry low",
        ];

  // Manufacturing / Origin details
  const mfgCountry = manufacturingInfo?.country_of_origin || "India";
  const mfgEntity = manufacturingInfo?.manufacturer || "Ethically crafted by RIOTOUS in India";
  const marketedBy = manufacturingInfo?.marketed_by || "RIOTOUS Streetwear Pvt Ltd";
  const customerCare = manufacturingInfo?.customer_care || "care@riotous.store";

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ElementType;
  }> = [
    { key: "details", label: "Product Details", icon: FileText },
    { key: "fit", label: "Size & Fit", icon: Scissors },
    { key: "fabric", label: "Fabric & Print", icon: Shirt },
    { key: "care", label: "Wash Care", icon: Droplets },
    { key: "shipping", label: "Shipping & Returns", icon: Truck },
    { key: "reviews", label: `Reviews (${reviewCount})`, icon: Sparkles },
  ];

  return (
    <section
      id="product-info-section"
      aria-label="Product Information"
      className="mt-10 sm:mt-14 border-t border-border/80 pt-6 sm:pt-8"
    >
      {/* DESKTOP TABBED NAVIGATION (Hidden on mobile) */}
      <div className="hidden md:flex items-center gap-1 sm:gap-2 border-b border-border/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (tab.key === "reviews") {
                  const el = document.getElementById("customer-reviews-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  return;
                }
                setActiveTab(tab.key);
              }}
              aria-selected={isActive}
              role="tab"
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? "text-brand-red font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />
              )}
            </button>
          );
        })}
      </div>

      {/* DESKTOP TAB CONTENT PANELS (Visible on md+) */}
      <div className="hidden md:block py-6">
        {/* TAB 1: PRODUCT DETAILS (Two-Column Layout matching Reference) */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in-50 duration-200">
            <div className="md:col-span-7 space-y-4">
              <h3 className="text-xl font-black tracking-tight text-foreground">
                Product Details
              </h3>
              <div className="text-xs sm:text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-line space-y-3">
                {cleanDescription}
              </div>

              {/* Quick Specs summary */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Silhouette / Fit
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {resolvedFit}
                  </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Fabric
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {resolvedMaterial}
                  </span>
                </div>
              </div>
            </div>

            {/* DETAIL PHOTOGRAPH ON RIGHT */}
            {detailImageUrl && (
              <div className="md:col-span-5 overflow-hidden rounded-2xl border border-border/70 bg-[#F6F5F2] shadow-xs">
                <img
                  src={detailImageUrl}
                  alt={`${productTitle} detail`}
                  className="h-full w-full object-cover object-center aspect-[4/3] hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SIZE & FIT */}
        {activeTab === "fit" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">
                Fit Guidance & Sizing Philosophy
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                This piece is intentionally engineered with an <strong>oversized streetwear silhouette</strong> featuring relaxed drop shoulders and a roomy chest. If you prefer the signature boxy aesthetic, select your standard size. For a more conventional, fitted look, we recommend sizing down one step.
              </p>
            </div>

            {/* Measurements Preview or CTA */}
            {sizeMeasurements.length > 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden max-w-2xl">
                <div className="flex items-center justify-between p-4 bg-secondary/40 border-b border-border/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Ruler className="h-4 w-4 text-brand-red" />
                    <span>Garment Dimensions (Inches)</span>
                  </span>
                  {onOpenSizeGuide && (
                    <button
                      type="button"
                      onClick={onOpenSizeGuide}
                      className="text-xs font-semibold text-brand-red hover:underline cursor-pointer"
                    >
                      Open Full Size Chart
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/20 text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Size</th>
                        <th className="px-4 py-2.5">Chest</th>
                        <th className="px-4 py-2.5">Length</th>
                        <th className="px-4 py-2.5">Shoulder</th>
                        <th className="px-4 py-2.5">Sleeve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sizeMeasurements.map((m, i) => (
                        <tr key={i} className="hover:bg-secondary/20">
                          <td className="px-4 py-2.5 font-bold text-foreground">{m.size}</td>
                          <td className="px-4 py-2.5">{m.chest}&quot;</td>
                          <td className="px-4 py-2.5">{m.length}&quot;</td>
                          <td className="px-4 py-2.5">{m.shoulder}&quot;</td>
                          <td className="px-4 py-2.5">{m.sleeve}&quot;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : onOpenSizeGuide ? (
              <button
                type="button"
                onClick={onOpenSizeGuide}
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-secondary/50 px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer"
              >
                <Ruler className="h-4 w-4 text-brand-red" />
                <span>View Comprehensive Garment Sizing Chart</span>
              </button>
            ) : null}
          </div>
        )}

        {/* TAB 3: FABRIC & PRINT */}
        {activeTab === "fabric" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              <div className="rounded-2xl border border-border/80 bg-card p-5">
                <div className="flex items-center gap-2.5 text-brand-red mb-2">
                  <Shirt className="h-5 w-5" />
                  <h3 className="font-bold text-base text-foreground">Heavyweight Combed Cotton</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  We use 240 GSM 100% super-combed cotton, tightly knitted to eliminate translucency while retaining superior breathability. The fabric undergoes bio-washing and silicon softening to deliver a premium, buttery-smooth handfeel with zero scratchiness.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5">
                <div className="flex items-center gap-2.5 text-brand-red mb-2">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="font-bold text-base text-foreground">High-Density DTF Technology</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Our graphics are rendered with industrial Direct-to-Film (DTF) pigment curing. This produces photo-sharp vibrancy, deep saturated blacks, and elastic stretch recovery that will not crack, peel, or fade across repeat wash cycles.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WASH CARE */}
        {activeTab === "care" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200 max-w-2xl">
            <h3 className="text-base font-bold text-foreground">
              Garment Longevity & Wash Care Guide
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              To preserve graphic vibrancy and prevent natural cotton shrinkage over years of wear:
            </p>
            <ul className="space-y-2.5 pt-2">
              {allCare.map((instruction, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3 text-xs sm:text-sm text-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-red stroke-[2.5]" />
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 5: SHIPPING & RETURNS */}
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl animate-in fade-in-50 duration-200">
            <div className="rounded-2xl border border-border/80 bg-card p-5">
              <div className="flex items-center gap-2 text-brand-red mb-2">
                <Truck className="h-5 w-5" />
                <h3 className="font-bold text-base text-foreground">Fast Pan-India Delivery</h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <li>• <strong>Dispatch:</strong> Orders are processed and dispatched within 24–48 business hours.</li>
                <li>• <strong>Delivery Time:</strong> 5 to 7 business days across all serviceable Indian pincodes.</li>
                <li>• <strong>Couriers:</strong> Shipped via Zippyy logistics partners including Blue Dart, Delhivery, and DTDC.</li>
                <li>• <strong>Free Shipping:</strong> Automatically applied to all orders over ₹1499.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5">
              <div className="flex items-center gap-2 text-brand-red mb-2">
                <Check className="h-5 w-5 stroke-[2.5]" />
                <h3 className="font-bold text-base text-foreground">7-Day Hassle-Free Returns</h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <li>• <strong>Return Window:</strong> Initiate an exchange or refund within 7 days of package delivery.</li>
                <li>• <strong>Condition:</strong> Garments must be unworn, unwashed, and have original tags intact.</li>
                <li>• <strong>Instant Support:</strong> Reach out to <strong>{customerCare}</strong> or initiate via your Account dashboard.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE ACCORDIONS (Visible on < md) */}
      <div className="block md:hidden space-y-3">
        {/* Accordion 1: Details */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion("details")}
            aria-expanded={openAccordions["details"]}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-brand-red" />
              <span>Product Details</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openAccordions["details"] ? "rotate-180" : ""
              }`}
            />
          </button>
          {openAccordions["details"] && (
            <div className="border-t border-border/60 p-4 text-xs sm:text-sm text-muted-foreground space-y-4">
              {cleanDescription && (
                <div>{renderMarkdownToHtml(cleanDescription)}</div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-lg bg-secondary/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Fit</span>
                  <span className="font-semibold text-foreground text-xs">{resolvedFit}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Fabric</span>
                  <span className="font-semibold text-foreground text-xs">{resolvedMaterial}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Size & Fit */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion("fit")}
            aria-expanded={openAccordions["fit"]}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Scissors className="h-4 w-4 text-brand-red" />
              <span>Size & Fit</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openAccordions["fit"] ? "rotate-180" : ""
              }`}
            />
          </button>
          {openAccordions["fit"] && (
            <div className="border-t border-border/60 p-4 text-xs sm:text-sm text-muted-foreground space-y-3">
              <p>
                Oversized drop-shoulder streetwear cut. Order true to size for a relaxed drape, or size down for regular fit.
              </p>
              {onOpenSizeGuide && (
                <button
                  type="button"
                  onClick={onOpenSizeGuide}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red underline py-1"
                >
                  <Ruler className="h-3.5 w-3.5" />
                  <span>Open Garment Measurement Chart</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Accordion 3: Fabric & Print */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion("fabric")}
            aria-expanded={openAccordions["fabric"]}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Shirt className="h-4 w-4 text-brand-red" />
              <span>Fabric & Print</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openAccordions["fabric"] ? "rotate-180" : ""
              }`}
            />
          </button>
          {openAccordions["fabric"] && (
            <div className="border-t border-border/60 p-4 text-xs sm:text-sm text-muted-foreground space-y-2">
              <p><strong>Fabric:</strong> 240 GSM 100% Super Combed Cotton. Bio-washed & pre-shrunk.</p>
              <p><strong>Print:</strong> High-definition Direct-to-Film (DTF) printing that flexes and never cracks.</p>
            </div>
          )}
        </div>

        {/* Accordion 4: Wash Care */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion("care")}
            aria-expanded={openAccordions["care"]}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Droplets className="h-4 w-4 text-brand-red" />
              <span>Wash Care</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openAccordions["care"] ? "rotate-180" : ""
              }`}
            />
          </button>
          {openAccordions["care"] && (
            <div className="border-t border-border/60 p-4 text-xs text-muted-foreground space-y-2">
              {allCare.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-brand-red shrink-0 mt-0.5" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion 5: Shipping & Returns */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion("shipping")}
            aria-expanded={openAccordions["shipping"]}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-brand-red" />
              <span>Shipping & Returns</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openAccordions["shipping"] ? "rotate-180" : ""
              }`}
            />
          </button>
          {openAccordions["shipping"] && (
            <div className="border-t border-border/60 p-4 text-xs text-muted-foreground space-y-2">
              <p>• Dispatched within 24–48 hours via Zippyy courier partners.</p>
              <p>• Delivery timeline: 5–7 business days across India.</p>
              <p>• 7-day hassle-free return and exchange policy.</p>
            </div>
          )}
        </div>

        {/* Accordion 6: Reviews (Matching Reference Screenshot) */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion("reviews")}
            aria-expanded={openAccordions["reviews"]}
            className="flex w-full items-center justify-between p-4 text-left font-bold text-sm text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-brand-red" />
              <span>Reviews ({reviewCount})</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </section>
  );
}
