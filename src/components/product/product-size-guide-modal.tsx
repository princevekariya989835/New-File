import React, { useState } from "react";
import { Ruler, Sparkles, Check, HelpCircle } from "lucide-react";
import type { GarmentMeasurement } from "@/lib/catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductSizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurements?: GarmentMeasurement[];
  productTitle?: string;
}

const DEFAULT_MEASUREMENTS: GarmentMeasurement[] = [
  { size: "S", chest: 40, shoulder: 18.5, length: 28, sleeve: 8.5, toFitChest: 36 },
  { size: "M", chest: 42, shoulder: 19.5, length: 29, sleeve: 9, toFitChest: 38 },
  { size: "L", chest: 44, shoulder: 20.5, length: 30, sleeve: 9.5, toFitChest: 40 },
  { size: "XL", chest: 46, shoulder: 21.5, length: 31, sleeve: 10, toFitChest: 42 },
  { size: "XXL", chest: 48, shoulder: 22.5, length: 32, sleeve: 10.5, toFitChest: 44 },
];

export function ProductSizeGuideModal({
  isOpen,
  onClose,
  measurements,
  productTitle = "Product",
}: ProductSizeGuideModalProps) {
  const [unit, setUnit] = useState<"in" | "cm">("in");

  const rows = measurements && measurements.length > 0 ? measurements : DEFAULT_MEASUREMENTS;
  const hasToFitChest = rows.some((r) => r.toFitChest != null && r.toFitChest !== "");

  const formatVal = (val: string | number | undefined) => {
    if (val == null || val === "") return "-";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return String(val);
    if (unit === "cm") {
      return (num * 2.54).toFixed(1);
    }
    return String(num);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-brand-red text-xs font-bold uppercase tracking-wider">
            <Ruler className="h-4 w-4" />
            <span>Garment Measurements</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Size & Fit Guide
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {productTitle ? `${productTitle} - ` : ""}Garment sizing chart. All measurements are measured flat.
          </p>
        </DialogHeader>

        {/* Unit Selector Toggle */}
        <div className="mt-4 flex items-center justify-between border-b border-border pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Unit of Measurement
          </span>
          <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setUnit("in")}
              className={`rounded-md px-3 py-1 transition-all ${
                unit === "in"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inches (in)
            </button>
            <button
              type="button"
              onClick={() => setUnit("cm")}
              className={`rounded-md px-3 py-1 transition-all ${
                unit === "cm"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Centimeters (cm)
            </button>
          </div>
        </div>

        {/* Dynamic Measurement Table */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/80 bg-card/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-secondary/70 font-semibold text-foreground border-b border-border">
              <tr>
                <th className="p-3 font-extrabold">Size</th>
                <th className="p-3">Chest ({unit})</th>
                <th className="p-3">Shoulder ({unit})</th>
                <th className="p-3">Length ({unit})</th>
                <th className="p-3">Sleeve ({unit})</th>
                {hasToFitChest && <th className="p-3">To Fit Chest ({unit})</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row, idx) => (
                <tr
                  key={row.size || idx}
                  className="transition-colors hover:bg-secondary/30"
                >
                  <td className="p-3 font-extrabold text-foreground">{row.size}</td>
                  <td className="p-3 text-muted-foreground">{formatVal(row.chest)}</td>
                  <td className="p-3 text-muted-foreground">{formatVal(row.shoulder)}</td>
                  <td className="p-3 text-muted-foreground">{formatVal(row.length)}</td>
                  <td className="p-3 text-muted-foreground">{formatVal(row.sleeve)}</td>
                  {hasToFitChest && (
                    <td className="p-3 text-muted-foreground font-medium">
                      {formatVal(row.toFitChest)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How to Measure & Fit Recommendation */}
        <div className="mt-5 space-y-3.5">
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 text-xs">
            <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-red" />
              Streetwear Fit Recommendation
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              RIOTOUS garments feature an authentic boxy drop-shoulder streetwear drape. Order your standard size for the intended relaxed streetwear aesthetic. If you prefer a regular tailored fit, consider sizing down one size.
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span>How to Measure</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                <span><strong>Chest:</strong> Measured across the fullest point armpit to armpit.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                <span><strong>Shoulder:</strong> Point-to-point across back shoulder seam.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                <span><strong>Length:</strong> From highest shoulder seam down to bottom hem.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                <span><strong>Sleeve:</strong> From shoulder drop seam to sleeve opening.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Close Guide
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
