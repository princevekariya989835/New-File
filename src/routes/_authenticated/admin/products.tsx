import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  adminListProducts,
  adminDeleteProduct,
  adminSetProductStatus,
  adminCreateProduct,
  adminUpdateProduct,
  adminBulkUpdateDepartment,
  type AdminProduct,
} from "@/lib/admin.functions";
import { broadcastCatalogUpdate } from "@/lib/catalog-sync";
import { ARCHIVED_TAG, ProductForm } from "@/components/admin/product-ui";
import { money } from "@/components/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
<<<<<<< HEAD
import { Pencil, Plus, Trash2, ArrowRightLeft, CheckSquare, Square, Check, X, ShieldAlert } from "lucide-react";
=======
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
>>>>>>> 2e4fc30eb76ab4ab444db0a5117c250fd34c5de6
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Product Catalog Management | RIOTOUS Admin Console" },
      { name: "description", content: "Manage store products, variants, pricing, and inventory across Men, Women, and Unisex collections." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProducts);
  const deleteFn = useServerFn(adminDeleteProduct);
  const statusFn = useServerFn(adminSetProductStatus);
  const createFn = useServerFn(adminCreateProduct);
  const updateFn = useServerFn(adminUpdateProduct);
  const bulkDeptFn = useServerFn(adminBulkUpdateDepartment);

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<"ALL" | "men" | "women" | "unisex">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DRAFT">("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkTargetDept, setBulkTargetDept] = useState<"men" | "women" | "unisex">("women");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const productsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listFn(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["admin", "variants"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin-website-state"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
    qc.invalidateQueries({ queryKey: ["website-config"] });
    setSelectedProductIds([]);
  };

  const del = useMutation({
    mutationFn: (productId: string) => deleteFn({ data: { productId } }),
    onSuccess: (res, productId) => {
      toast.success(
        res?.archived
          ? "Product archived (history preserved for existing orders)"
          : "Product deleted",
      );
      broadcastCatalogUpdate({ type: "PRODUCT_DELETED", productId, timestamp: Date.now() });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: (p: { productId: string; status: "ACTIVE" | "DRAFT" }) => statusFn({ data: p }),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "ACTIVE" ? "Product published" : "Product moved to draft");
      broadcastCatalogUpdate({
        type: "PRODUCT_STATUS_CHANGED",
        productId: variables.productId,
        status: variables.status,
        timestamp: Date.now(),
      });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkTransferMut = useMutation({
    mutationFn: async ({ productIds, department }: { productIds: string[]; department: "men" | "women" | "unisex" }) => {
      return await bulkDeptFn({ data: { productIds, department } });
    },
    onSuccess: (res) => {
      toast.success(`Successfully moved ${res?.count || selectedProductIds.length} products to ${bulkTargetDept.toUpperCase()}`);
      broadcastCatalogUpdate({
        type: "CATALOG_MUTATION",
        mutationType: "BULK_DEPARTMENT_UPDATE",
        timestamp: Date.now(),
      });
      refresh();
      setShowBulkConfirm(false);
      setSelectedProductIds([]);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to transfer products"),
  });

  const products = useMemo(
    () => (Array.isArray(productsQ.data) ? productsQ.data : []),
    [productsQ.data],
  );

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])).sort(),
    [products],
  );

  const visible = useMemo(
    () =>
      products.filter((p) => {
        if (departmentFilter !== "ALL" && (p.department || "men") !== departmentFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchId = p.id.toLowerCase().includes(q);
          const matchCat = (p.category || "").toLowerCase().includes(q);
          if (!matchTitle && !matchId && !matchCat) return false;
        }
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
        if (stockFilter === "IN_STOCK" && p.totalInventory <= 0) return false;
        if (stockFilter === "OUT_OF_STOCK" && p.totalInventory > 0) return false;
        if (categoryFilter !== "ALL" && (p.category ?? "") !== categoryFilter) return false;
        return true;
      }),
    [products, departmentFilter, search, statusFilter, stockFilter, categoryFilter],
  );

  const handleSelectAll = () => {
    if (selectedProductIds.length === visible.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(visible.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Catalog Management</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} product(s) · {products.filter((p) => p.status === "ACTIVE").length} live · {products.filter((p) => (p.department || "men") === "men").length} Men · {products.filter((p) => p.department === "women").length} Women · {products.filter((p) => p.department === "unisex").length} Unisex
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!creating && !editing && (
            <Button className="gap-2 bg-brand-red text-white hover:bg-brand-red/90" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New product
            </Button>
          )}
          <AdminEraseDataButton
            section="products"
            sectionLabel="Products & Catalog"
            onSuccess={() => refresh()}
          />
        </div>
      </div>

      {/* Product Creation Form */}
      {creating && (
        <ProductForm
          heading="New Product"
          submitLabel="Create Product"
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => {
            const res = await createFn({ data: { ...values, stock: Number(values.stock) || 0 } });
            toast.success("Product created successfully");
            broadcastCatalogUpdate({
              type: "PRODUCT_CREATED",
              productId: res?.productId || "",
              timestamp: Date.now(),
            });
            refresh();
            setCreating(false);
          }}
        />
      )}

      {/* Product Edit Form */}
      {editing && (
        <ProductForm
          heading={`Edit · ${editing.title}`}
          submitLabel="Save Changes"
          initial={{
            title: editing.title,
            description: editing.description ?? "",
            detailsHtml: editing.detailsHtml ?? "",
            highlights: (editing.highlights ?? []).map((h) => ({
              id: h.id,
              imageUrl: h.imageUrl,
              title: h.title ?? "",
              description: h.description ?? "",
              displayOrder: h.displayOrder,
              isActive: h.isActive !== false,
            })),
            specifications: (editing.specifications ?? []).map((s) => ({
              id: s.label,
              label: s.label,
              value: s.value,
              displayOrder: s.displayOrder,
              isActive: s.isActive !== false,
            })),
            price: editing.price,
            mrp: editing.mrp != null ? String(editing.mrp) : "",
            isTaxInclusive: editing.isTaxInclusive !== false,
            offers: editing.offers ?? [],
            features: editing.features ?? [],
            careInstructions: editing.careInstructions ?? [],
            manufacturingInfo: editing.manufacturingInfo,
            sizeMeasurements: editing.sizeMeasurements ?? [],
            category: editing.category ?? "",
            subcategory: editing.subcategory ?? "",
            collection: editing.collection ?? "",
            department: editing.department || "men",
            isFeatured: Boolean(editing.isFeatured),
            images: editing.images,
            colors: editing.colors,
            colorVariants: editing.colorVariants ?? [],
            sizes: editing.sizes,
            tags: editing.tags.filter((t) => t !== ARCHIVED_TAG),
            stock: String(editing.totalInventory),
            sizeStock: editing.sizeStock,
            isActive: editing.status === "ACTIVE",
            sku: editing.sku ?? "",
            slug: editing.slug ?? "",
            frontShowcaseImage: editing.frontShowcaseImage ?? "",
            backShowcaseImage: editing.backShowcaseImage ?? "",
            frontShowcaseTitle: editing.frontShowcaseTitle ?? "FRONT",
            frontShowcaseSubtitle: editing.frontShowcaseSubtitle ?? "Minimal & Clean",
            backShowcaseTitle: editing.backShowcaseTitle ?? "BACK",
            backShowcaseSubtitle: editing.backShowcaseSubtitle ?? "Bold Statement",
          }}
          onCancel={() => setEditing(null)}
          onSubmit={async (values) => {
            await updateFn({
              data: {
                ...values,
                stock: Number(values.stock) || 0,
                productId: editing.id,
              },
            });
            toast.success("Product updated successfully");
            broadcastCatalogUpdate({
              type: "PRODUCT_UPDATED",
              productId: editing.id,
              timestamp: Date.now(),
            });
            refresh();
            setEditing(null);
          }}
        />
      )}

      {/* Filter and Search Navigation Bar */}
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        {/* Department Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
          <Button
            size="sm"
            variant={departmentFilter === "ALL" ? "default" : "outline"}
            onClick={() => setDepartmentFilter("ALL")}
            className="text-xs"
          >
            All Products ({products.length})
          </Button>
          <Button
            size="sm"
            variant={departmentFilter === "men" ? "default" : "outline"}
            onClick={() => setDepartmentFilter("men")}
            className="text-xs"
          >
            Men's Collection ({products.filter((p) => (p.department || "men") === "men").length})
          </Button>
          <Button
            size="sm"
            variant={departmentFilter === "women" ? "default" : "outline"}
            onClick={() => setDepartmentFilter("women")}
            className="text-xs"
          >
            Women's Collection ({products.filter((p) => p.department === "women").length})
          </Button>
          <Button
            size="sm"
            variant={departmentFilter === "unisex" ? "default" : "outline"}
            onClick={() => setDepartmentFilter("unisex")}
            className="text-xs"
          >
            Unisex ({products.filter((p) => p.department === "unisex").length})
          </Button>
        </div>

        {/* Filters and Search row */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name, ID, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-64 text-xs"
          />

          <select
            className="h-9 rounded-md border bg-background px-2.5 text-xs shadow-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="ALL">All Publication Statuses</option>
            <option value="ACTIVE">Published (Active)</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            className="h-9 rounded-md border bg-background px-2.5 text-xs shadow-xs"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock (&gt; 0)</option>
            <option value="OUT_OF_STOCK">Out of Stock (= 0)</option>
          </select>

          <select
            className="h-9 rounded-md border bg-background px-2.5 text-xs shadow-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(search || statusFilter !== "ALL" || stockFilter !== "ALL" || categoryFilter !== "ALL" || departmentFilter !== "ALL") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-9"
              onClick={() => {
                setSearch("");
                setDepartmentFilter("ALL");
                setStatusFilter("ALL");
                setStockFilter("ALL");
                setCategoryFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Sticky Bar (Appears when items are selected) */}
      {selectedProductIds.length > 0 && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-red/30 bg-card p-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-brand-red text-white text-xs font-bold">
              {selectedProductIds.length} Selected
            </Badge>
            <span className="text-xs text-muted-foreground">
              Bulk Department Transfer
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold">Move to:</span>
            <select
              value={bulkTargetDept}
              onChange={(e) => setBulkTargetDept(e.target.value as any)}
              className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
            >
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>

            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-brand-red text-white hover:bg-brand-red/90"
              onClick={() => setShowBulkConfirm(true)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer {selectedProductIds.length} Product(s)
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setSelectedProductIds([])}
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Product Table Header with Select All */}
      <div className="flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 hover:text-foreground transition"
          >
            {visible.length > 0 && selectedProductIds.length === visible.length ? (
              <CheckSquare className="h-4 w-4 text-brand-red" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Select All Visible ({visible.length})</span>
          </button>
        </div>
        <div className="text-xs">
          Showing {visible.length} of {products.length} products
        </div>
      </div>

      {/* Product List Table / Rows */}
      {productsQ.isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-48 rounded" />
                  <Skeleton className="h-3.5 w-36 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : productsQ.isError ? (
        <p className="text-destructive">
          {(productsQ.error as Error)?.message ?? "Could not load products"}
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-semibold text-foreground">No products match your filters.</p>
          <p className="text-xs mt-1">Try resetting the department or status filters above.</p>
        </div>
      ) : (
<<<<<<< HEAD
        <div className="space-y-2.5">
          {visible.map((p) => {
            const isSelected = selectedProductIds.includes(p.id);
            const dept = (p.department || "men").toLowerCase();
            const isOutOfStock = p.totalInventory <= 0;

            return (
              <div
                key={p.id}
                className={`flex flex-col gap-4 rounded-xl border bg-card p-3.5 transition lg:flex-row lg:items-center ${
                  isSelected ? "border-brand-red/50 bg-brand-red/[0.02]" : "hover:border-foreground/30"
                }`}
              >
                {/* Row Checkbox & Media */}
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(p.id)}
                    className="p-1 text-muted-foreground hover:text-foreground transition"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-brand-red" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  {p.featuredImage ? (
                    <img
                      src={p.featuredImage}
                      alt={p.title}
                      className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover border"
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-muted border flex items-center justify-center text-xs text-muted-foreground">
                      No img
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold text-sm">{p.title}</span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        #{p.id}
                      </span>
                      {p.isFeatured && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                          Featured
                        </Badge>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {/* Department Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          dept === "women"
                            ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                            : dept === "men"
                            ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                            : "bg-purple-500/15 text-purple-500 border-purple-500/30"
                        }`}
                      >
                        {dept}
                      </Badge>

                      {p.category && (
                        <span className="font-medium text-foreground">
                          {p.category} {p.subcategory ? `› ${p.subcategory}` : ""}
                        </span>
                      )}

                      <span>·</span>

                      {/* Pricing */}
                      <span className="font-bold text-foreground">{money(p.price)}</span>
                      {p.mrp && Number(p.mrp) > Number(p.price) && (
                        <>
                          <span className="line-through text-muted-foreground/70 text-[11px]">
                            {money(p.mrp)}
                          </span>
                          <span className="rounded bg-emerald-500/15 px-1 py-0.2 text-[10px] font-bold text-emerald-500">
                            {Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100)}% OFF
                          </span>
                        </>
                      )}

                      <span>·</span>

                      {/* Stock Status */}
                      <span
                        className={`font-semibold ${
                          isOutOfStock ? "text-destructive font-bold" : "text-emerald-500"
                        }`}
                      >
                        {isOutOfStock ? "Out of stock" : `Stock: ${p.totalInventory}`}
                      </span>
                    </div>

                    {/* Sizes and Colors Badges */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {p.sizes.map((s) => (
                        <Badge key={`s-${s}`} variant="outline" className="text-[10px] px-1.5 py-0">
                          {s}
                        </Badge>
                      ))}
                      {p.colors.map((c) => (
                        <Badge key={`c-${c}`} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"} className="text-xs font-semibold">
                    {p.tags.includes(ARCHIVED_TAG) ? "ARCHIVED" : p.status}
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setCreating(false);
                      setEditing(p);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() =>
                      toggleStatus.mutate({
                        productId: p.id,
                        status: p.status === "ACTIVE" ? "DRAFT" : "ACTIVE",
                      })
                    }
                  >
                    {p.status === "ACTIVE" ? "Unpublish" : "Publish"}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingProduct(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
=======
        <div className="space-y-3">
          {visible.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {p.featuredImage ? (
                  <img
                    src={p.featuredImage}
                    alt={p.title}
                    className="h-16 w-16 rounded bg-muted object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{money(p.price)}</span>
                    {p.mrp && Number(p.mrp) > Number(p.price) && (
                      <>
                        <span className="line-through text-muted-foreground/75">
                          MRP: {money(p.mrp)}
                        </span>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                          {Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100)}% OFF
                        </span>
                      </>
                    )}
                    <span>{p.category ? ` · ${p.category}` : ""} · Stock: {p.totalInventory}</span>
                    {p.sku && (
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        SKU: {p.sku}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.sizes.map((s) => (
                      <Badge key={`s-${s}`} variant="outline" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                    {p.colors.map((c) => (
                      <Badge key={`c-${c}`} variant="secondary" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/inventory"
                      className="inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Manage size / colour stock →
                    </Link>
                    <a
                      href={`/product/${p.slug || p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View on store
                    </a>
                  </div>
>>>>>>> 2e4fc30eb76ab4ab444db0a5117c250fd34c5de6
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Transfer Confirmation Dialog */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Confirm Bulk Transfer</h3>
                <p className="text-xs text-muted-foreground">Batch move products between departments</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to transfer{" "}
              <span className="font-bold text-brand-red">{selectedProductIds.length} product(s)</span> to the{" "}
              <span className="font-bold uppercase text-foreground">{bulkTargetDept}</span> department?
            </p>

            <div className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Preserves existing product IDs &amp; URLs
              </p>
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Preserves inventory, sizes &amp; past orders
              </p>
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Instantly updates storefront collections
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkTransferMut.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-brand-red text-white hover:bg-brand-red/90"
                disabled={bulkTransferMut.isPending}
                onClick={() =>
                  bulkTransferMut.mutate({
                    productIds: selectedProductIds,
                    department: bulkTargetDept,
                  })
                }
              >
                {bulkTransferMut.isPending ? "Transferring..." : "Confirm & Transfer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold">Delete Product</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">"{deletingProduct.title}"</span>? This
              will permanently remove the product and its variants, images, and reviews from the
              database. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingProduct(null)}
                disabled={del.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={del.isPending}
                onClick={() => {
                  del.mutate(deletingProduct.id, {
                    onSuccess: () => {
                      setDeletingProduct(null);
                    },
                  });
                }}
              >
                {del.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
