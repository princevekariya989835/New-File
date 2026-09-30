import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadProductImage } from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  X,
  Upload,
  Star,
  Image as ImageIcon,
  Plus,
  Trash2,
  Loader2,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import {
  KeyHighlightsEditor,
  ProductSpecificationsEditor,
  ProductDescriptionEditor,
  ProductOffersEditor,
  ProductMeasurementsEditor,
  ProductFeaturesEditor,
  ProductCareEditor,
  ProductManufacturingEditor,
  type ProductHighlightItem,
  type ProductSpecificationItem,
} from "./product-details-editor";
import type { ProductOfferInput } from "@/lib/admin-utils";
import type { GarmentMeasurement, ManufacturingInfo, ProductColorVariant } from "@/lib/fallback-products";

export {
  KeyHighlightsEditor,
  ProductSpecificationsEditor,
  ProductDescriptionEditor,
  ProductOffersEditor,
  ProductMeasurementsEditor,
  ProductFeaturesEditor,
  ProductCareEditor,
  ProductManufacturingEditor,
};
export type { ProductHighlightItem, ProductSpecificationItem, ProductColorVariant };

export const ARCHIVED_TAG = "__archived";

export type ProductFormValues = {
  title: string;
  description: string;
  detailsHtml?: string;
  price: string;
  mrp?: string;
  isTaxInclusive?: boolean;
  category: string;
  images: string[];
  colors: string[];
  colorVariants?: ProductColorVariant[];
  sizes: string[];
  sizeStock?: Record<string, number>;
  tags: string[];
  stock: string;
  isActive: boolean;
  highlights?: ProductHighlightItem[];
  specifications?: ProductSpecificationItem[];
  offers?: ProductOfferInput[];
  features?: string[];
  careInstructions?: string[];
  manufacturingInfo?: ManufacturingInfo;
  sizeMeasurements?: GarmentMeasurement[];
};

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export function StockEditor({
  productId,
  stock,
  onSave,
  saving,
}: {
  productId: string;
  stock: number;
  onSave: (productId: string, quantity: number) => void;
  saving: boolean;
}) {
  const [val, setVal] = useState(String(stock));
  const dirty = val !== String(stock);
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-xs font-medium">Stock</span>
      <Input
        type="number"
        min={0}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-7 w-24 px-2 text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant={dirty ? "default" : "ghost"}
        disabled={!dirty || saving}
        onClick={() => {
          const q = parseInt(val, 10);
          if (Number.isFinite(q) && q >= 0) onSave(productId, q);
        }}
        className="h-7 px-2 text-xs"
      >
        Save
      </Button>
    </div>
  );
}

export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...values, ...parts])));
    setDraft("");
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => add(draft)}>
          Add
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageManager({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const result = await uploadProductImage(file);
        if (result) uploaded.push(result);
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setUploading(false);
    if (uploaded.length) {
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image(s) ready`);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("/")
    ) {
      toast.error("Please enter a valid image URL (e.g. https://... or /...)");
      return;
    }
    onChange([...images, trimmed]);
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("Image URL added");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Product Photos ({images.length})</Label>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <LinkIcon className="h-3 w-3" />
          {showUrlInput ? "Hide URL input" : "Add via image URL"}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Paste image link (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            className="h-9 text-sm"
          />
          <Button type="button" size="sm" onClick={handleAddUrl} className="shrink-0 gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {uploading ? "Processing photo(s)…" : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PNG, JPG, WebP or AVIF (auto-resized and optimized)
          </p>
        </div>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
          {images.map((url, i) => (
            <div
              key={`${url.slice(0, 30)}-${i}`}
              className="group relative aspect-square rounded-xl border bg-secondary/50 overflow-hidden shadow-xs"
            >
              <img
                src={url}
                alt={`Product photo ${i + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset["retried"]) return;
                  img.dataset["retried"] = "1";
                  setTimeout(() => {
                    img.src = `${url}${url.includes("?") ? "&" : "?"}r=${Date.now()}`;
                  }, 800);
                }}
              />

              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  title="Make cover photo"
                  className="absolute left-1.5 top-1.5 rounded-full bg-background/90 p-1.5 opacity-90 transition-opacity hover:opacity-100 hover:scale-110 shadow-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([url, ...images.filter((_, idx) => idx !== i)]);
                  }}
                >
                  <Star className="h-3 w-3 text-muted-foreground hover:text-amber-500" />
                </button>
              )}

              <button
                type="button"
                title="Remove photo"
                className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 text-destructive opacity-90 transition-opacity hover:opacity-100 hover:scale-110 shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(images.filter((_, idx) => idx !== i));
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COLOR_PRESETS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#E31B23" },
  { name: "Maroon", hex: "#7B1113" },
  { name: "Navy Blue", hex: "#1B2A4A" },
  { name: "Olive Green", hex: "#556B2F" },
  { name: "Charcoal", hex: "#2D2D2D" },
  { name: "Beige", hex: "#D4C5B9" },
];

export function ProductColorVariantsEditor({
  colorVariants = [],
  onChange,
}: {
  colorVariants: ProductColorVariant[];
  onChange: (next: ProductColorVariant[]) => void;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftHex, setDraftHex] = useState("#000000");
  const [draftImage, setDraftImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingVariantId, setReplacingVariantId] = useState<string | null>(null);

  const handleFileUpload = async (file: File, forVariantId?: string) => {
    try {
      setUploading(true);
      const res = await uploadProductImage(file);
      if (res) {
        if (forVariantId) {
          onChange(
            colorVariants.map((v) => ((v.id || v.name) === forVariantId ? { ...v, imageUrl: res } : v)),
          );
          toast.success("Color image replaced successfully");
        } else {
          setDraftImage(res);
          toast.success("Color image uploaded");
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
      setReplacingVariantId(null);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      toast.error("Please enter a valid image URL");
      return;
    }
    setDraftImage(trimmed);
    setUrlDraft("");
    setShowUrlInput(false);
    toast.success("Image URL set");
  };

  const handleSave = () => {
    const name = draftName.trim();
    if (!name) {
      toast.error("Please enter a color name (e.g. Black, White, Red)");
      return;
    }
    const hex = draftHex.trim() || "#000000";
    const imageUrl = draftImage.trim();
    if (!imageUrl) {
      toast.error("Please upload an image specifically for this color");
      return;
    }

    if (editingId) {
      onChange(
        colorVariants.map((v) =>
          (v.id || v.name) === editingId ? { ...v, name, hex, imageUrl } : v,
        ),
      );
      toast.success(`Updated color "${name}"`);
      setEditingId(null);
    } else {
      const newVariant: ProductColorVariant = {
        id: `cv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        hex,
        imageUrl,
      };
      onChange([...colorVariants, newVariant]);
      toast.success(`Added color "${name}"`);
    }

    setDraftName("");
    setDraftHex("#000000");
    setDraftImage("");
    setShowUrlInput(false);
    setUrlDraft("");
  };

  const startEdit = (v: ProductColorVariant) => {
    setEditingId(v.id || v.name);
    setDraftName(v.name);
    setDraftHex(v.hex || "#000000");
    setDraftImage(v.imageUrl || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
    setDraftHex("#000000");
    setDraftImage("");
    setShowUrlInput(false);
    setUrlDraft("");
  };

  const handleDelete = (idOrName: string) => {
    onChange(colorVariants.filter((v) => (v.id || v.name) !== idOrName));
    toast.success("Color removed");
    if (editingId === idOrName) {
      cancelEdit();
    }
  };

  const triggerReplace = (variantId: string) => {
    setReplacingVariantId(variantId);
    replaceFileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />
      <input
        type="file"
        ref={replaceFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          e.target.files?.[0] && replacingVariantId && handleFileUpload(e.target.files[0], replacingVariantId)
        }
      />

      {/* Editor Box */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
            {editingId ? "Edit Color Variant" : "Add Color Variant"}
          </Label>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs">
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Color Name */}
          <div>
            <Label className="text-xs font-medium">Color Name *</Label>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Black, White, Red, Navy Blue"
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Color Hex & Swatch */}
          <div>
            <Label className="text-xs font-medium">Color Swatch / Hex Value</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={draftHex.startsWith("#") && draftHex.length === 7 ? draftHex : "#000000"}
                onChange={(e) => setDraftHex(e.target.value)}
                className="h-9 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                title="Choose color"
              />
              <Input
                value={draftHex}
                onChange={(e) => setDraftHex(e.target.value)}
                placeholder="#000000"
                className="h-9 text-xs font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div>
          <Label className="text-[11px] text-muted-foreground">Quick Presets:</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setDraftName(p.name);
                  setDraftHex(p.hex);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: p.hex }}
                />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Color-specific Image Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Image Specifically For This Color *
            </Label>
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon className="h-3 w-3" />
              {showUrlInput ? "Upload file instead" : "Use image URL"}
            </button>
          </div>

          {showUrlInput ? (
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
                className="h-9 text-sm"
              />
              <Button type="button" size="sm" onClick={handleAddUrl} className="shrink-0 gap-1">
                Set URL
              </Button>
            </div>
          ) : draftImage ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-card p-2.5">
              <img
                src={draftImage}
                alt="Color variant preview"
                className="h-16 w-16 rounded-md object-contain border bg-secondary/30 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  Image attached for {draftName || "this color"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  This image will be shown whenever this color is selected.
                </p>
                <div className="mt-1.5 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Replace Image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDraftImage("")}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-secondary/20 p-5 text-center transition-colors hover:border-foreground/40 hover:bg-secondary/40"
            >
              {uploading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Uploading image…
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground/80 mb-1" />
                  <span className="text-xs font-semibold text-foreground">
                    Upload image for this color variant
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Click to browse or drag & drop PNG, JPG, or WebP
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add/Update Button */}
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleSave}
            disabled={uploading}
            className="gap-1.5 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
          >
            {editingId ? (
              <>Update Color Variant</>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add Color Variant
              </>
            )}
          </Button>
        </div>
      </div>

      {/* List of Configured Color Variants */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configured Colors ({colorVariants.length})
        </Label>

        {colorVariants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
            No color variants added yet. Add colors above with their dedicated uploaded photos.
          </div>
        ) : (
          <div className="space-y-2">
            {colorVariants.map((v) => {
              const itemKey = v.id || v.name;
              return (
                <div
                  key={itemKey}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-7 w-7 rounded-full border border-black/20 shadow-xs shrink-0"
                      style={{ backgroundColor: v.hex || "#333333" }}
                      title={v.hex || v.name}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{v.name}</span>
                        {v.hex && (
                          <span className="text-[11px] font-mono uppercase rounded bg-secondary px-2 py-0.5 text-muted-foreground">
                            {v.hex}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Dedicated photo attached
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {v.imageUrl && (
                      <img
                        src={v.imageUrl}
                        alt={v.name}
                        className="h-12 w-12 rounded-lg border bg-secondary/30 object-contain shrink-0"
                      />
                    )}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => triggerReplace(itemKey)}
                        disabled={uploading}
                        className="h-7 px-2 text-xs gap-1 cursor-pointer"
                        title="Replace this color's image"
                      >
                        <Upload className="h-3 w-3" /> Replace Image
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(v)}
                        className="h-7 px-2 text-xs cursor-pointer"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(itemKey)}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM: ProductFormValues = {
  title: "",
  description: "",
  detailsHtml: "",
  price: "",
  mrp: "",
  isTaxInclusive: true,
  category: "Oversized Tees",
  images: [],
  colors: ["Black"],
  colorVariants: [],
  sizes: ["S", "M", "L", "XL", "XXL"],
  tags: ["Featured"],
  stock: "25",
  isActive: true,
  highlights: [],
  specifications: [],
  offers: [],
  features: [],
  careInstructions: [],
  manufacturingInfo: { country_of_origin: "India", manufacturer: "", marketed_by: "", customer_care: "" },
  sizeMeasurements: [],
};

export function ProductForm({
  heading,
  submitLabel,
  initial,
  onSubmit,
  onCancel,
}: {
  heading: string;
  submitLabel: string;
  initial?: ProductFormValues;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ProductFormValues>(() => ({
    ...(initial ?? EMPTY_FORM),
    colorVariants: initial?.colorVariants ?? [],
    mrp: initial?.mrp ?? "",
    isTaxInclusive: initial?.isTaxInclusive !== false,
    highlights: initial?.highlights ?? [],
    specifications: initial?.specifications ?? [],
    offers: initial?.offers ?? [],
    features: initial?.features ?? [],
    careInstructions: initial?.careInstructions ?? [],
    manufacturingInfo: initial?.manufacturingInfo ?? {
      country_of_origin: "India",
      manufacturer: "",
      marketed_by: "",
      customer_care: "",
    },
    sizeMeasurements: initial?.sizeMeasurements ?? [],
    detailsHtml: initial?.detailsHtml ?? "",
  }));
  const [sizeStock, setSizeStock] = useState<Record<string, number>>(() => {
    if (initial?.sizeStock) return initial.sizeStock;
    const initialSizes = initial?.sizes || ["S", "M", "L", "XL", "XXL"];
    const total = Number(initial?.stock || 0);
    const base = initialSizes.length ? Math.floor(total / initialSizes.length) : 0;
    const rem = initialSizes.length ? total % initialSizes.length : 0;
    const res: Record<string, number> = {};
    initialSizes.forEach((s, idx) => {
      res[s] = base + (idx < rem ? 1 : 0);
    });
    return res;
  });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSizesChange = (newSizes: string[]) => {
    set("sizes", newSizes);
    setSizeStock((prev) => {
      const next: Record<string, number> = {};
      newSizes.forEach((s) => {
        next[s] = prev[s] ?? 0;
      });
      // Update total stock to match
      const sum = Object.values(next).reduce((a, b) => a + b, 0);
      set("stock", String(sum));
      return next;
    });
  };

  const handleSizeQtyChange = (size: string, qty: number) => {
    const safeQty = Math.max(0, Math.round(qty) || 0);
    const next = { ...sizeStock, [size]: safeQty };
    setSizeStock(next);
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    set("stock", String(total));
  };

  const handleTotalStockChange = (newTotalStr: string) => {
    set("stock", newTotalStr);
    const total = Math.max(0, parseInt(newTotalStr, 10) || 0);
    const sList = values.sizes.length ? values.sizes : ["Default"];
    const base = Math.floor(total / sList.length);
    const rem = total % sList.length;
    const next: Record<string, number> = {};
    sList.forEach((s, idx) => {
      next[s] = base + (idx < rem ? 1 : 0);
    });
    setSizeStock(next);
  };

  // Pricing calculations
  const sellingPriceNum = Number(values.price) || 0;
  const mrpNum = values.mrp ? Number(values.mrp) : 0;
  const hasMrp = mrpNum > 0;
  const isPriceHigherThanMrp = hasMrp && sellingPriceNum > mrpNum;
  const discountAmt = hasMrp && sellingPriceNum <= mrpNum ? mrpNum - sellingPriceNum : 0;
  const discountPct = hasMrp && mrpNum > 0 ? Math.round((discountAmt / mrpNum) * 100) : 0;

  return (
    <form
      className="space-y-6 rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-sm animate-in fade-in-50 duration-200"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!values.title.trim()) {
          toast.error("Product name is required");
          return;
        }
        const price = Number(values.price);
        if (!values.price.trim() || !Number.isFinite(price) || price < 0) {
          toast.error("Price is required and must be a number ≥ 0");
          return;
        }
        if (values.mrp && values.mrp.trim()) {
          const mrp = Number(values.mrp);
          if (!Number.isFinite(mrp) || mrp < 0) {
            toast.error("MRP must be a valid positive number");
            return;
          }
          if (price > mrp) {
            toast.error(`Selling price (₹${price}) cannot exceed MRP (₹${mrp})`);
            return;
          }
        }
        const stock = Number(values.stock);
        if (!Number.isFinite(stock) || stock < 0) {
          toast.error("Stock must be a number ≥ 0");
          return;
        }
        setBusy(true);
        try {
          await onSubmit({
            ...values,
            title: values.title.trim(),
            description: values.description.trim(),
            detailsHtml: values.detailsHtml?.trim() || "",
            mrp: values.mrp ? values.mrp.trim() : undefined,
            isTaxInclusive: values.isTaxInclusive !== false,
            highlights: values.highlights ?? [],
            specifications: values.specifications ?? [],
            offers: values.offers ?? [],
            features: values.features ?? [],
            careInstructions: values.careInstructions ?? [],
            manufacturingInfo: values.manufacturingInfo,
            sizeMeasurements: values.sizeMeasurements ?? [],
            sizeStock,
          });
        } catch (err) {
          toast.error((err as Error).message || "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <h3 className="font-bold text-xl tracking-tight">{heading}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure product catalog data, media, pricing, offers, technical specifications, and size measurements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy} className="bg-foreground text-background hover:bg-foreground/90 font-medium">
            {busy ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>

      {/* 1. BASIC PRODUCT INFORMATION */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
            1
          </span>
          Basic Product Information
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">Product Name *</Label>
            <Input
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Oversized Graphic Streetwear Tee"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Category</Label>
            <Input
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Oversized Tees, Hoodies, Graphic Tees"
              className="mt-1"
            />
          </div>
          <div className="flex items-center pt-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-border accent-foreground"
              />
              <span>Active (visible on storefront)</span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. PRICING & MRP SYSTEM */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
            2
          </span>
          Pricing & MRP System
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <Label className="text-xs font-semibold">Selling / Offer Price (INR) *</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="e.g. 1199"
              className="mt-1"
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Final selling price charged to customer
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Original MRP (INR)</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={values.mrp ?? ""}
              onChange={(e) => set("mrp", e.target.value)}
              placeholder="e.g. 1999"
              className={`mt-1 ${isPriceHigherThanMrp ? "border-destructive ring-1 ring-destructive" : ""}`}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Struck-through price on product page
            </p>
          </div>

          {/* Auto-calculated Discount Card */}
          <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Auto-Calculated Discount
            </span>
            {isPriceHigherThanMrp ? (
              <span className="text-xs font-bold text-destructive mt-1">
                ⚠️ Selling Price exceeds MRP!
              </span>
            ) : hasMrp && discountAmt > 0 ? (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-extrabold text-emerald-500">
                  {discountPct}% OFF
                </span>
                <span className="text-xs text-muted-foreground">
                  (Save ₹{discountAmt})
                </span>
              </div>
            ) : hasMrp && discountAmt === 0 ? (
              <span className="text-xs font-medium text-muted-foreground mt-1">
                Selling price equals MRP (0% discount)
              </span>
            ) : (
              <span className="text-xs text-muted-foreground mt-1">
                Enter MRP to auto-calculate discount
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={values.isTaxInclusive !== false}
              onChange={(e) => set("isTaxInclusive", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-foreground"
            />
            <span>Inclusive of all Taxes (displays "Inclusive of all Taxes" on product page)</span>
          </label>
        </div>
      </div>

      {/* 3. OFFERS */}
      <ProductOffersEditor
        offers={values.offers ?? []}
        onChange={(next) => set("offers", next)}
      />

      {/* 4. PRODUCT IMAGES */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
            4
          </span>
          Product Photos & Media
        </h4>
        <ImageManager images={values.images} onChange={(v) => set("images", v)} />
      </div>

      {/* 5. PRODUCT COLORS / COLOR VARIANTS */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
              5
            </span>
            Product Colors / Color Variants
          </h4>
          <span className="text-xs text-muted-foreground">
            Each color has its own actual uploaded image for storefront swatches.
          </span>
        </div>
        <ProductColorVariantsEditor
          colorVariants={values.colorVariants ?? []}
          onChange={(nextCv) => {
            set("colorVariants", nextCv);
            const cvNames = nextCv.map((c) => c.name.trim()).filter(Boolean);
            if (cvNames.length > 0) {
              set("colors", Array.from(new Set([...values.colors, ...cvNames])));
            }
          }}
        />
      </div>

      {/* 6. VARIANTS / SIZES */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
            6
          </span>
          Variants & Options
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ChipInput
              label="Available sizes"
              values={values.sizes}
              onChange={handleSizesChange}
              placeholder="S, M, L, XL, XXL…"
              suggestions={["S", "M", "L", "XL", "XXL"]}
            />
          </div>

          <ChipInput
            label="Colors"
            values={values.colors}
            onChange={(v) => set("colors", v)}
            placeholder="Black, Maroon…"
            suggestions={["Black", "White", "Maroon", "Olive Green"]}
          />
          <ChipInput
            label="Tags & Search Keywords"
            values={values.tags}
            onChange={(v) => set("tags", v)}
            placeholder="anime, streetwear, dtf, bestseller…"
          />
        </div>
      </div>

      {/* 6. INVENTORY */}
      <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 md:p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
            6
          </span>
          Inventory & Stock Allocation
        </h4>
        <div className="max-w-xs">
          <Label className="text-xs font-semibold">Total Stock Quantity</Label>
          <Input
            type="number"
            min={0}
            value={values.stock}
            onChange={(e) => handleTotalStockChange(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Per-size stock breakdown */}
        {values.sizes.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Stock Breakdown per Size (Total: {values.stock})
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {values.sizes.map((sz) => (
                <div key={sz} className="rounded-md border bg-card p-2 text-center">
                  <div className="text-xs font-bold mb-1">{sz}</div>
                  <Input
                    type="number"
                    min={0}
                    value={sizeStock[sz] ?? 0}
                    onChange={(e) => handleSizeQtyChange(sz, parseInt(e.target.value, 10) || 0)}
                    className="h-8 text-center text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. SIZE MEASUREMENTS */}
      <ProductMeasurementsEditor
        measurements={values.sizeMeasurements ?? []}
        onChange={(next) => set("sizeMeasurements", next)}
      />

      {/* 8. KEY HIGHLIGHTS */}
      <KeyHighlightsEditor
        highlights={values.highlights ?? []}
        onChange={(next) => set("highlights", next)}
      />

      {/* 9. PRODUCT SPECIFICATIONS */}
      <ProductSpecificationsEditor
        specifications={values.specifications ?? []}
        onChange={(next) => set("specifications", next)}
      />

      {/* 10. PRODUCT DESCRIPTION */}
      <ProductDescriptionEditor
        description={values.description}
        detailsHtml={values.detailsHtml}
        onChangeDescription={(next) => set("description", next)}
        onChangeDetailsHtml={(next) => set("detailsHtml", next)}
      />

      {/* 11. KEY FEATURES */}
      <ProductFeaturesEditor
        features={values.features ?? []}
        onChange={(next) => set("features", next)}
      />

      {/* 12. CARE INSTRUCTIONS */}
      <ProductCareEditor
        careInstructions={values.careInstructions ?? []}
        onChange={(next) => set("careInstructions", next)}
      />

      {/* 13. MANUFACTURING INFORMATION */}
      <ProductManufacturingEditor
        manufacturingInfo={values.manufacturingInfo}
        onChange={(next) => set("manufacturingInfo", next)}
      />

      {/* 14. BOTTOM ACTIONS */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="bg-foreground text-background hover:bg-foreground/90 px-6 font-semibold"
        >
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
