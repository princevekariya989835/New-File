import React, { useRef, useState } from "react";
import { uploadProductImage } from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit3,
  Sparkles,
  Layers,
  ListOrdered,
  FileText,
  Check,
  X,
  Info,
} from "lucide-react";

export type ProductHighlightItem = {
  id?: string;
  imageUrl: string;
  title: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
};

export type ProductSpecificationItem = {
  id?: string;
  label: string;
  value: string;
  displayOrder: number;
  isActive: boolean;
};

// ==========================================
// 1. KEY HIGHLIGHTS EDITOR
// ==========================================

export function KeyHighlightsEditor({
  highlights,
  onChange,
}: {
  highlights: ProductHighlightItem[];
  onChange: (items: ProductHighlightItem[]) => void;
}) {
  const addHighlight = () => {
    const nextOrder =
      highlights.length > 0
        ? Math.max(...highlights.map((h) => Number(h.displayOrder) || 0)) + 1
        : 1;
    onChange([
      ...highlights,
      {
        id: `hl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: "",
        title: "",
        description: "",
        displayOrder: nextOrder,
        isActive: true,
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<ProductHighlightItem>) => {
    const next = [...highlights];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(highlights.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= highlights.length) return;
    const next = [...highlights];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    // Update display orders to match new positions
    next.forEach((item, idx) => {
      item.displayOrder = idx + 1;
    });
    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-red" />
            <h4 className="font-bold text-base tracking-tight">Key Highlights</h4>
            <Badge variant="secondary" className="text-xs">
              {highlights.length} card{highlights.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Card highlights displayed below product images on storefront (2 columns on desktop, 1 on mobile).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addHighlight}
          className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium"
        >
          <Plus className="h-4 w-4" /> Add Highlight
        </Button>
      </div>

      {highlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">No Key Highlights yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Highlights showcase visual feature cards (e.g. "Built to Perform", "Anti-odour & Luxe Comfort") with custom photos and descriptions.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addHighlight} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add First Highlight
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highlights.map((item, index) => (
            <HighlightCardEditor
              key={item.id || `hl-${index}`}
              item={item}
              index={index}
              total={highlights.length}
              onChange={(patch) => updateItem(index, patch)}
              onRemove={() => removeItem(index)}
              onMoveUp={() => moveItem(index, "up")}
              onMoveDown={() => moveItem(index, "down")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightCardEditor({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: ProductHighlightItem;
  index: number;
  total: number;
  onChange: (patch: Partial<ProductHighlightItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await uploadProductImage(file);
      if (dataUrl) {
        onChange({ imageUrl: dataUrl });
        toast.success("Highlight image uploaded");
      }
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      toast.error("Please enter a valid URL (e.g. https://... or /...)");
      return;
    }
    onChange({ imageUrl: trimmed });
    setUrlDraft("");
    setShowUrlInput(false);
    toast.success("Image URL set");
  };

  return (
    <div className={`flex flex-col rounded-xl border transition-all ${item.isActive ? "border-border bg-card shadow-xs" : "border-border/50 bg-muted/20 opacity-75"} p-4 space-y-3`}>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <Badge variant={item.isActive ? "default" : "outline"} className="text-[11px] font-bold">
            Highlight #{index + 1}
          </Badge>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              title="Move Up"
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={onMoveDown}
              title="Move Down"
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={item.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              className="rounded border-border accent-foreground"
            />
            <span className={item.isActive ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {item.isActive ? "Active" : "Inactive"}
            </span>
          </label>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            title="Delete Highlight"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Area */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Highlight Image *</Label>
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            <LinkIcon className="h-3 w-3" />
            {showUrlInput ? "Cancel URL" : "Set via URL"}
          </button>
        </div>

        {showUrlInput && (
          <div className="flex gap-2">
            <Input
              placeholder="Paste image link (https://...)"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" onClick={handleAddUrl} className="h-8 shrink-0 text-xs">
              Set URL
            </Button>
          </div>
        )}

        {item.imageUrl ? (
          <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-lg border bg-secondary/40">
            <img
              src={item.imageUrl}
              alt={item.title || "Highlight"}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-tee.jpg";
              }}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1"
                onClick={() => onChange({ imageUrl: "" })}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 aspect-[16/9] w-full rounded-lg border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/30 cursor-pointer p-4 transition-colors text-center"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <p className="text-xs font-semibold">
              {uploading ? "Compressing & optimizing…" : "Click to upload highlight image"}
            </p>
            <p className="text-[10px] text-muted-foreground">PNG, JPG, WebP (auto-optimized)</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        <div>
          <Label className="text-xs font-medium">Card Title (optional)</Label>
          <Input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Built to Perform. Designed to Protect."
            className="h-8 text-xs mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">Subtitle / Description (optional)</Label>
          <Textarea
            value={item.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="e.g. UPF 50+ Protection for long travel days & active city wear."
            rows={2}
            className="text-xs min-h-[50px] resize-y mt-1"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Display Order:</Label>
          <Input
            type="number"
            min={0}
            value={item.displayOrder}
            onChange={(e) => onChange({ displayOrder: parseInt(e.target.value, 10) || 0 })}
            className="h-7 w-20 text-xs text-center"
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. PRODUCT SPECIFICATIONS EDITOR
// ==========================================

const COMMON_SPEC_SUGGESTIONS = [
  "Fit",
  "Fabric",
  "GSM",
  "Neck",
  "Sleeve",
  "Pattern",
  "Length",
  "Wash Care",
  "Material",
  "Country of Origin",
  "Print Type",
  "Pocket",
];

export function ProductSpecificationsEditor({
  specifications,
  onChange,
}: {
  specifications: ProductSpecificationItem[];
  onChange: (items: ProductSpecificationItem[]) => void;
}) {
  const addSpec = (defaultLabel = "") => {
    const nextOrder =
      specifications.length > 0
        ? Math.max(...specifications.map((s) => Number(s.displayOrder) || 0)) + 1
        : 1;
    onChange([
      ...specifications,
      {
        id: `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        label: defaultLabel,
        value: "",
        displayOrder: nextOrder,
        isActive: true,
      },
    ]);
  };

  const updateSpec = (index: number, patch: Partial<ProductSpecificationItem>) => {
    const next = [...specifications];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeSpec = (index: number) => {
    onChange(specifications.filter((_, i) => i !== index));
  };

  const moveSpec = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= specifications.length) return;
    const next = [...specifications];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    next.forEach((item, idx) => {
      item.displayOrder = idx + 1;
    });
    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-brand-red" />
            <h4 className="font-bold text-base tracking-tight">Product Specifications</h4>
            <Badge variant="secondary" className="text-xs">
              {specifications.length} field{specifications.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Flexible specifications displayed in a clean 2-column grid on desktop and 1-column on mobile.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => addSpec()}
          className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium"
        >
          <Plus className="h-4 w-4" /> Add Specification
        </Button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Add:</span>
        {COMMON_SPEC_SUGGESTIONS.map((tag) => {
          const alreadyExists = specifications.some(
            (s) => s.label.trim().toLowerCase() === tag.toLowerCase(),
          );
          return (
            <button
              key={tag}
              type="button"
              disabled={alreadyExists}
              onClick={() => addSpec(tag)}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                alreadyExists
                  ? "opacity-40 cursor-not-allowed bg-secondary/50 border-border text-muted-foreground"
                  : "bg-secondary/80 hover:bg-secondary border-border text-foreground hover:border-foreground/40"
              }`}
            >
              + {tag}
            </button>
          );
        })}
      </div>

      {specifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
            <ListOrdered className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">No Specifications configured</p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Click on any quick-add tag above (e.g. Fit, Fabric, Neck, Sleeve) or create custom technical fields.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => addSpec("Fit")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Fit & Fabric
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Header Row on Desktop */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-1 text-center">Order</div>
            <div className="col-span-4">Specification Label</div>
            <div className="col-span-5">Value / Description</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {specifications.map((spec, index) => (
            <div
              key={spec.id || `sp-${index}`}
              className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center rounded-lg border p-3 sm:px-3 sm:py-2 transition-colors ${
                spec.isActive ? "bg-card border-border shadow-2xs" : "bg-muted/20 border-border/50 opacity-70"
              }`}
            >
              {/* Order & Reorder */}
              <div className="col-span-1 flex items-center justify-between sm:justify-center gap-1">
                <span className="sm:hidden text-xs font-semibold text-muted-foreground">Order:</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={spec.displayOrder}
                    onChange={(e) => updateSpec(index, { displayOrder: parseInt(e.target.value, 10) || 0 })}
                    className="h-8 w-14 text-center text-xs"
                  />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveSpec(index, "up")}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === specifications.length - 1}
                      onClick={() => moveSpec(index, "down")}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="col-span-4">
                <span className="sm:hidden text-xs font-semibold text-muted-foreground block mb-1">Label:</span>
                <Input
                  value={spec.label}
                  onChange={(e) => updateSpec(index, { label: e.target.value })}
                  placeholder="e.g. Fit, Fabric, Neck, Length"
                  className="h-8 text-xs font-semibold"
                />
              </div>

              {/* Value */}
              <div className="col-span-5">
                <span className="sm:hidden text-xs font-semibold text-muted-foreground block mb-1">Value:</span>
                <Input
                  value={spec.value}
                  onChange={(e) => updateSpec(index, { value: e.target.value })}
                  placeholder="e.g. Oversized Fit, 100% Cotton 240 GSM"
                  className="h-8 text-xs"
                />
              </div>

              {/* Status */}
              <div className="col-span-1 flex items-center justify-between sm:justify-center">
                <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={spec.isActive}
                    onChange={(e) => updateSpec(index, { isActive: e.target.checked })}
                    className="rounded border-border accent-foreground"
                  />
                  <span className="sm:hidden text-xs ml-1">{spec.isActive ? "Active" : "Hidden"}</span>
                </label>
              </div>

              {/* Delete */}
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSpec(index)}
                  title="Remove specification"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. PRODUCT DESCRIPTION & DETAILS (RICH ACCORDION)
// ==========================================

export function ProductDescriptionEditor({
  description,
  detailsHtml,
  onChangeDescription,
  onChangeDetailsHtml,
}: {
  description: string;
  detailsHtml?: string;
  onChangeDescription: (val: string) => void;
  onChangeDetailsHtml?: (val: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChangeDescription(description ? `${description}\n\n${snippet}` : snippet);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = description || "";
    const updated = current.slice(0, start) + snippet + current.slice(end);
    onChangeDescription(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-red" />
            <h4 className="font-bold text-base tracking-tight">Product Description</h4>
            <Badge variant="outline" className="text-[10px] font-mono">
              [Manufacture, Care and Fit]
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rich formatted description displayed in the smooth collapsible accordion below specifications.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border bg-secondary/40 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "edit" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {activeTab === "edit" ? (
        <div className="space-y-2">
          {/* Quick Insert Templates */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Insert Template:</span>
            <button
              type="button"
              onClick={() =>
                insertText("\n• Premium heavyweight fabric for all-day comfort\n• Reinforced ribbed crew collar\n• Pre-shrunk double-stitched hem\n")
              }
              className="rounded-md border bg-secondary/60 hover:bg-secondary px-2 py-0.5 text-xs text-foreground transition-colors"
            >
              + Bullet Points
            </button>
            <button
              type="button"
              onClick={() =>
                insertText("\n### Wash Care Instructions:\n• Machine wash cold with similar colors\n• Do not bleach or tumble dry\n• Warm iron on reverse side\n• Do not iron directly on graphic print\n")
              }
              className="rounded-md border bg-secondary/60 hover:bg-secondary px-2 py-0.5 text-xs text-foreground transition-colors"
            >
              + Wash Care
            </button>
            <button
              type="button"
              onClick={() =>
                insertText("\n### Manufacture & Origin:\n• Ethically crafted in Surat, India\n• 100% combed cotton, sustainably dyed\n• Quality inspected by RIOTOUS Quality Team\n")
              }
              className="rounded-md border bg-secondary/60 hover:bg-secondary px-2 py-0.5 text-xs text-foreground transition-colors"
            >
              + Manufacture Info
            </button>
            <button
              type="button"
              onClick={() =>
                insertText("\n### Fit & Silhouette:\n• Streetwear boxy silhouette with relaxed drop shoulders\n• Size down for regular fit; choose true size for intended oversized aesthetic\n")
              }
              className="rounded-md border bg-secondary/60 hover:bg-secondary px-2 py-0.5 text-xs text-foreground transition-colors"
            >
              + Fit Guide
            </button>
          </div>

          <Textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Write product description, manufacture details, care instructions, fit notes, bullet points..."
            rows={8}
            className="font-mono text-xs leading-relaxed resize-y"
          />

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Supports multi-paragraph text, bullet points (• or -), and section headings (### Title).
          </p>
        </div>
      ) : (
        /* Storefront Accordion Preview */
        <div className="rounded-xl border border-border/80 bg-background/80 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h5 className="font-bold text-base text-foreground tracking-tight">Product Description</h5>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                [Manufacture, Care and Fit]
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Accordion Preview
            </Badge>
          </div>

          {description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {description}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              No description entered yet. Switch to "Edit" tab to write or insert templates.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
