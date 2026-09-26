import { createLazyFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Search,
  Percent,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Copy,
  Check,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  Tag,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Users,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  adminListCoupons,
  adminGetCouponStats,
  adminGetCouponById,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminToggleCouponActive,
  adminDeleteCoupon,
  type CouponRecord,
  type CouponStatus,
  type DiscountType,
  type CouponAppliesTo,
  type AdminCouponInput,
} from "@/lib/coupons.functions";
import { adminListProducts } from "@/lib/admin.functions";
import { money, dateTime } from "@/components/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createLazyFileRoute("/_authenticated/admin/coupons")({ component: AdminCouponsPage });

const PRESET_CATEGORIES = [
  "Oversized Tees",
  "Essential Tees",
  "Classic Tees",
  "Heavyweight Tees",
  "Graphic Tees",
  "Hoodies & Sweatshirts",
  "Custom Design",
];

const STATUS_CONFIG: Record<
  CouponStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  Active: { label: "Active", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  Scheduled: { label: "Scheduled", icon: Clock, tone: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  Expired: { label: "Expired", icon: AlertTriangle, tone: "bg-muted text-muted-foreground border-border" },
  Disabled: { label: "Disabled", icon: Ban, tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

function AdminCouponsPage() {
  const qc = useQueryClient();

  const listCouponsFn = useServerFn(adminListCoupons);
  const getStatsFn = useServerFn(adminGetCouponStats);
  const getByIdFn = useServerFn(adminGetCouponById);
  const createCouponFn = useServerFn(adminCreateCoupon);
  const updateCouponFn = useServerFn(adminUpdateCoupon);
  const toggleActiveFn = useServerFn(adminToggleCouponActive);
  const deleteCouponFn = useServerFn(adminDeleteCoupon);
  const listProductsFn = useServerFn(adminListProducts);

  // Queries
  const { data: coupons = [], isLoading: loadingCoupons } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => listCouponsFn(),
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin", "coupon-stats"],
    queryFn: () => getStatsFn(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products-for-coupons"],
    queryFn: () => listProductsFn(),
    staleTime: 5 * 60 * 1000,
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "expiry" | "usage">("newest");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number>(0);
  const [hasMaxDiscount, setHasMaxDiscount] = useState(false);
  const [maximumDiscount, setMaximumDiscount] = useState<number | "">("");
  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [usageLimit, setUsageLimit] = useState<number | "">("");
  const [usagePerCustomer, setUsagePerCustomer] = useState<number>(1);
  const [startsAt, setStartsAt] = useState("");
  const [hasExpiry, setHasExpiry] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [appliesTo, setAppliesTo] = useState<CouponAppliesTo>("all");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Details query
  const { data: detailsData, isLoading: loadingDetails } = useQuery({
    queryKey: ["admin", "coupon-details", detailsId],
    queryFn: () => (detailsId ? getByIdFn({ data: { id: detailsId } }) : null),
    enabled: Boolean(detailsId),
  });

  // Mutations
  const saveMut = useMutation({
    mutationFn: async (payload: AdminCouponInput & { id?: string }) => {
      if (payload.id) {
        return await updateCouponFn({ data: { ...payload, id: payload.id } });
      }
      return await createCouponFn({ data: payload });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.id ? "Coupon updated successfully" : "Coupon created successfully");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      qc.invalidateQueries({ queryKey: ["admin", "coupon-stats"] });
      setFormOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to save coupon");
    },
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; isActive: boolean }) => toggleActiveFn({ data: vars }),
    onSuccess: (res) => {
      toast.success(res.isActive ? "Coupon activated" : "Coupon disabled");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      qc.invalidateQueries({ queryKey: ["admin", "coupon-stats"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to update status");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCouponFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Coupon archived successfully");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      qc.invalidateQueries({ queryKey: ["admin", "coupon-stats"] });
      setDeletingId(null);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to archive coupon");
    },
  });

  const resetForm = () => {
    setEditingCoupon(null);
    setCode("");
    setName("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setMinimumOrderValue(0);
    setHasMaxDiscount(false);
    setMaximumDiscount("");
    setHasUsageLimit(false);
    setUsageLimit("");
    setUsagePerCustomer(1);
    setStartsAt("");
    setHasExpiry(true);
    setExpiresAt("");
    setIsActive(true);
    setAppliesTo("all");
    setSelectedProductIds([]);
    setSelectedCategoryNames([]);
    setProductSearch("");
  };

  const openCreate = () => {
    resetForm();
    // Default expiry 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setExpiresAt(d.toISOString().slice(0, 16));
    setFormOpen(true);
  };

  const openEdit = (c: CouponRecord) => {
    setEditingCoupon(c);
    setCode(c.code);
    setName(c.name);
    setDescription(c.description || "");
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinimumOrderValue(c.minimumOrderValue);
    setHasMaxDiscount(c.maximumDiscount !== null);
    setMaximumDiscount(c.maximumDiscount ?? "");
    setHasUsageLimit(c.usageLimit !== null);
    setUsageLimit(c.usageLimit ?? "");
    setUsagePerCustomer(c.usagePerCustomer);
    setStartsAt(c.startsAt ? c.startsAt.slice(0, 16) : "");
    setHasExpiry(c.expiresAt !== null);
    setExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 16) : "");
    setIsActive(c.isActive);
    setAppliesTo(c.appliesTo);
    setSelectedProductIds(c.productIds || []);
    setSelectedCategoryNames(c.categoryNames || []);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.toUpperCase().replace(/\s+/g, "").trim();
    if (!cleanCode) {
      toast.error("Please enter a valid coupon code");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a coupon title/name");
      return;
    }
    if (discountValue <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    if (discountType === "percentage" && discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    saveMut.mutate({
      id: editingCoupon?.id,
      code: cleanCode,
      name: name.trim(),
      description: description.trim() || null,
      discountType,
      discountValue: Number(discountValue),
      minimumOrderValue: Number(minimumOrderValue || 0),
      maximumDiscount: hasMaxDiscount && maximumDiscount !== "" ? Number(maximumDiscount) : null,
      usageLimit: hasUsageLimit && usageLimit !== "" ? Number(usageLimit) : null,
      usagePerCustomer: Number(usagePerCustomer || 1),
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      expiresAt: hasExpiry && expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive,
      appliesTo,
      productIds: appliesTo === "products" ? selectedProductIds : [],
      categoryNames: appliesTo === "categories" ? selectedCategoryNames : [],
    });
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter & search coupons
  const filteredCoupons = useMemo(() => {
    return coupons
      .filter((c) => {
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matchCode = c.code.toLowerCase().includes(s);
          const matchName = c.name.toLowerCase().includes(s);
          const matchDesc = (c.description || "").toLowerCase().includes(s);
          if (!matchCode && !matchName && !matchDesc) return false;
        }
        if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
        if (typeFilter !== "all" && c.discountType !== typeFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "expiry") {
          if (!a.expiresAt) return 1;
          if (!b.expiresAt) return -1;
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        }
        if (sortBy === "usage") {
          return b.usedCount - a.usedCount;
        }
        return 0;
      });
  }, [coupons, searchTerm, statusFilter, typeFilter, sortBy]);

  // Product selection list helper
  const availableProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const s = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.category || "").toLowerCase().includes(s),
    );
  }, [products, productSearch]);

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-red/10 text-brand-red">
              <Ticket className="h-6 w-6" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Coupons & Discounts</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, configure, and monitor promo codes, cart conditions, and redemption limits.
          </p>
        </div>

        <Button onClick={openCreate} className="rounded-xl shadow-lg font-semibold gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {/* 5 Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-semibold">
            <span>Total Coupons</span>
            <Ticket className="h-4 w-4 text-brand-red" />
          </div>
          <div className="mt-2.5 text-2xl md:text-3xl font-bold">
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (stats?.totalCoupons ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">All created promo codes</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-semibold">
            <span>Active Coupons</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2.5 text-2xl md:text-3xl font-bold text-emerald-400">
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (stats?.activeCoupons ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Available for checkout</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-semibold">
            <span>Expired / Inactive</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2.5 text-2xl md:text-3xl font-bold text-muted-foreground">
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (stats?.expiredCoupons ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Past expiry date</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-semibold">
            <span>Coupons Used</span>
            <Receipt className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2.5 text-2xl md:text-3xl font-bold">
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (stats?.totalUsage ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Total order redemptions</p>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl border border-border bg-card p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-semibold">
            <span>Discount Given</span>
            <TrendingUp className="h-4 w-4 text-brand-red" />
          </div>
          <div className="mt-2.5 text-2xl md:text-3xl font-bold text-brand-red">
            {loadingStats ? <Skeleton className="h-8 w-24" /> : money(stats?.totalDiscountGiven ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Cumulative customer savings</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by coupon code, name, or description…"
              className="pl-9 bg-secondary/50 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] rounded-xl bg-secondary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] rounded-xl bg-secondary/50">
                <SelectValue placeholder="Discount Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[140px] rounded-xl bg-secondary/50">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="expiry">Expiry Date</SelectItem>
                <SelectItem value="usage">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {loadingCoupons ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Ticket className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">No coupons found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? "No coupons match your filter criteria. Try resetting the filters."
                : "Get started by creating your first promotional coupon code."}
            </p>
            <Button onClick={openCreate} className="mt-5 rounded-xl font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Coupon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Code & Name</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Redemptions</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCoupons.map((c) => {
                  const cfg = STATUS_CONFIG[c.status];
                  const StatusIcon = cfg.icon;

                  return (
                    <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm tracking-wider text-foreground bg-secondary/80 px-2 py-0.5 rounded-lg border border-border">
                                {c.code}
                              </span>
                              <button
                                onClick={() => copyCode(c.code)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                title="Copy code"
                              >
                                {copiedCode === c.code ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <p className="font-medium text-xs text-foreground/90">{c.name}</p>
                            {c.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 font-bold text-sm text-foreground">
                            {c.discountType === "percentage" ? (
                              <>
                                <Percent className="h-3.5 w-3.5 text-brand-red" />
                                {c.discountValue}% OFF
                              </>
                            ) : (
                              <>
                                <IndianRupee className="h-3.5 w-3.5 text-brand-red" />
                                {c.discountValue} Flat OFF
                              </>
                            )}
                          </span>
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            {c.minimumOrderValue > 0 && (
                              <p>Min order: ₹{c.minimumOrderValue.toLocaleString("en-IN")}</p>
                            )}
                            {c.maximumDiscount && (
                              <p>Max cap: ₹{c.maximumDiscount.toLocaleString("en-IN")}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.tone}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1.5 max-w-[130px]">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{c.usedCount}</span>
                            <span className="text-muted-foreground">
                              / {c.usageLimit !== null ? c.usageLimit : "∞"}
                            </span>
                          </div>
                          {c.usageLimit !== null && (
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  c.usedCount >= c.usageLimit ? "bg-destructive" : "bg-brand-red"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100))}%`,
                                }}
                              />
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {c.usagePerCustomer > 1
                              ? `${c.usagePerCustomer}x per user`
                              : "1 use per user"}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs text-muted-foreground space-y-0.5">
                        {c.expiresAt ? (
                          <>
                            <p className="text-foreground/90 font-medium">
                              Until {dateTime(c.expiresAt)}
                            </p>
                            {c.startsAt && <p className="text-[11px]">From {dateTime(c.startsAt)}</p>}
                          </>
                        ) : (
                          <p className="font-medium text-foreground/80">No expiry date</p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Enable/Disable quick toggle */}
                          <button
                            onClick={() =>
                              toggleMut.mutate({ id: c.id, isActive: !c.isActive })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              c.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                                : "bg-muted text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-400"
                            }`}
                            title={c.isActive ? "Click to Disable" : "Click to Enable"}
                          >
                            {c.isActive ? "Active" : "Disabled"}
                          </button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailsId(c.id)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                            title="View usage analytics"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(c)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Edit coupon"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(c.id)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Archive coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT COUPON DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-brand-red" />
              {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : "Create New Coupon"}
            </DialogTitle>
            <DialogDescription>
              Configure discount rules, order conditions, product eligibility, and customer limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-border pb-1.5">
                Basic Information
              </h4>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="coupon-code">
                    Coupon Code <span className="text-brand-red">*</span>
                  </Label>
                  <Input
                    id="coupon-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    placeholder="e.g. RIOTOUS10"
                    required
                    className="font-mono uppercase font-bold text-sm tracking-wider"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Auto-converted to uppercase without spaces.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="coupon-name">
                    Coupon Name <span className="text-brand-red">*</span>
                  </Label>
                  <Input
                    id="coupon-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diwali Festive 10% Discount"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">Internal admin title.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-desc">Description (Optional)</Label>
                <Textarea
                  id="coupon-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes on the marketing campaign, influencer code, or promo terms…"
                  rows={2}
                />
              </div>
            </div>

            {/* Section 2: Discount Configuration */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-border pb-1.5">
                Discount Type & Value
              </h4>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Discount Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                        discountType === "percentage"
                          ? "bg-brand-red text-white border-brand-red"
                          : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      <Percent className="h-3.5 w-3.5" />
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                        discountType === "fixed"
                          ? "bg-brand-red text-white border-brand-red"
                          : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      <IndianRupee className="h-3.5 w-3.5" />
                      Fixed Amount (₹)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="discount-val">
                    {discountType === "percentage" ? "Percentage Off (%)" : "Fixed Discount (₹)"}{" "}
                    <span className="text-brand-red">*</span>
                  </Label>
                  <Input
                    id="discount-val"
                    type="number"
                    min={1}
                    max={discountType === "percentage" ? 100 : undefined}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {discountType === "percentage"
                      ? "Enter number from 1 to 100 (e.g. 15 for 15% OFF)"
                      : "Enter amount in Rupees (e.g. 250 for ₹250 OFF)"}
                  </p>
                </div>
              </div>

              {/* Conditions */}
              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="min-order">Minimum Order Value (₹)</Label>
                  <Input
                    id="min-order"
                    type="number"
                    min={0}
                    value={minimumOrderValue || ""}
                    onChange={(e) => setMinimumOrderValue(Number(e.target.value))}
                    placeholder="0 (No minimum)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cart subtotal must reach this amount (e.g. ₹999).
                  </p>
                </div>

                {discountType === "percentage" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="max-discount">Maximum Discount Cap (₹)</Label>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Cap discount</span>
                        <Switch
                          checked={hasMaxDiscount}
                          onCheckedChange={setHasMaxDiscount}
                        />
                      </div>
                    </div>
                    <Input
                      id="max-discount"
                      type="number"
                      min={1}
                      disabled={!hasMaxDiscount}
                      value={hasMaxDiscount ? maximumDiscount : ""}
                      onChange={(e) =>
                        setMaximumDiscount(e.target.value ? Number(e.target.value) : "")
                      }
                      placeholder="e.g. 500"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Maximum savings ceiling allowed for this coupon.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Usage Limits & Customer Restrictions */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-border pb-1.5">
                Usage Limits
              </h4>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="usage-limit">Total Usage Limit</Label>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Limit total</span>
                      <Switch
                        checked={hasUsageLimit}
                        onCheckedChange={setHasUsageLimit}
                      />
                    </div>
                  </div>
                  <Input
                    id="usage-limit"
                    type="number"
                    min={1}
                    disabled={!hasUsageLimit}
                    value={hasUsageLimit ? usageLimit : ""}
                    onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Unlimited"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Total times this coupon can be redeemed across the store.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user-limit">Usage Limit Per Customer</Label>
                  <Select
                    value={String(usagePerCustomer)}
                    onValueChange={(v) => setUsagePerCustomer(Number(v))}
                  >
                    <SelectTrigger id="user-limit" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 use per customer</SelectItem>
                      <SelectItem value="2">2 uses per customer</SelectItem>
                      <SelectItem value="3">3 uses per customer</SelectItem>
                      <SelectItem value="5">5 uses per customer</SelectItem>
                      <SelectItem value="999999">Unlimited per customer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Enforces limits by customer account / email.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Validity Schedule */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-border pb-1.5">
                Validity Period
              </h4>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">Start Date & Time (Optional)</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank to activate immediately upon creation.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="expiry-date">Expiry Date & Time</Label>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Has expiry</span>
                      <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
                    </div>
                  </div>
                  <Input
                    id="expiry-date"
                    type="datetime-local"
                    disabled={!hasExpiry}
                    value={hasExpiry ? expiresAt : ""}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Coupon automatically deactivates after this time.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5: Product & Category Eligibility */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-border pb-1.5">
                Applies To
              </h4>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAppliesTo("all")}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      appliesTo === "all"
                        ? "bg-brand-red text-white border-brand-red"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    Entire Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppliesTo("categories")}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      appliesTo === "categories"
                        ? "bg-brand-red text-white border-brand-red"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    Specific Categories
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppliesTo("products")}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      appliesTo === "products"
                        ? "bg-brand-red text-white border-brand-red"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    Specific Products
                  </button>
                </div>

                {appliesTo === "categories" && (
                  <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2">
                    <Label className="text-xs font-semibold">Select Eligible Categories:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {PRESET_CATEGORIES.map((cat) => {
                        const checked = selectedCategoryNames.includes(cat);
                        return (
                          <label
                            key={cat}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                              checked
                                ? "bg-brand-red/10 border-brand-red text-foreground font-semibold"
                                : "bg-card border-border text-muted-foreground hover:bg-secondary/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryNames([...selectedCategoryNames, cat]);
                                } else {
                                  setSelectedCategoryNames(
                                    selectedCategoryNames.filter((c) => c !== cat),
                                  );
                                }
                              }}
                              className="rounded border-border"
                            />
                            <span className="truncate">{cat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {appliesTo === "products" && (
                  <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Select Eligible Products ({selectedProductIds.length} selected):
                      </Label>
                      {selectedProductIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedProductIds([])}
                          className="text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products to include…"
                      className="h-8 text-xs bg-card"
                    />

                    <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-card">
                      {availableProducts.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground text-center">
                          No products found
                        </p>
                      ) : (
                        availableProducts.map((p) => {
                          const checked = selectedProductIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className="flex items-center justify-between p-2.5 text-xs hover:bg-secondary/40 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductIds([...selectedProductIds, p.id]);
                                    } else {
                                      setSelectedProductIds(
                                        selectedProductIds.filter((id) => id !== p.id),
                                      );
                                    }
                                  }}
                                  className="rounded border-border"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{p.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{p.category}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-2">
                                {money(p.price)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 6: Active Status Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/30">
              <div className="space-y-0.5">
                <Label htmlFor="active-toggle" className="font-semibold text-sm cursor-pointer">
                  Activate Coupon
                </Label>
                <p className="text-xs text-muted-foreground">
                  If disabled, customers cannot use this code at checkout.
                </p>
              </div>
              <Switch id="active-toggle" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMut.isPending}
                className="rounded-xl font-semibold"
              >
                {saveMut.isPending
                  ? "Saving…"
                  : editingCoupon
                    ? "Update Coupon"
                    : "Create Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW COUPON DETAILS & USAGE HISTORY DIALOG */}
      <Dialog open={Boolean(detailsId)} onOpenChange={(open) => !open && setDetailsId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-brand-red" />
              Coupon Analytics & Usage History
            </DialogTitle>
            <DialogDescription>
              Detailed configuration, performance statistics, and orders that redeemed this coupon.
            </DialogDescription>
          </DialogHeader>

          {loadingDetails || !detailsData ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Top Banner */}
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-foreground tracking-wider bg-background px-2.5 py-0.5 rounded-lg border border-border">
                      {detailsData.coupon.code}
                    </span>
                    <Badge
                      variant="outline"
                      className={STATUS_CONFIG[detailsData.coupon.status].tone}
                    >
                      {STATUS_CONFIG[detailsData.coupon.status].label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground/90">{detailsData.coupon.name}</p>
                  {detailsData.coupon.description && (
                    <p className="text-xs text-muted-foreground">{detailsData.coupon.description}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-brand-red">
                    {detailsData.coupon.discountType === "percentage"
                      ? `${detailsData.coupon.discountValue}% OFF`
                      : money(detailsData.coupon.discountValue) + " Flat OFF"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {detailsData.coupon.minimumOrderValue > 0
                      ? `Min order ₹${detailsData.coupon.minimumOrderValue}`
                      : "No minimum order"}
                  </p>
                </div>
              </div>

              {/* 4 Stats Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Total Uses
                  </span>
                  <div className="mt-1 text-xl font-bold">{detailsData.stats.totalUsage}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Limit: {detailsData.coupon.usageLimit ?? "Unlimited"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Remaining
                  </span>
                  <div className="mt-1 text-xl font-bold">
                    {detailsData.stats.remainingUsage !== null
                      ? detailsData.stats.remainingUsage
                      : "Unlimited"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Slots left</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Total Discount
                  </span>
                  <div className="mt-1 text-xl font-bold text-brand-red">
                    {money(detailsData.stats.totalDiscountGiven)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Given to customers</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Avg Discount
                  </span>
                  <div className="mt-1 text-xl font-bold">
                    {money(detailsData.stats.averageDiscount)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Per order</p>
                </div>
              </div>

              {/* Conditions Summary */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs">
                <p className="font-semibold text-foreground">Rule Constraints:</p>
                <div className="grid sm:grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    • Per customer limit:{" "}
                    <strong className="text-foreground">
                      {detailsData.coupon.usagePerCustomer > 1
                        ? `${detailsData.coupon.usagePerCustomer} times`
                        : "1 time"}
                    </strong>
                  </div>
                  <div>
                    • Scope:{" "}
                    <strong className="text-foreground uppercase">
                      {detailsData.coupon.appliesTo}
                    </strong>
                  </div>
                  <div>
                    • Starts:{" "}
                    <strong className="text-foreground">
                      {detailsData.coupon.startsAt ? dateTime(detailsData.coupon.startsAt) : "Immediately"}
                    </strong>
                  </div>
                  <div>
                    • Expires:{" "}
                    <strong className="text-foreground">
                      {detailsData.coupon.expiresAt ? dateTime(detailsData.coupon.expiresAt) : "No expiry"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Usage History Log */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center justify-between">
                  <span>Order Redemptions ({detailsData.history.length})</span>
                </h4>

                {detailsData.history.length === 0 ? (
                  <div className="text-center py-8 border border-border rounded-xl bg-secondary/20">
                    <Receipt className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">
                      This coupon hasn't been used in any completed orders yet.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl max-h-60 overflow-auto">
                    <table className="w-full text-left text-xs min-w-[480px]">
                      <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5">Order #</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Order Amount</th>
                          <th className="p-2.5 text-right">Discount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailsData.history.map((h) => (
                          <tr key={h.id} className="hover:bg-secondary/20">
                            <td className="p-2.5 font-mono font-medium">{h.orderNumber}</td>
                            <td className="p-2.5">
                              <p className="font-medium text-foreground">{h.customerName}</p>
                              <p className="text-[10px] text-muted-foreground">{h.customerEmail}</p>
                            </td>
                            <td className="p-2.5 text-muted-foreground">{dateTime(h.usedAt)}</td>
                            <td className="p-2.5 text-right font-medium">{money(h.orderAmount)}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">
                              -{money(h.discountAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailsId(null)}
              className="rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ARCHIVE / SOFT DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Archive Coupon
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this coupon? It will immediately become unavailable
              for customers. Historical order records and reports will be safely preserved.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingId(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deletingId && deleteMut.mutate(deletingId)}
              className="rounded-xl font-semibold"
            >
              {deleteMut.isPending ? "Archiving…" : "Archive Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
