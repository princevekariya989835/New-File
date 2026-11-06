import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  adminListFeaturedCollections,
  adminGetFeaturedCollection,
  adminUpdateFeaturedCollection,
  adminSearchProductsForCollection,
  type FeaturedCollectionId,
  type FeaturedCollectionDetail,
  type FeaturedCollectionProductItem,
} from "@/lib/featured-collections.functions";
import { money } from "@/components/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Save,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export const Route = createLazyFileRoute("/_authenticated/admin/featured-collections")({
  component: FeaturedCollectionsPage,
});

const COLLECTIONS_CONFIG: Array<{
  id: FeaturedCollectionId;
  label: string;
  department: "men" | "women";
  collectionType: "best_sellers" | "latest_edition";
  storefrontPath: string;
  defaultDescription: string;
}> = [
  {
    id: "men_best_sellers",
    label: "Men's Best Sellers",
    department: "men",
    collectionType: "best_sellers",
    storefrontPath: "/collections/men/best-sellers",
    defaultDescription: "Verified customer favorites and top-selling heavyweight streetwear for men.",
  },
  {
    id: "men_latest_edition",
    label: "Men's Latest Edition",
    department: "men",
    collectionType: "latest_edition",
    storefrontPath: "/collections/men/latest-edition",
    defaultDescription: "Fresh seasonal drops, limited releases, and oversized DTF graphic tees for men.",
  },
  {
    id: "women_best_sellers",
    label: "Women's Best Sellers",
    department: "women",
    collectionType: "best_sellers",
    storefrontPath: "/collections/women/best-sellers",
    defaultDescription: "Curated best-selling streetwear, relaxed silhouettes, and everyday statement tees for women.",
  },
  {
    id: "women_latest_edition",
    label: "Women's Latest Edition",
    department: "women",
    collectionType: "latest_edition",
    storefrontPath: "/collections/women/latest-edition",
    defaultDescription: "New seasonal arrivals, cropped fits, baby tees, and oversized streetwear for women.",
  },
];

function FeaturedCollectionsPage() {
  const qc = useQueryClient();
  const listCollectionsFn = useServerFn(adminListFeaturedCollections);
  const getDetailFn = useServerFn(adminGetFeaturedCollection);
  const updateFn = useServerFn(adminUpdateFeaturedCollection);
  const searchProdsFn = useServerFn(adminSearchProductsForCollection);

  const [activeTab, setActiveTab] = useState<FeaturedCollectionId>("men_best_sellers");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Local state for editing the active collection
  const [assignedItems, setAssignedItems] = useState<FeaturedCollectionProductItem[]>([]);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDesc, setCollectionDesc] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Query collection list summary
  const listQ = useQuery({
    queryKey: ["admin", "featured-collections"],
    queryFn: () => listCollectionsFn(),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  // Query detail for active collection
  const detailQ = useQuery({
    queryKey: ["admin", "featured-collection", activeTab],
    queryFn: () => getDetailFn({ data: { id: activeTab } }),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  // Synchronize local edit state when activeTab changes or query finishes
  useEffect(() => {
    if (detailQ.data) {
      setAssignedItems(detailQ.data.items || []);
      setCollectionTitle(detailQ.data.title || "");
      setCollectionDesc(detailQ.data.description || "");
      setIsEnabled(detailQ.data.isEnabled ?? true);
      setIsDirty(false);
    }
  }, [detailQ.data, activeTab]);

  // Mutation to save changes
  const saveMut = useMutation({
    mutationFn: async () => {
      const productIds = assignedItems.map((it) => it.productId);
      return await updateFn({
        data: {
          id: activeTab,
          title: collectionTitle.trim() || undefined,
          description: collectionDesc.trim() || undefined,
          isEnabled,
          productIds,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Published ${res.count} products to ${collectionTitle}!`);
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "featured-collections"] });
      qc.invalidateQueries({ queryKey: ["admin", "featured-collection", activeTab] });
      qc.invalidateQueries({ queryKey: ["public", "featured-collection"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["department-products"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save collection changes.");
    },
  });

  // Reorder handlers
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= assignedItems.length) return;

    const copy = [...assignedItems];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // re-index display orders
    const updated = copy.map((item, idx) => ({
      ...item,
      displayOrder: idx,
    }));

    setAssignedItems(updated);
    setIsDirty(true);
  };

  const removeItem = (productId: string) => {
    const updated = assignedItems
      .filter((it) => it.productId !== productId)
      .map((it, idx) => ({ ...it, displayOrder: idx }));
    setAssignedItems(updated);
    setIsDirty(true);
    toast.info("Product removed from collection. Remember to click Save & Publish.");
  };

  const activeMeta = useMemo(() => {
    return COLLECTIONS_CONFIG.find((c) => c.id === activeTab)!;
  }, [activeTab]);

  // Handle switching tabs with unsaved changes confirmation
  const handleTabSwitch = (id: FeaturedCollectionId) => {
    if (id === activeTab) return;
    if (isDirty) {
      if (!window.confirm("You have unsaved changes in this collection. Discard and switch?")) {
        return;
      }
    }
    setActiveTab(id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Featured Collections</h1>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-bold">
              Dynamic Storefront
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Independently manage and order products for Men & Women Best Sellers and Latest Edition collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
              <AlertCircle className="h-3.5 w-3.5" /> Unsaved changes
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPreviewModalOpen(true)}
            disabled={assignedItems.length === 0}
            className="border-zinc-300 hover:bg-zinc-100 text-xs font-bold gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !isDirty}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            {saveMut.isPending ? "Publishing…" : "Save & Publish"}
          </Button>
        </div>
      </div>

      {/* 4 Collections Tab Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLLECTIONS_CONFIG.map((c) => {
          const summary = listQ.data?.find((s) => s.id === c.id);
          const isSelected = activeTab === c.id;
          const count = isSelected ? assignedItems.length : (summary?.productCount ?? 0);
          const enabled = isSelected ? isEnabled : (summary?.isEnabled ?? true);

          return (
            <button
              key={c.id}
              onClick={() => handleTabSwitch(c.id)}
              className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
                isSelected
                  ? "bg-white border-red-500 shadow-md ring-2 ring-red-500/20"
                  : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    c.department === "men"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {c.department}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      enabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-zinc-500">
                    {enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-sm text-zinc-900 mt-2 line-clamp-1">{c.label}</h3>
              <p className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
                <span>{count} products</span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {c.collectionType === "best_sellers" ? "Best Sellers" : "Latest Drops"}
                </span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Collection Editor Box */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-xs">
        {/* Top Control Bar of Active Collection */}
        <div className="p-5 border-b border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">{activeMeta.label}</h2>
              <a
                href={activeMeta.storefrontPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline"
              >
                View on Store <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-zinc-500">
              Drag, reorder, or add products below. Products are displayed on the storefront in this exact order.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">
              <label htmlFor="col-enabled" className="text-xs font-semibold text-zinc-700 cursor-pointer select-none">
                Enable Collection
              </label>
              <input
                id="col-enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => {
                  setIsEnabled(e.target.checked);
                  setIsDirty(true);
                }}
                className="h-4 w-4 rounded-sm border-zinc-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
            </div>

            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Products
            </Button>
          </div>
        </div>

        {/* Collection Metadata Inputs (Title & Description) */}
        <div className="p-5 border-b border-zinc-200/80 bg-zinc-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Display Title</label>
            <Input
              value={collectionTitle}
              onChange={(e) => {
                setCollectionTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder={activeMeta.label}
              className="bg-white text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Description / Subtitle</label>
            <Input
              value={collectionDesc}
              onChange={(e) => {
                setCollectionDesc(e.target.value);
                setIsDirty(true);
              }}
              placeholder={activeMeta.defaultDescription}
              className="bg-white text-xs font-medium"
            />
          </div>
        </div>

        {/* Assigned Products List */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Assigned Products ({assignedItems.length})
            </h3>
            {assignedItems.length > 0 && (
              <span className="text-[11px] text-zinc-400">
                Tip: Use the arrows to adjust order. Top item is #1 on storefront.
              </span>
            )}
          </div>

          {detailQ.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : assignedItems.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              <Layers className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-zinc-800">No products assigned yet</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                This collection has no products. Click the button below to browse and select products from your database.
              </p>
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Products Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/80 border border-zinc-200 rounded-xl overflow-hidden">
              {assignedItems.map((item, index) => {
                const p = item.product;
                const img = p.images?.[0] || "/placeholder-tee.jpg";
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 bg-white hover:bg-zinc-50/80 transition-colors"
                  >
                    {/* Order Controls */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        className="p-1 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <span className="text-[11px] font-bold font-mono text-zinc-500 w-5 text-center">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === assignedItems.length - 1}
                        onClick={() => moveItem(index, "down")}
                        className="p-1 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Thumbnail */}
                    <div className="h-14 w-12 shrink-0 rounded-md bg-zinc-100 overflow-hidden border border-zinc-200">
                      <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-zinc-900 truncate">{p.name}</h4>
                        {p.department && (
                          <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4">
                            {p.department}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span className="font-semibold text-zinc-900">{money(p.price)}</span>
                        {p.mrp && p.mrp > p.price && (
                          <span className="text-[10px] text-zinc-400 line-through">
                            {money(p.mrp)}
                          </span>
                        )}
                        {p.category && <span>· {p.category}</span>}
                        {p.sku && <span className="font-mono text-[10px] text-zinc-400">SKU: {p.sku}</span>}
                      </div>
                    </div>

                    {/* Stock Status */}
                    <div className="hidden sm:block text-right text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stockQuantity > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : "Sold out"}
                      </span>
                    </div>

                    {/* Remove Action */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add Products Dialog */}
      {isAddModalOpen && (
        <AddProductsModal
          collectionDepartment={activeMeta.department}
          alreadyAssignedIds={assignedItems.map((it) => it.productId)}
          onClose={() => setIsAddModalOpen(false)}
          onAddProducts={(selectedProducts) => {
            const currentMaxOrder = assignedItems.length;
            const newItems: FeaturedCollectionProductItem[] = selectedProducts.map((p, idx) => ({
              itemId: `fci_${activeTab}_${p.id}`,
              productId: p.id,
              displayOrder: currentMaxOrder + idx,
              product: p,
            }));
            setAssignedItems([...assignedItems, ...newItems]);
            setIsDirty(true);
            setIsAddModalOpen(false);
            toast.success(`Added ${newItems.length} products to collection. Remember to click Save & Publish.`);
          }}
        />
      )}

      {/* MODAL 2: Live Preview Dialog */}
      {isPreviewModalOpen && (
        <PreviewModal
          collectionTitle={collectionTitle || activeMeta.label}
          collectionDesc={collectionDesc || activeMeta.defaultDescription}
          department={activeMeta.department}
          items={assignedItems}
          onClose={() => setIsPreviewModalOpen(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: Add Products Modal
// -------------------------------------------------------------
function AddProductsModal({
  collectionDepartment,
  alreadyAssignedIds,
  onClose,
  onAddProducts,
}: {
  collectionDepartment: "men" | "women";
  alreadyAssignedIds: string[];
  onClose: () => void;
  onAddProducts: (products: any[]) => void;
}) {
  const searchFn = useServerFn(adminSearchProductsForCollection);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>(collectionDepartment);
  const [selectedMap, setSelectedMap] = useState<Record<string, any>>({});

  const searchQ = useQuery({
    queryKey: ["admin", "search-products-for-col", searchTerm, deptFilter],
    queryFn: () =>
      searchFn({
        data: {
          q: searchTerm.trim() || undefined,
          department: deptFilter !== "all" ? deptFilter : undefined,
          limit: 60,
        },
      }),
  });

  const products = searchQ.data || [];
  const assignedSet = useMemo(() => new Set(alreadyAssignedIds), [alreadyAssignedIds]);

  const toggleSelect = (p: any) => {
    if (assignedSet.has(p.id)) return;
    setSelectedMap((prev) => {
      const copy = { ...prev };
      if (copy[p.id]) {
        delete copy[p.id];
      } else {
        copy[p.id] = p;
      }
      return copy;
    });
  };

  const selectedCount = Object.keys(selectedMap).length;

  const handleConfirm = () => {
    onAddProducts(Object.values(selectedMap));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Add Products to Collection</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select existing products from your database to include in this featured collection.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, category, or SKU…"
              className="pl-9 bg-white text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 cursor-pointer"
            >
              <option value="all">All Departments</option>
              <option value="men">Men's Department</option>
              <option value="women">Women's Department</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
        </div>

        {/* Product Selection List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {searchQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-400">
              No products found matching your search.
            </div>
          ) : (
            products.map((p: any) => {
              const isAlreadyAdded = assignedSet.has(p.id);
              const isSelected = Boolean(selectedMap[p.id]);
              const img = p.images?.[0] || "/placeholder-tee.jpg";

              return (
                <div
                  key={p.id}
                  onClick={() => !isAlreadyAdded && toggleSelect(p)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    isAlreadyAdded
                      ? "opacity-50 bg-zinc-50 border-zinc-200 cursor-not-allowed"
                      : isSelected
                        ? "bg-red-50/70 border-red-500 shadow-xs cursor-pointer"
                        : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 cursor-pointer"
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isAlreadyAdded
                        ? "bg-zinc-200 text-zinc-400"
                        : isSelected
                          ? "bg-red-600 text-white"
                          : "border border-zinc-300 bg-white"
                    }`}
                  >
                    {(isSelected || isAlreadyAdded) && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  {/* Thumbnail */}
                  <div className="h-11 w-10 shrink-0 rounded-md bg-zinc-100 overflow-hidden border border-zinc-200">
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-zinc-900 truncate">{p.name}</h4>
                      {isAlreadyAdded && (
                        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-sm">
                          Already added
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span className="font-semibold text-zinc-900">{money(p.price)}</span>
                      {p.category && <span>· {p.category}</span>}
                      {p.department && (
                        <span className="uppercase text-[9px] text-zinc-400 font-bold">
                          ({p.department})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <span className="text-xs text-zinc-500">
            {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
            >
              Add Selected ({selectedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Component: Live Storefront Preview Modal
// -------------------------------------------------------------
function PreviewModal({
  collectionTitle,
  collectionDesc,
  department,
  items,
  onClose,
}: {
  collectionTitle: string;
  collectionDesc: string;
  department: "men" | "women";
  items: FeaturedCollectionProductItem[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Preview Top Bar */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Storefront Preview: {collectionTitle}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Simulated Storefront Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2 border-b border-zinc-200 pb-6">
              <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-red-600">
                RIOTOUS {department}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-900">
                {collectionTitle}
              </h1>
              <p className="text-sm text-zinc-500 font-normal">{collectionDesc}</p>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((it, idx) => {
                const p = it.product;
                const img = p.images?.[0] || "/placeholder-tee.jpg";
                return (
                  <div
                    key={it.productId}
                    className="group border border-zinc-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="aspect-[4/5] bg-zinc-100 overflow-hidden relative">
                      <img
                        src={img}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                          RIOTOUS
                        </span>
                        <h4 className="text-xs font-bold text-zinc-900 line-clamp-1 mt-0.5">
                          {p.name}
                        </h4>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-900">{money(p.price)}</span>
                        {p.mrp && p.mrp > p.price && (
                          <span className="text-[10px] text-zinc-400 line-through">
                            {money(p.mrp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
          <Button size="sm" onClick={onClose} className="text-xs font-bold bg-zinc-900 text-white">
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}

