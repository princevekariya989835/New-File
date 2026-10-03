import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Gift,
  Percent,
  IndianRupee,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Sliders,
  Filter,
} from "lucide-react";
import {
  adminListAllOffers,
  adminSaveOffer,
  adminToggleOfferStatus,
  adminDeleteOffer,
  adminListProducts,
  type AdminOfferRecord,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createLazyFileRoute("/_authenticated/admin/offers")({
  component: AdminOffersPage,
});

export function AdminOffersPage() {
  const qc = useQueryClient();
  const listOffersFn = useServerFn(adminListAllOffers);
  const saveOfferFn = useServerFn(adminSaveOffer);
  const toggleOfferFn = useServerFn(adminToggleOfferStatus);
  const deleteOfferFn = useServerFn(adminDeleteOffer);
  const listProductsFn = useServerFn(adminListProducts);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "expired">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Partial<AdminOfferRecord> | null>(null);

  // Queries
  const { data: offers = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: () => listOffersFn(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products-for-offers"],
    queryFn: () => listProductsFn(),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<AdminOfferRecord>) => {
      return await saveOfferFn({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(editingOffer?.id ? "Offer updated successfully" : "Offer created successfully");
      setDialogOpen(false);
      setEditingOffer(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save offer");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
      return await toggleOfferFn({ data: { offerId, isActive } });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(vars.isActive ? "Offer enabled" : "Offer disabled");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to toggle offer status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (offerId: string) => {
      return await deleteOfferFn({ data: { offerId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Offer deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete offer");
    },
  });

  // Filtered offers
  const now = new Date();
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        o.title.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)) ||
        (o.promoCode && o.promoCode.toLowerCase().includes(q)) ||
        (o.productName && o.productName.toLowerCase().includes(q));

      if (!matchQuery) return false;

      const isExpired = o.endDate && new Date(o.endDate).getTime() < now.getTime();
      if (statusFilter === "active") return o.isActive && !isExpired;
      if (statusFilter === "disabled") return !o.isActive;
      if (statusFilter === "expired") return isExpired;

      return true;
    });
  }, [offers, search, statusFilter, now]);

  const openCreateDialog = () => {
    setEditingOffer({
      productId: products[0]?.id || "",
      title: "BUY 2 GET 1 FREE",
      description: "Buy any 2 eligible RIOTOUS T-shirts and get 1 additional eligible T-shirt FREE.",
      discountType: "buy_x_get_y",
      discountValue: 1,
      minimumQuantity: 3,
      isActive: true,
      displayOrder: 1,
      termsAndConditions: "Buy 2 Get 1 FREE — Pick your favourites and get one more on us. Add any 3 eligible RIOTOUS T-shirts to your bag and the lowest-priced item will be free automatically at checkout.",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (offer: AdminOfferRecord) => {
    setEditingOffer({ ...offer });
    setDialogOpen(true);
  };

  const handleDelete = (offerId: string, title: string) => {
    if (confirm(`Are you sure you want to delete offer "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(offerId);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Product Offers & Promotions
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Authoritative database source of truth for all product offers, Buy 2 Get 1 Free bundles, and promo codes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={openCreateDialog}
            className="gap-1.5 text-xs h-9 bg-brand-red hover:bg-brand-red/90 text-white font-semibold"
          >
            <Plus className="h-4 w-4" />
            Create Offer
          </Button>
        </div>
      </div>

      {/* METRICS & QUICK SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Offers</p>
          <p className="text-2xl font-black text-foreground mt-1">{offers.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Live</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {offers.filter((o) => o.isActive && (!o.endDate || new Date(o.endDate).getTime() >= now.getTime())).length}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buy X Get Y</p>
          <p className="text-2xl font-black text-foreground mt-1">
            {offers.filter((o) => o.discountType === "buy_x_get_y").length}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disabled / Expired</p>
          <p className="text-2xl font-black text-muted-foreground mt-1">
            {offers.filter((o) => !o.isActive || (o.endDate && new Date(o.endDate).getTime() < now.getTime())).length}
          </p>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, promo code, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-card border-border/80"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-8 text-xs"
          >
            All ({offers.length})
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="h-8 text-xs"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "disabled" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("disabled")}
            className="h-8 text-xs"
          >
            Disabled
          </Button>
          <Button
            variant={statusFilter === "expired" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("expired")}
            className="h-8 text-xs"
          >
            Expired
          </Button>
        </div>
      </div>

      {/* OFFERS TABLE / CARDS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border/80 bg-card">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Loading database offers...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card">
          <Tag className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">No promotional offers found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search || statusFilter !== "all"
              ? "No offers matched your search criteria."
              : "No offers are configured in the database. Product pages will show zero promotional offers until created."}
          </p>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="mt-4 gap-1.5 text-xs bg-brand-red text-white hover:bg-brand-red/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Your First Offer
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Offer Title</th>
                  <th className="py-3 px-4">Type & Details</th>
                  <th className="py-3 px-4">Assigned Product</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOffers.map((o) => {
                  const isExpired = o.endDate && new Date(o.endDate).getTime() < now.getTime();
                  const isFuture = o.startDate && new Date(o.startDate).getTime() > now.getTime();

                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      {/* Title & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {o.discountType === "buy_x_get_y" ? (
                            <Gift className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : o.discountType === "percentage" ? (
                            <Percent className="h-4 w-4 text-brand-red shrink-0" />
                          ) : (
                            <IndianRupee className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <span>{o.title}</span>
                        </div>
                        {o.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 max-w-xs">
                            {o.description}
                          </p>
                        )}
                        {o.promoCode && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-secondary text-foreground border border-border">
                              {o.promoCode}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Type & Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground capitalize">
                          {o.discountType === "buy_x_get_y"
                            ? "Buy X Get Y Free"
                            : o.discountType === "percentage"
                              ? `${o.discountValue}% OFF`
                              : `Flat ₹${o.discountValue} OFF`}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Min items: {o.minimumQuantity} {o.maximumQuantity ? `| Max: ${o.maximumQuantity}` : ""}
                        </p>
                      </td>

                      {/* Assigned Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground max-w-xs truncate">
                          {o.productName}
                        </div>
                        {o.productSlug && (
                          <a
                            href={`/product/${o.productSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-red hover:underline mt-0.5"
                          >
                            <span>View Product Page</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {o.startDate || o.endDate ? (
                          <div className="space-y-0.5">
                            <div>From: {o.startDate ? new Date(o.startDate).toLocaleDateString() : "Immediate"}</div>
                            <div>Until: {o.endDate ? new Date(o.endDate).toLocaleDateString() : "No end date"}</div>
                          </div>
                        ) : (
                          <span className="text-foreground/80 font-medium">Always Active</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate({ offerId: o.id, isActive: !o.isActive })}
                            disabled={toggleMutation.isPending}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              o.isActive ? "bg-emerald-600" : "bg-muted"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                o.isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {isExpired ? (
                              <span className="text-amber-500">Expired</span>
                            ) : isFuture ? (
                              <span className="text-blue-500">Scheduled</span>
                            ) : o.isActive ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Enabled</span>
                            ) : (
                              <span>Disabled</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(o)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(o.id, o.title)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OFFER DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Tag className="h-5 w-5 text-brand-red" />
              {editingOffer?.id ? "Edit Promotional Offer" : "Create New Promotional Offer"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure promotional details, eligibility, discount conditions, and date range in database.
            </DialogDescription>
          </DialogHeader>

          {editingOffer && (
            <div className="space-y-4 py-2 text-xs">
              {/* Target Product */}
              <div>
                <Label className="text-[11px] font-bold">Assign to Product *</Label>
                <select
                  value={editingOffer.productId || ""}
                  onChange={(e) => setEditingOffer({ ...editingOffer, productId: e.target.value })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.price})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  The offer will appear on this product's page and apply during checkout.
                </p>
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold">Offer Title *</Label>
                  <Input
                    placeholder="e.g. BUY 2 GET 1 FREE"
                    value={editingOffer.title || ""}
                    onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold">Offer / Discount Type</Label>
                  <select
                    value={editingOffer.discountType || "buy_x_get_y"}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, discountType: e.target.value as any })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="buy_x_get_y">Buy X Get Y Free</option>
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed_amount">Fixed Amount Discount (₹)</option>
                    <option value="flat_price">Flat Price (₹)</option>
                    <option value="coupon">Coupon Code Only</option>
                  </select>
                </div>
              </div>

              {/* Values & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] font-bold">Discount Value</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="1 (for 1 free) or 20 (for 20%)"
                    value={editingOffer.discountValue ?? 0}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, discountValue: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold">Promo Code (Optional)</Label>
                  <Input
                    placeholder="e.g. RIOTOUS20"
                    value={editingOffer.promoCode || ""}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, promoCode: e.target.value.toUpperCase() })
                    }
                    className="mt-1 h-9 font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold">Min Quantity in Cart</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingOffer.minimumQuantity ?? 1}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, minimumQuantity: parseInt(e.target.value, 10) || 1 })
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold">Start Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={editingOffer.startDate ? editingOffer.startDate.slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        startDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold">End Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={editingOffer.endDate ? editingOffer.endDate.slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        endDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Promotional Description */}
              <div>
                <Label className="text-[11px] font-bold">Promotional Description</Label>
                <Input
                  placeholder="e.g. Buy any 2 eligible RIOTOUS T-shirts and get 1 additional eligible T-shirt FREE."
                  value={editingOffer.description || ""}
                  onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              {/* Terms & Conditions */}
              <div>
                <Label className="text-[11px] font-bold">Terms & Conditions</Label>
                <Textarea
                  placeholder="e.g. Buy 2 Get 1 FREE — Pick your favourites and get one more on us. Add any 3 eligible RIOTOUS T-shirts to your bag..."
                  rows={3}
                  value={editingOffer.termsAndConditions || ""}
                  onChange={(e) => setEditingOffer({ ...editingOffer, termsAndConditions: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
                <div>
                  <p className="font-bold text-xs text-foreground">Enable Offer Immediately</p>
                  <p className="text-[11px] text-muted-foreground">
                    When enabled, this offer appears on the product page and applies at cart/checkout.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={editingOffer.isActive !== false}
                  onChange={(e) => setEditingOffer({ ...editingOffer, isActive: e.target.checked })}
                  className="rounded border-border accent-brand-red h-4 w-4"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saveMutation.isPending || !editingOffer?.title || !editingOffer?.productId}
              onClick={() => editingOffer && saveMutation.mutate(editingOffer)}
              className="text-xs h-9 bg-brand-red hover:bg-brand-red/90 text-white font-semibold"
            >
              {saveMutation.isPending ? "Saving..." : "Save Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
