import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Type as TypeIcon,
  Trash2,
  Loader2,
  ShoppingBag,
  Eraser,
  Save,
  FolderOpen,
  X,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/catalog";
import { useServerFn } from "@tanstack/react-start";
import { submitCustomDesign } from "@/lib/design-submissions.functions";
import { useAuth } from "@/hooks/use-auth";
import {
  getMySavedDesigns,
  saveDesign as saveDesignServerFn,
  deleteSavedDesign,
  type SavedDesign,
} from "@/lib/saved-designs.functions";

/**
 * Renders the tee mockup composite with the exact shirt photo (color & front/back view)
 * and the fabric canvas artwork/text positioned correctly on top.
 */
async function generateTeeMockupPreview(
  canvas: any,
  placementStr: string,
  colorObj: { name: string; hex: string; front: string; back: string },
): Promise<string> {
  return new Promise((resolve) => {
    const shirtImgUrl = placementStr === "Back" ? colorObj.back : colorObj.front;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvasWidth = 880;
      const canvasHeight = 1040;
      const offCanvas = document.createElement("canvas");
      offCanvas.width = canvasWidth;
      offCanvas.height = canvasHeight;
      const ctx = offCanvas.getContext("2d");
      if (!ctx) {
        resolve(canvas.toDataURL({ format: "jpeg", quality: 0.85, multiplier: 2 }));
        return;
      }

      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      const fabricDataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      const overlayImg = new Image();
      overlayImg.onload = () => {
        let boxWidth = 440;
        let boxHeight = 540;
        let left = canvasWidth * 0.5 - boxWidth / 2;
        let top = canvasHeight * 0.28;

        if (placementStr === "Back") {
          top = canvasHeight * 0.24;
        } else if (placementStr === "Sleeve") {
          boxWidth = 220;
          boxHeight = 280;
          left = canvasWidth * 0.08;
          top = canvasHeight * 0.28;
        }

        ctx.drawImage(overlayImg, left, top, boxWidth, boxHeight);
        resolve(offCanvas.toDataURL("image/jpeg", 0.9));
      };
      overlayImg.onerror = () => {
        resolve(canvas.toDataURL({ format: "jpeg", quality: 0.85, multiplier: 2 }));
      };
      overlayImg.src = fabricDataUrl;
    };
    img.onerror = () => {
      resolve(canvas.toDataURL({ format: "jpeg", quality: 0.85, multiplier: 2 }));
    };
    img.src = shirtImgUrl;
  });
}

export const Route = createLazyFileRoute("/design")({ component: DesignPage });

const COLORS = [
  {
    name: "Black",
    hex: "#0a0a0a",
    front: "/assets/tee-black-front.webp",
    back: "/assets/tee-black-back.webp",
  },
  {
    name: "Maroon",
    hex: "#6b1d24",
    front: "/assets/tee-maroon-front.webp",
    back: "/assets/tee-maroon-back.webp",
  },
  {
    name: "Olive",
    hex: "#3e4a2a",
    front: "/assets/tee-olive-front.webp",
    back: "/assets/tee-olive-back.webp",
  },
];

const PLACEMENTS = ["Front", "Back", "Sleeve"] as const;
type Placement = (typeof PLACEMENTS)[number];

const PLACEMENT_SURCHARGE: Record<Placement, number> = {
  Front: 0,
  Back: 100,
  Sleeve: 50,
};

const BASE_PRICE = 1499;

function DesignPage() {
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [placement, setPlacement] = useState<Placement>("Front");
  const [textValue, setTextValue] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  // Per-placement design storage
  const canvasesRef = useRef<Record<string, any>>({});
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [designName, setDesignName] = useState("");
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const submitDesignFn = useServerFn(submitCustomDesign);
  const saveDesignFn = useServerFn(saveDesignServerFn);
  const deleteSavedDesignFn = useServerFn(deleteSavedDesign);

  const refreshDesigns = useCallback(async () => {
    if (!user) {
      setSavedDesigns([]);
      return;
    }
    setLoadingDesigns(true);
    try {
      const token = localStorage.getItem("riotous_session") || "";
      const data = (await getMySavedDesigns({
        headers: { Authorization: `Bearer ${token}` },
      })) as SavedDesign[];
      setSavedDesigns(Array.isArray(data) ? data : []);
    } catch {
      setSavedDesigns([]);
    }
    setLoadingDesigns(false);
  }, [user]);

  useEffect(() => {
    refreshDesigns();
  }, [refreshDesigns]);

  const snapshotCurrent = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;

    canvasesRef.current[placement] = c.toJSON();
  }, [placement]);

  const loadPlacementCanvas = useCallback(async (next: Placement) => {
    const c = canvasRef.current;
    if (!c) return;

    const json = canvasesRef.current[next];

    c.clear();
    c.backgroundColor = "transparent";

    if (json) {
      await c.loadFromJSON(json);
    }

    c.requestRenderAll();
  }, []);

  const switchPlacement = useCallback(
    async (next: Placement) => {
      if (next === placement) return;

      snapshotCurrent();
      setPlacement(next);
      await loadPlacementCanvas(next);
    },
    [placement, snapshotCurrent, loadPlacementCanvas],
  );

  // Load fabric.js on client only
  useEffect(() => {
    let disposed = false;
    let created: any = null;

    (async () => {
      const fabricMod = await import("fabric");

      if (disposed || !canvasEl.current) return;

      fabricRef.current = fabricMod;

      const c = new fabricMod.Canvas(canvasEl.current, {
        backgroundColor: "transparent",
        preserveObjectStacking: true,
      });

      c.setDimensions({
        width: 380,
        height: 460,
      });

      created = c;
      canvasRef.current = c;

      setReady(true);

      const json = canvasesRef.current[placement];

      if (json) {
        await c.loadFromJSON(json);
        c.requestRenderAll();
      }
    })();

    return () => {
      disposed = true;

      if (created) {
        created.dispose?.();

        if (canvasRef.current === created) {
          canvasRef.current = null;
          setReady(false);
        }
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !fabricRef.current || !canvasRef.current) return;

    const reader = new FileReader();

    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;

      const img = await fabricRef.current.FabricImage.fromURL(dataUrl);

      img.scaleToWidth(180);

      img.set({
        left: 100,
        top: 140,
      });

      canvasRef.current.add(img);
      canvasRef.current.setActiveObject(img);
      canvasRef.current.requestRenderAll();
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addText = () => {
    if (!textValue.trim() || !fabricRef.current || !canvasRef.current) {
      return;
    }

    const t = new fabricRef.current.Textbox(textValue, {
      left: 90,
      top: 200,
      fontFamily: "Inter",
      fontWeight: 800,
      fontSize: 40,
      fill: color.hex === "#0a0a0a" ? "#ffffff" : "#0a0a0a",
      width: 220,
      textAlign: "center",
    });

    canvasRef.current.add(t);
    canvasRef.current.setActiveObject(t);
    canvasRef.current.requestRenderAll();

    setTextValue("");
  };

  const deleteSelected = () => {
    const c = canvasRef.current;

    if (!c) return;

    const active = c.getActiveObjects();

    active.forEach((o: any) => c.remove(o));

    c.discardActiveObject();
    c.requestRenderAll();
  };

  const clearAll = () => {
    canvasRef.current?.clear();

    if (canvasRef.current) canvasRef.current.backgroundColor = "transparent";

    canvasRef.current?.requestRenderAll();

    delete canvasesRef.current[placement];
  };

  const openSave = () => {
    if (!user) {
      toast.error("Please sign in to save your design");
      return;
    }

    const c = canvasRef.current;

    snapshotCurrent();

    const hasWork =
      (c && c.getObjects().length > 0) ||
      Object.values(canvasesRef.current).some((j: any) => (j?.objects?.length ?? 0) > 0);

    if (!hasWork) {
      toast.error("Add artwork or text first.");
      return;
    }

    setDesignName("");
    setShowSave(true);
  };

  const saveDesign = async () => {
    if (!user || !designName.trim()) return;

    setSaving(true);

    try {
      snapshotCurrent();

      const preview = canvasRef.current
        ? await generateTeeMockupPreview(canvasRef.current, placement, color)
        : null;

      const token = localStorage.getItem("riotous_session") || "";
      const saved = (await saveDesignFn({
        data: {
          name: designName.trim(),
          color_name: color.name,
          placement,
          canvases: canvasesRef.current as any,
          preview_url: preview ?? null,
        },
        headers: { Authorization: `Bearer ${token}` },
      })) as SavedDesign;

      setSavedDesigns((prev) => [saved, ...prev]);
      setActiveDesignId(saved.id);
      setShowSave(false);
      toast.success(`Saved “${designName.trim()}”`);
    } catch (e) {
      console.error(e);
      toast.error("Could not save your design.");
    } finally {
      setSaving(false);
    }
  };

  const updateActiveDesign = async () => {
    if (!user || !activeDesignId) return;

    setSaving(true);

    try {
      snapshotCurrent();

      const preview = canvasRef.current
        ? await generateTeeMockupPreview(canvasRef.current, placement, color)
        : null;

      const token = localStorage.getItem("riotous_session") || "";
      const current = savedDesigns.find((d) => d.id === activeDesignId);
      await saveDesignFn({
        data: {
          id: activeDesignId,
          name: current?.name || "My Design",
          color_name: color.name,
          placement,
          canvases: canvasesRef.current as any,
          preview_url: preview ?? null,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Design updated");
      refreshDesigns();
    } catch (e) {
      console.error(e);
      toast.error("Could not update the design.");
    } finally {
      setSaving(false);
    }
  };

  const loadDesign = async (d: SavedDesign) => {
    const nextColor = COLORS.find((c) => c.name === d.color_name) ?? COLORS[0];

    canvasesRef.current = {
      ...(d.canvases ?? {}),
    };

    const nextPlacement = (PLACEMENTS as readonly string[]).includes(d.placement)
      ? (d.placement as Placement)
      : "Front";

    setColor(nextColor);
    setPlacement(nextPlacement);
    setActiveDesignId(d.id);
    setShowLibrary(false);

    await loadPlacementCanvas(nextPlacement);

    toast.success(`Loaded “${d.name}”`);
  };

  const deleteDesign = async (id: string) => {
    try {
      const token = localStorage.getItem("riotous_session") || "";
      await deleteSavedDesignFn({
        data: { id },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedDesigns((prev) => prev.filter((d) => d.id !== id));
      if (activeDesignId === id) {
        setActiveDesignId(null);
      }
    } catch {
      toast.error("Could not delete the design.");
    }
  };

  const price = BASE_PRICE + PLACEMENT_SURCHARGE[placement];

  const addToCart = async () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      toast.error("Studio is still loading — try again in a moment.");
      return;
    }

    snapshotCurrent();

    const hasWork = Object.values(canvasesRef.current).some(
      (j: any) => (j?.objects?.length ?? 0) > 0,
    );

    if (!hasWork) {
      toast.error("Add artwork or text first.");
      return;
    }

    if (!user) {
      toast.error("Please sign in so we can save your design with your order.");
      return;
    }

    setAddingToCart(true);

    try {
      // Render one mockup preview per designed side so the admin sees exact front AND back tee mockups.
      const previewImages: Record<string, string> = {};

      for (const p of PLACEMENTS) {
        const json: any = canvasesRef.current[p];
        if ((json?.objects?.length ?? 0) === 0) continue;

        await loadPlacementCanvas(p);
        previewImages[p] = await generateTeeMockupPreview(canvas, p, color);
      }

      // Restore the side the customer is looking at.
      await loadPlacementCanvas(placement);

      const preview =
        previewImages[placement] ?? (await generateTeeMockupPreview(canvas, placement, color));

      // Send the design to the admin
      let submissionId: string | null = null;

      try {
        const res = await submitDesignFn({
          data: {
            colorName: color.name,
            placement,
            productTitle: `Custom RIOTOUS Tee — ${placement} print`,
            variantId: null,
            price,
            previewDataUrl: preview,
            previewImages,
            canvases: canvasesRef.current,
          },
        });

        submissionId = res?.id ?? null;
      } catch (e) {
        console.error("submitCustomDesign", e);
        toast.error("Could not save your design. Please try again.");
        setAddingToCart(false);
        return;
      }

      await addItem({
        variantId: `custom|${placement}|${color.name}|${submissionId ?? Date.now()}`,
        productId: null,
        designSubmissionId: submissionId,
        productHandle: "design",
        productTitle: `Custom RIOTOUS Tee — ${placement} print`,
        variantTitle: `${color.name} / ${placement}`,
        imageUrl: preview,
        price: { amount: String(price), currencyCode: "INR" },
        quantity: 1,
        selectedOptions: [
          { name: "Color", value: color.name },
          { name: "Placement", value: placement },
        ],
        attributes: [
          { key: "Color", value: color.name },
          { key: "Placement", value: placement },
          ...(submissionId ? [{ key: "Design reference", value: submissionId }] : []),
        ],
      });

      toast.success("Custom design added to bag — sent to our print team");
    } catch (e) {
      console.error(e);
      toast.error("Could not add to bag. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-4 pb-16 md:px-10 md:pt-6 md:pb-20">
      {/* Intro Header - Reduced excessive vertical whitespace (Issue 2) */}
      <div className="mb-6 max-w-3xl md:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Design Studio
        </p>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl">
          Design Your Own.
        </h1>

        <p className="mt-3 max-w-lg text-sm text-muted-foreground md:text-base leading-relaxed">
          Pick a color, upload your artwork, add text — see it live on the tee.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-14 items-start">
        {/* Preview */}
        <div className="relative flex min-h-[500px] sm:min-h-[560px] items-center justify-center overflow-hidden rounded-3xl bg-secondary p-6 sm:p-8">
          <div className="relative">
            {/* Shirt photo */}
            <img
              src={placement === "Back" ? color.back : color.front}
              alt={`${color.name} tee ${placement === "Back" ? "back" : "front"}`}
              width={440}
              height={520}
              className="block h-[420px] w-[350px] sm:h-[520px] sm:w-[440px] object-contain drop-shadow-2xl"
              draggable={false}
            />

            {/* Canvas overlay for design */}
            <div
              className="absolute"
              style={{
                left: placement === "Sleeve" ? "8%" : "50%",
                top: placement === "Back" ? "24%" : "28%",
                transform: placement === "Sleeve" ? "translate(0, 0)" : "translate(-50%, 0)",
                width: placement === "Sleeve" ? 110 : 220,
                height: placement === "Sleeve" ? 140 : 270,
              }}
            >
              <canvas
                ref={canvasEl}
                className="h-full w-full"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </div>

          {/* FRONT · COLOR Status Indicator - Improved visibility, contrast & typography (Issue 4, 6) */}
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3.5 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-red animate-pulse" />
              <span>{placement}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{color.name}</span>
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6 sm:space-y-7">
          {/* Color */}
          <Panel title="Color">
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`relative h-11 w-11 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-red focus-visible:outline-offset-2 ${
                    color.name === c.name ? "border-foreground shadow-sm" : "border-border"
                  }`}
                  style={{
                    backgroundColor: c.hex,
                  }}
                  title={c.name}
                  aria-label={`Select ${c.name} color`}
                />
              ))}
            </div>
          </Panel>

          {/* Placement */}
          <Panel title="Placement">
            <div className="flex gap-2">
              {PLACEMENTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => switchPlacement(p)}
                  className={`btn-secondary flex-1 rounded-full px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-brand-red focus-visible:outline-offset-2 ${
                    placement === p
                      ? "border-foreground bg-foreground text-background shadow-xs"
                      : "border-border bg-background/80 text-foreground hover:bg-secondary hover:border-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Each side keeps its own artwork — switch back anytime.
            </p>
          </Panel>

          {/* Upload */}
          <Panel title="Artwork">
            <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-border bg-background/60 py-3.5 px-4 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:border-foreground hover:bg-secondary">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span>Upload PNG / SVG / JPG</span>
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={handleUpload}
                disabled={!ready}
              />
            </label>
          </Panel>

          {/* Text with explicit label (Issue 7) */}
          <Panel title="Add text">
            <div className="flex gap-2">
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ready && textValue.trim()) {
                    e.preventDefault();
                    addText();
                  }
                }}
                placeholder="Your line"
                maxLength={40}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-foreground"
              />

              <button
                type="button"
                onClick={addText}
                disabled={!ready || !textValue.trim()}
                aria-label="Add Text to design"
                title="Add Text"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-foreground bg-foreground px-4 text-xs sm:text-sm font-semibold text-background transition-all hover:bg-brand-red hover:border-brand-red hover:text-white disabled:opacity-40 disabled:pointer-events-none active:scale-95 focus-visible:outline-2 focus-visible:outline-brand-red focus-visible:outline-offset-2"
              >
                <TypeIcon className="h-4 w-4" />
                <span>Add Text</span>
              </button>
            </div>
          </Panel>

          {/* Canvas Editing Actions with clear grouping container (Issue 8) */}
          <Panel title="Editing">
            <div className="flex gap-2 rounded-2xl border border-border/60 bg-muted/20 p-2 sm:p-2.5">
              <button
                type="button"
                onClick={deleteSelected}
                className="btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/80 py-2.5 px-3 text-xs font-semibold text-muted-foreground transition-all hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete selected</span>
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/80 py-2.5 px-3 text-xs font-semibold text-muted-foreground transition-all hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>Remove artwork</span>
              </button>
            </div>
          </Panel>

          {/* Save / My designs (Issue 5: Save design is secondary/outlined) */}
          <Panel title="Your designs">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openSave}
                disabled={!ready}
                className="btn-secondary flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background/80 py-2.5 px-4 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:border-foreground disabled:opacity-40 active:scale-95"
              >
                <Save className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Save design</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast.error("Please sign in to see your saved designs");
                    return;
                  }

                  refreshDesigns();
                  setShowLibrary(true);
                }}
                className="btn-secondary flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background/80 py-2.5 px-4 text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:border-foreground active:scale-95"
              >
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span>My designs</span>
                {savedDesigns.length > 0 && ` (${savedDesigns.length})`}
              </button>
            </div>

            {activeDesignId && (
              <button
                type="button"
                onClick={updateActiveDesign}
                disabled={saving}
                className="mt-2 w-full rounded-full border border-border bg-background/80 py-2.5 px-4 text-xs sm:text-sm font-semibold text-foreground hover:border-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Update saved design
              </button>
            )}

            {!user && (
              <p className="mt-2 text-xs text-muted-foreground">
                Sign in to save your designs and come back to them later.
              </p>
            )}
          </Panel>

          {/* Price + Primary Add to Bag CTA (Issue 1, 5, 6) */}
          <div className="rounded-3xl bg-secondary p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Estimated
              </span>

              <span className="text-3xl font-semibold tracking-tight">
                {formatPrice(price, "INR")}
              </span>
            </div>

            <button
              type="button"
              onClick={addToCart}
              disabled={addingToCart || !ready}
              className="btn-primary mt-4 flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-brand-red px-6 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all duration-300 hover:bg-brand-red/90 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-2 focus-visible:outline-brand-red focus-visible:outline-offset-2"
            >
              {addingToCart ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add to bag</span>
                </>
              )}
            </button>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Your design will be printed on a premium DTF tee and ship in 5–7 days. Final proof
              reviewed before print.
            </p>
          </div>
        </div>
      </div>

      {!ready && (
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading design studio…
        </div>
      )}

      {/* Floating Design Studio Help / Chat Assistance Button (Issue 3) */}
      <aside
        aria-label="Design assistance"
        className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40"
      >
        <a
          href="https://wa.me/919099866791?text=Hi%20RIOTOUS%20team%2C%20I%20need%20help%20with%20my%20custom%20design"
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with RIOTOUS design specialist"
          className="group flex items-center gap-2.5 rounded-full border border-border/80 bg-background/95 px-4 py-3 text-xs sm:text-sm font-semibold text-foreground shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-brand-red hover:border-brand-red hover:text-white hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-brand-red focus-visible:outline-offset-2"
        >
          <MessageCircle className="h-4 w-4 text-brand-red transition-colors group-hover:text-white" />
          <span className="hidden sm:inline">Design Help</span>
          <span className="sm:hidden">Help</span>
        </a>
      </aside>

      {/* Save dialog */}
      {showSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Name your design</h2>

              <button
                type="button"
                onClick={() => setShowSave(false)}
                aria-label="Close"
                className="rounded-full p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              autoFocus
              type="text"
              value={designName}
              maxLength={60}
              onChange={(e) => setDesignName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDesign();
              }}
              placeholder="e.g. Zoro drop v1"
              className="mt-4 w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />

            <button
              type="button"
              onClick={saveDesign}
              disabled={saving || !designName.trim()}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Saved designs library */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-3xl bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold tracking-tight">My saved designs</h2>

              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                aria-label="Close"
                className="rounded-full p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingDesigns ? (
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </div>
            ) : savedDesigns.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No saved designs yet. Create something and hit Save design.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {savedDesigns.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-4 rounded-2xl border border-border p-3"
                  >
                    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {d.preview_url && (
                        <img
                          src={d.preview_url}
                          alt={d.name}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>

                      <p className="text-xs text-muted-foreground">
                        {d.color_name} · {d.placement} ·{" "}
                        {new Date(d.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadDesign(d)}
                      className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      Open
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteDesign(d.id)}
                      aria-label={`Delete ${d.name}`}
                      className="rounded-full border border-border p-2 hover:border-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}
