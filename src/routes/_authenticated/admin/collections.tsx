import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  adminListCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
  type AdminCollection,
} from "@/lib/admin.functions";
import { uploadProductImage } from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, FolderPlus, Upload, ImageIcon, X, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/collections")({
  head: () => ({
    meta: [
      { title: "Collections Management | RIOTOUS Admin Console" },
      { name: "description", content: "Manage seasonal and themed product collections across Men, Women, and Unisex storefronts." },
    ],
  }),
  component: CollectionsPage,
});

type CollectionFormData = {
  id?: string;
  name: string;
  slug: string;
  department: "men" | "women" | "unisex";
  description: string;
  imageUrl: string;
  bannerUrl: string;
  displayOrder: number;
  isActive: boolean;
};

const EMPTY_COL_FORM: CollectionFormData = {
  name: "",
  slug: "",
  department: "unisex",
  description: "",
  imageUrl: "",
  bannerUrl: "",
  displayOrder: 0,
  isActive: true,
};

function CollectionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCollections);
  const createFn = useServerFn(adminCreateCollection);
  const updateFn = useServerFn(adminUpdateCollection);
  const deleteFn = useServerFn(adminDeleteCollection);

  const [deptFilter, setDeptFilter] = useState<"ALL" | "men" | "women" | "unisex">("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<CollectionFormData | null>(null);
  const [deletingCol, setDeletingCol] = useState<AdminCollection | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const collectionsQ = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: () => listFn(),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "collections"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["collections"] });
  };

  const createMut = useMutation({
    mutationFn: (data: CollectionFormData) => createFn({ data }),
    onSuccess: () => {
      toast.success("Collection created successfully");
      refresh();
      setFormOpen(false);
      setEditingCol(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: CollectionFormData) => updateFn({ data: { ...data, id: data.id! } }),
    onSuccess: () => {
      toast.success("Collection updated successfully");
      refresh();
      setFormOpen(false);
      setEditingCol(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Collection deleted");
      refresh();
      setDeletingCol(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const collections = useMemo(
    () => (Array.isArray(collectionsQ.data) ? collectionsQ.data : []),
    [collectionsQ.data],
  );

  const filtered = useMemo(() => {
    return collections.filter((c) => {
      if (deptFilter !== "ALL" && c.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [collections, deptFilter, search]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isBanner = false) => {
    const file = e.target.files?.[0];
    if (!file || !editingCol) return;
    if (isBanner) setUploadingBanner(true);
    else setUploadingImg(true);

    try {
      const url = await uploadProductImage(file);
      if (url) {
        setEditingCol((prev) =>
          prev ? { ...prev, [isBanner ? "bannerUrl" : "imageUrl"]: url } : null
        );
        toast.success(isBanner ? "Banner uploaded" : "Image uploaded");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      if (isBanner) {
        setUploadingBanner(false);
        if (bannerInputRef.current) bannerInputRef.current.value = "";
      } else {
        setUploadingImg(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenNew = () => {
    setEditingCol({ ...EMPTY_COL_FORM, department: deptFilter === "ALL" ? "unisex" : deptFilter });
    setFormOpen(true);
  };

  const handleOpenEdit = (c: AdminCollection) => {
    setEditingCol({
      id: c.id,
      name: c.name,
      slug: c.slug,
      department: c.department,
      description: c.description || "",
      imageUrl: c.imageUrl || "",
      bannerUrl: c.bannerUrl || "",
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    });
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCol || !editingCol.name.trim()) {
      toast.error("Collection name is required");
      return;
    }
    if (editingCol.id) {
      updateMut.mutate(editingCol);
    } else {
      createMut.mutate(editingCol);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collection Management</h1>
          <p className="text-sm text-muted-foreground">
            Curate thematic product drops, editorial features, and seasonal campaigns.
          </p>
        </div>
        <Button className="gap-2 bg-brand-red text-white hover:bg-brand-red/90" onClick={handleOpenNew}>
          <Plus className="h-4 w-4" /> Add Collection
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
            All ({collections.length})
          </Button>
          <Button
            size="sm"
            variant={deptFilter === "men" ? "default" : "outline"}
            onClick={() => setDeptFilter("men")}
            className="text-xs"
          >
            Men ({collections.filter((c) => c.department === "men").length})
          </Button>
          <Button
            size="sm"
            variant={deptFilter === "women" ? "default" : "outline"}
            onClick={() => setDeptFilter("women")}
            className="text-xs"
          >
            Women ({collections.filter((c) => c.department === "women").length})
          </Button>
          <Button
            size="sm"
            variant={deptFilter === "unisex" ? "default" : "outline"}
            onClick={() => setDeptFilter("unisex")}
            className="text-xs"
          >
            Unisex ({collections.filter((c) => c.department === "unisex").length})
          </Button>
        </div>

        <Input
          placeholder="Filter collections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full sm:w-56 text-xs"
        />
      </div>

      {/* Collections Grid */}
      {collectionsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border bg-card p-4 animate-pulse space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : collectionsQ.isError ? (
        <div className="p-6 text-center text-destructive">
          {(collectionsQ.error as Error)?.message ?? "Failed to load collections"}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <Sparkles className="mx-auto h-12 w-12 stroke-[1.5] opacity-40 mb-3" />
          <p className="font-semibold text-foreground">No collections found</p>
          <p className="text-xs mt-1">Create your first collection to group products into drops or lookbooks.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={handleOpenNew}>
            <Plus className="h-4 w-4" /> Add Collection
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((col) => (
            <div
              key={col.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 shadow-xs transition hover:border-foreground/30 hover:shadow-md"
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
                  {col.imageUrl || col.bannerUrl ? (
                    <img
                      src={col.imageUrl || col.bannerUrl || ""}
                      alt={col.name}
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
                        col.department === "women"
                          ? "bg-rose-500/90 text-white border-transparent"
                          : col.department === "men"
                          ? "bg-blue-600/90 text-white border-transparent"
                          : "bg-purple-600/90 text-white border-transparent"
                      }`}
                    >
                      {col.department}
                    </Badge>
                    <Badge
                      variant={col.isActive ? "default" : "secondary"}
                      className="text-[10px] font-semibold"
                    >
                      {col.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {col.productCount} {col.productCount === 1 ? "Product" : "Products"}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold text-base">{col.name}</h3>
                    <span className="text-[11px] text-muted-foreground">Order: #{col.displayOrder}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 font-mono mt-0.5">/{col.slug}</p>
                  {col.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {col.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={() => handleOpenEdit(col)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeletingCol(col)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Collection Dialog Modal */}
      {formOpen && editingCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg">
                {editingCol.id ? `Edit Collection · ${editingCol.name}` : "Create New Collection"}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setFormOpen(false);
                  setEditingCol(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Collection Name *</Label>
                  <Input
                    value={editingCol.name}
                    onChange={(e) =>
                      setEditingCol((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: e.target.value,
                              slug: prev.id ? prev.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                            }
                          : null
                      )
                    }
                    placeholder="e.g. Summer Drop, Anime Series, Dark Fantasy"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Slug (URL handle)</Label>
                  <Input
                    value={editingCol.slug}
                    onChange={(e) =>
                      setEditingCol((prev) => (prev ? { ...prev, slug: e.target.value } : null))
                    }
                    placeholder="e.g. summer-drop"
                    className="mt-1 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Department *</Label>
                  <select
                    value={editingCol.department}
                    onChange={(e) =>
                      setEditingCol((prev) =>
                        prev ? { ...prev, department: e.target.value as "men" | "women" | "unisex" } : null
                      )
                    }
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    required
                  >
                    <option value="unisex">Unisex (Both Men &amp; Women)</option>
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea
                    value={editingCol.description}
                    onChange={(e) =>
                      setEditingCol((prev) => (prev ? { ...prev, description: e.target.value } : null))
                    }
                    placeholder="Editorial statement or theme description..."
                    className="mt-1 text-xs"
                    rows={2}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Cover Image</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <Input
                      value={editingCol.imageUrl}
                      onChange={(e) =>
                        setEditingCol((prev) => (prev ? { ...prev, imageUrl: e.target.value } : null))
                      }
                      placeholder="Image URL or upload..."
                      className="text-xs"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleImageFileChange(e, false)}
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
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Hero Banner (Optional)</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <Input
                      value={editingCol.bannerUrl}
                      onChange={(e) =>
                        setEditingCol((prev) => (prev ? { ...prev, bannerUrl: e.target.value } : null))
                      }
                      placeholder="Banner URL or upload..."
                      className="text-xs"
                    />
                    <input
                      type="file"
                      ref={bannerInputRef}
                      onChange={(e) => handleImageFileChange(e, true)}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingBanner}
                      onClick={() => bannerInputRef.current?.click()}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingBanner ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Display Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingCol.displayOrder}
                    onChange={(e) =>
                      setEditingCol((prev) =>
                        prev ? { ...prev, displayOrder: Math.max(0, parseInt(e.target.value) || 0) } : null
                      )
                    }
                    className="mt-1 text-xs"
                  />
                </div>

                <div className="flex flex-col justify-center pt-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingCol.isActive}
                      onChange={(e) =>
                        setEditingCol((prev) => (prev ? { ...prev, isActive: e.target.checked } : null))
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
                    setEditingCol(null);
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
                  {isSaving ? "Saving..." : editingCol.id ? "Save Changes" : "Create Collection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold">Delete Collection</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete collection{" "}
              <span className="font-semibold text-foreground">"{deletingCol.name}"</span>?
            </p>
            {deletingCol.productCount > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-500">
                Warning: This collection currently has{" "}
                <strong>{deletingCol.productCount} product(s)</strong> assigned to it.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCol(null)}
                disabled={deleteMut.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deletingCol.id)}
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

