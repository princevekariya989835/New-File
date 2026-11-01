import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  type AdminCategory,
} from "@/lib/admin.functions";
import { uploadProductImage } from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, FolderPlus, Upload, ImageIcon, Layers, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({
    meta: [
      { title: "Category Management | RIOTOUS Admin Console" },
      { name: "description", content: "Manage store product categories for Men, Women, and Unisex collections." },
    ],
  }),
  component: CategoriesPage,
});

type CategoryFormData = {
  id?: string;
  name: string;
  slug: string;
  department: "men" | "women" | "unisex";
  description: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
};

const EMPTY_CAT_FORM: CategoryFormData = {
  name: "",
  slug: "",
  department: "unisex",
  description: "",
  imageUrl: "",
  displayOrder: 0,
  isActive: true,
};

function CategoriesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCategories);
  const createFn = useServerFn(adminCreateCategory);
  const updateFn = useServerFn(adminUpdateCategory);
  const deleteFn = useServerFn(adminDeleteCategory);

  const [deptFilter, setDeptFilter] = useState<"ALL" | "men" | "women" | "unisex">("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryFormData | null>(null);
  const [deletingCat, setDeletingCat] = useState<AdminCategory | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const categoriesQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => listFn(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const createMut = useMutation({
    mutationFn: (data: CategoryFormData) => createFn({ data }),
    onSuccess: () => {
      toast.success("Category created successfully");
      refresh();
      setFormOpen(false);
      setEditingCat(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: CategoryFormData) => updateFn({ data: { ...data, id: data.id! } }),
    onSuccess: () => {
      toast.success("Category updated successfully");
      refresh();
      setFormOpen(false);
      setEditingCat(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      refresh();
      setDeletingCat(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = useMemo(
    () => (Array.isArray(categoriesQ.data) ? categoriesQ.data : []),
    [categoriesQ.data],
  );

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      if (deptFilter !== "ALL" && c.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categories, deptFilter, search]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCat) return;
    setUploadingImg(true);
    try {
      const url = await uploadProductImage(file);
      if (url) {
        setEditingCat((prev) => (prev ? { ...prev, imageUrl: url } : null));
        toast.success("Category image uploaded");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenNew = () => {
    setEditingCat({ ...EMPTY_CAT_FORM, department: deptFilter === "ALL" ? "unisex" : deptFilter });
    setFormOpen(true);
  };

  const handleOpenEdit = (c: AdminCategory) => {
    setEditingCat({
      id: c.id,
      name: c.name,
      slug: c.slug,
      department: c.department,
      description: c.description || "",
      imageUrl: c.imageUrl || "",
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    });
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (editingCat.id) {
      updateMut.mutate(editingCat);
    } else {
      createMut.mutate(editingCat);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category Management</h1>
          <p className="text-sm text-muted-foreground">
            Organize products into curated categories across Men, Women, and Unisex storefronts.
          </p>
        </div>
        <Button className="gap-2 bg-brand-red text-white hover:bg-brand-red/90" onClick={handleOpenNew}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={deptFilter === "ALL" ? "default" : "outline"}
            onClick={() => setDeptFilter("ALL")}
            className="text-xs"
          >
            All Departments ({categories.length})
          </Button>
          <Button
            size="sm"
            variant={deptFilter === "men" ? "default" : "outline"}
            onClick={() => setDeptFilter("men")}
            className="text-xs"
          >
            Men ({categories.filter((c) => c.department === "men").length})
          </Button>
          <Button
            size="sm"
            variant={deptFilter === "women" ? "default" : "outline"}
            onClick={() => setDeptFilter("women")}
            className="text-xs"
          >
            Women ({categories.filter((c) => c.department === "women").length})
          </Button>
          <Button
            size="sm"
            variant={deptFilter === "unisex" ? "default" : "outline"}
            onClick={() => setDeptFilter("unisex")}
            className="text-xs"
          >
            Unisex ({categories.filter((c) => c.department === "unisex").length})
          </Button>
        </div>

        <Input
          placeholder="Filter categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full sm:w-56 text-xs"
        />
      </div>

      {/* Categories Grid / Table */}
      {categoriesQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border bg-card p-4 animate-pulse space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : categoriesQ.isError ? (
        <div className="p-6 text-center text-destructive">
          {(categoriesQ.error as Error)?.message ?? "Failed to load categories"}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <FolderPlus className="mx-auto h-12 w-12 stroke-[1.5] opacity-40 mb-3" />
          <p className="font-semibold text-foreground">No categories found</p>
          <p className="text-xs mt-1">Get started by creating a new category for your storefront.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={handleOpenNew}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 shadow-xs transition hover:border-foreground/30 hover:shadow-md"
            >
              <div>
                {/* Category Card Header & Image */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                        cat.department === "women"
                          ? "bg-rose-500/90 text-white border-transparent"
                          : cat.department === "men"
                          ? "bg-blue-600/90 text-white border-transparent"
                          : "bg-purple-600/90 text-white border-transparent"
                      }`}
                    >
                      {cat.department}
                    </Badge>
                    <Badge
                      variant={cat.isActive ? "default" : "secondary"}
                      className="text-[10px] font-semibold"
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold text-base leading-snug">{cat.name}</h3>
                    <span className="text-[11px] text-muted-foreground">Order: #{cat.displayOrder}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 font-mono mt-0.5">/{cat.slug}</p>
                  {cat.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={() => handleOpenEdit(cat)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeletingCat(cat)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Dialog Modal */}
      {formOpen && editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg">
                {editingCat.id ? `Edit Category · ${editingCat.name}` : "Create New Category"}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setFormOpen(false);
                  setEditingCat(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Category Name *</Label>
                  <Input
                    value={editingCat.name}
                    onChange={(e) =>
                      setEditingCat((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: e.target.value,
                              slug: prev.id ? prev.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                            }
                          : null
                      )
                    }
                    placeholder="e.g. Oversized Tees, Baby Tees, Hoodies"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Slug (URL handle)</Label>
                  <Input
                    value={editingCat.slug}
                    onChange={(e) =>
                      setEditingCat((prev) => (prev ? { ...prev, slug: e.target.value } : null))
                    }
                    placeholder="e.g. oversized-tees"
                    className="mt-1 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Department *</Label>
                  <select
                    value={editingCat.department}
                    onChange={(e) =>
                      setEditingCat((prev) =>
                        prev ? { ...prev, department: e.target.value as "men" | "women" | "unisex" } : null
                      )
                    }
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    required
                  >
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                    <option value="unisex">Unisex (Both Men &amp; Women)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea
                    value={editingCat.description}
                    onChange={(e) =>
                      setEditingCat((prev) => (prev ? { ...prev, description: e.target.value } : null))
                    }
                    placeholder="Brief description of the collection or category..."
                    className="mt-1 text-xs"
                    rows={2}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Category Banner / Image</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <Input
                      value={editingCat.imageUrl}
                      onChange={(e) =>
                        setEditingCat((prev) => (prev ? { ...prev, imageUrl: e.target.value } : null))
                      }
                      placeholder="Image URL or upload below..."
                      className="text-xs"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImg}
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingImg ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {editingCat.imageUrl && (
                    <div className="mt-2 relative aspect-video w-32 overflow-hidden rounded-md border bg-muted">
                      <img
                        src={editingCat.imageUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingCat((prev) => (prev ? { ...prev, imageUrl: "" } : null))
                        }
                        className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold">Display Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingCat.displayOrder}
                    onChange={(e) =>
                      setEditingCat((prev) =>
                        prev ? { ...prev, displayOrder: Math.max(0, parseInt(e.target.value) || 0) } : null
                      )
                    }
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Lower numbers display first</p>
                </div>

                <div className="flex flex-col justify-center pt-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingCat.isActive}
                      onChange={(e) =>
                        setEditingCat((prev) => (prev ? { ...prev, isActive: e.target.checked } : null))
                      }
                      className="h-4 w-4 rounded border-border accent-foreground"
                    />
                    <span>Active on Storefront</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingCat(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="bg-brand-red text-white hover:bg-brand-red/90"
                >
                  {isSaving ? "Saving..." : editingCat.id ? "Save Changes" : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold">Delete Category</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete category{" "}
              <span className="font-semibold text-foreground">"{deletingCat.name}"</span>?
            </p>
            {deletingCat.productCount > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-500">
                Warning: This category currently has{" "}
                <strong>{deletingCat.productCount} product(s)</strong> assigned to it.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCat(null)}
                disabled={deleteMut.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deletingCat.id)}
              >
                {deleteMut.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

