import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  adminListVariants,
  adminSetVariantInventory,
  adminAddVariantInventory,
  adminRemoveVariantInventory,
  adminListInventoryTransactions,
  type AdminVariant,
  type InventoryTransactionRecord,
} from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  History,
  Plus,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Eye,
  MoreHorizontal,
  Search,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: InventoryPage,
});

type Group = {
  productId: string;
  name: string;
  image: string | null;
  isActive: boolean;
  variants: AdminVariant[];
};

function getStockStatus(v: AdminVariant) {
  const available = Math.max(0, v.stock_quantity - v.reserved_stock);
  if (available <= 0) {
    return { label: "Out of Stock", tone: "destructive" as const, available, category: "out" };
  }
  if (available <= 2) {
    return { label: "Critical", tone: "destructive" as const, available, category: "critical" };
  }
  if (available <= v.low_stock_threshold) {
    return { label: "Low Stock", tone: "secondary" as const, available, category: "low" };
  }
  return { label: "In Stock", tone: "default" as const, available, category: "healthy" };
}

function InventoryPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListVariants);
  const setFn = useServerFn(adminSetVariantInventory);
  const addFn = useServerFn(adminAddVariantInventory);
  const removeFn = useServerFn(adminRemoveVariantInventory);
  const listTxFn = useServerFn(adminListInventoryTransactions);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVariantForHistory, setSelectedVariantForHistory] = useState<string | null>(null);

  // Quick adjust modal state
  const [adjustModal, setAdjustModal] = useState<{
    variant: AdminVariant;
    mode: "add" | "remove" | "set";
  } | null>(null);
  const [viewDetailsVariant, setViewDetailsVariant] = useState<AdminVariant | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>("5");
  const [adjustReason, setAdjustReason] = useState<string>("New Stock Received");
  const [adjustNote, setAdjustNote] = useState<string>("");

  const variantsQ = useQuery({
    queryKey: ["admin", "variants"],
    queryFn: () => listFn(),
    refetchInterval: 20000,
  });

  const allVariants = useMemo(
    () => (Array.isArray(variantsQ.data) ? variantsQ.data : []),
    [variantsQ.data],
  );

  const txQ = useQuery({
    queryKey: ["admin", "inventory-tx", selectedVariantForHistory],
    queryFn: () =>
      listTxFn({ data: { variantId: selectedVariantForHistory || undefined, limit: 100 } }),
    enabled: showHistory,
    refetchInterval: showHistory ? 15000 : false,
  });

  // History states & filtering
  const [historySearch, setHistorySearch] = useState("");
  const [historyOpFilter, setHistoryOpFilter] = useState("all");
  const [historyReasonFilter, setHistoryReasonFilter] = useState("all");
  const [historyAdminFilter, setHistoryAdminFilter] = useState("all");
  const [historySortBy, setHistorySortBy] = useState<string>("date");
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("desc");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const enrichedTransactions = useMemo(() => {
    const rawTx = txQ.data || [];
    return rawTx.map((tx: InventoryTransactionRecord) => {
      const v = allVariants.find((av) => av.id === tx.variant_id);
      const sku = v?.sku || tx.variant_id || "—";
      const color = v?.color || "";
      const size = v?.size || "";
      const variantStr = tx.variant_details || [color, size].filter(Boolean).join(" / ") || "—";
      const opType =
        tx.transaction_type === "ADMIN_ADD"
          ? "Add Stock"
          : tx.transaction_type === "ADMIN_REMOVE"
            ? "Remove Stock"
            : tx.transaction_type === "ADMIN_SET" || tx.transaction_type === "MANUAL_ADJUSTMENT"
              ? "Adjust Stock"
              : tx.transaction_type === "ORDER_DEDUCTION"
                ? "Order Deduction"
                : tx.transaction_type === "ORDER_CANCELLATION"
                  ? "Order Cancellation"
                  : "Order Return";

      return {
        ...tx,
        sku,
        variantStr,
        opType,
        adminName: tx.created_by || "Admin User",
      };
    });
  }, [txQ.data, allVariants]);

  const uniqueHistoryOps = useMemo(() => {
    const ops = new Set(enrichedTransactions.map((t) => t.opType));
    return Array.from(ops);
  }, [enrichedTransactions]);

  const uniqueHistoryReasons = useMemo(() => {
    const rs = new Set(enrichedTransactions.map((t) => t.reason).filter(Boolean));
    return Array.from(rs);
  }, [enrichedTransactions]);

  const uniqueHistoryAdmins = useMemo(() => {
    const ads = new Set(enrichedTransactions.map((t) => t.adminName));
    return Array.from(ads);
  }, [enrichedTransactions]);

  const filteredHistory = useMemo(() => {
    return enrichedTransactions.filter((tx) => {
      if (selectedVariantForHistory && tx.variant_id !== selectedVariantForHistory) {
        return false;
      }
      if (historySearch.trim() !== "") {
        const q = historySearch.toLowerCase();
        const match =
          (tx.product_name || "").toLowerCase().includes(q) ||
          tx.sku.toLowerCase().includes(q) ||
          tx.variantStr.toLowerCase().includes(q) ||
          (tx.reason || "").toLowerCase().includes(q) ||
          tx.adminName.toLowerCase().includes(q) ||
          tx.opType.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (historyOpFilter !== "all" && tx.opType !== historyOpFilter) {
        return false;
      }
      if (historyReasonFilter !== "all" && tx.reason !== historyReasonFilter) {
        return false;
      }
      if (historyAdminFilter !== "all" && tx.adminName !== historyAdminFilter) {
        return false;
      }
      return true;
    });
  }, [
    enrichedTransactions,
    selectedVariantForHistory,
    historySearch,
    historyOpFilter,
    historyReasonFilter,
    historyAdminFilter,
  ]);

  const sortedHistory = useMemo(() => {
    const list = [...filteredHistory];
    list.sort((a, b) => {
      let res = 0;
      if (historySortBy === "date") {
        res = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (historySortBy === "product") {
        res = (a.product_name || "").localeCompare(b.product_name || "");
      } else if (historySortBy === "sku") {
        res = a.sku.localeCompare(b.sku);
      } else if (historySortBy === "prev") {
        res = a.previous_quantity - b.previous_quantity;
      } else if (historySortBy === "new") {
        res = a.new_quantity - b.new_quantity;
      } else if (historySortBy === "change") {
        res = a.quantity_change - b.quantity_change;
      } else if (historySortBy === "op") {
        res = a.opType.localeCompare(b.opType);
      } else if (historySortBy === "reason") {
        res = (a.reason || "").localeCompare(b.reason || "");
      } else if (historySortBy === "admin") {
        res = a.adminName.localeCompare(b.adminName);
      }
      return historySortDir === "asc" ? res : -res;
    });
    return list;
  }, [filteredHistory, historySortBy, historySortDir]);

  const totalHistoryItems = sortedHistory.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryItems / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);

  const paginatedHistory = useMemo(() => {
    const start = (safeHistoryPage - 1) * historyPageSize;
    return sortedHistory.slice(start, start + historyPageSize);
  }, [sortedHistory, safeHistoryPage, historyPageSize]);

  const clearHistoryFilters = () => {
    setHistorySearch("");
    setHistoryOpFilter("all");
    setHistoryReasonFilter("all");
    setHistoryAdminFilter("all");
    setHistorySortBy("date");
    setHistorySortDir("desc");
    setHistoryPage(1);
  };

  const hasActiveHistoryFilters =
    historySearch.trim() !== "" ||
    historyOpFilter !== "all" ||
    historyReasonFilter !== "all" ||
    historyAdminFilter !== "all" ||
    historySortBy !== "date" ||
    historySortDir !== "desc";

  const targetVariantObj = allVariants.find((v) => v.id === selectedVariantForHistory);
  const targetVariantStatus = targetVariantObj ? getStockStatus(targetVariantObj) : null;

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "variants"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin", "inventory-tx"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
  };

  const setStock = useMutation({
    mutationFn: (p: { variantId: string; quantity: number; reason?: string }) => setFn({ data: p }),
    onSuccess: () => {
      toast.success("Stock adjusted successfully.");
      refreshAll();
      setAdjustModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addStock = useMutation({
    mutationFn: (p: { variantId: string; quantity: number; reason?: string }) => addFn({ data: p }),
    onSuccess: (_, variables) => {
      toast.success(`${variables.quantity} units added successfully.`);
      refreshAll();
      setAdjustModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStock = useMutation({
    mutationFn: (p: { variantId: string; quantity: number; reason?: string }) =>
      removeFn({ data: p }),
    onSuccess: (_, variables) => {
      toast.success(`${variables.quantity} units removed successfully.`);
      refreshAll();
      setAdjustModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("product");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const uniqueColors = useMemo(() => {
    const set = new Set<string>();
    for (const v of allVariants) {
      if (v.color) set.add(v.color.trim());
    }
    return Array.from(set).sort();
  }, [allVariants]);

  const uniqueSizes = useMemo(() => {
    const set = new Set<string>();
    for (const v of allVariants) {
      if (v.size) set.add(v.size.trim());
    }
    const order = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
    return Array.from(set).sort((a, b) => {
      const ia = order.indexOf(a.toUpperCase());
      const ib = order.indexOf(b.toUpperCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allVariants]);

  // Derived statistics for summary cards & health
  const stats = useMemo(() => {
    const productIds = new Set(allVariants.map((v) => v.product_id));
    let totalStock = 0;
    let reservedStock = 0;
    let availableStock = 0;
    let healthyCount = 0;
    let lowCount = 0;
    let criticalCount = 0;
    let outCount = 0;

    for (const v of allVariants) {
      const st = getStockStatus(v);
      totalStock += v.stock_quantity;
      reservedStock += v.reserved_stock;
      availableStock += st.available;

      if (st.category === "healthy") healthyCount++;
      else if (st.category === "low") lowCount++;
      else if (st.category === "critical") criticalCount++;
      else if (st.category === "out") outCount++;
    }

    return {
      totalProducts: productIds.size,
      totalVariants: allVariants.length,
      totalStock,
      reservedStock,
      availableStock,
      healthyCount,
      lowCount,
      criticalCount,
      outCount,
    };
  }, [allVariants]);

  // Filter pipeline
  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVariants.filter((v) => {
      const st = getStockStatus(v);
      if (q) {
        const match = `${v.product_name} ${v.size} ${v.color} ${v.sku}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      const effectiveStatus = statusFilter !== "all" ? statusFilter : stockFilter;
      if (effectiveStatus !== "all" && st.category !== effectiveStatus) {
        return false;
      }
      if (
        colorFilter !== "all" &&
        v.color?.toLowerCase().trim() !== colorFilter.toLowerCase().trim()
      ) {
        return false;
      }
      if (
        sizeFilter !== "all" &&
        v.size?.toLowerCase().trim() !== sizeFilter.toLowerCase().trim()
      ) {
        return false;
      }
      return true;
    });
  }, [allVariants, search, statusFilter, colorFilter, sizeFilter, stockFilter]);

  // Sorting pipeline
  const sortedVariants = useMemo(() => {
    const list = [...filteredVariants];
    const statusPriority: Record<string, number> = {
      out: 1,
      critical: 2,
      low: 3,
      healthy: 4,
    };

    list.sort((a, b) => {
      let res = 0;
      if (sortBy === "product") {
        res = (a.product_name || "").localeCompare(b.product_name || "");
      } else if (sortBy === "sku") {
        res = (a.sku || "").localeCompare(b.sku || "");
      } else if (sortBy === "current_stock") {
        res = a.stock_quantity - b.stock_quantity;
      } else if (sortBy === "reserved_stock") {
        res = a.reserved_stock - b.reserved_stock;
      } else if (sortBy === "available_stock") {
        const avA = Math.max(0, a.stock_quantity - a.reserved_stock);
        const avB = Math.max(0, b.stock_quantity - b.reserved_stock);
        res = avA - avB;
      } else if (sortBy === "reorder_level") {
        res = (a.low_stock_threshold || 0) - (b.low_stock_threshold || 0);
      } else if (sortBy === "status") {
        const stA = getStockStatus(a).category;
        const stB = getStockStatus(b).category;
        res = (statusPriority[stA] || 5) - (statusPriority[stB] || 5);
      }
      return sortDir === "asc" ? res : -res;
    });
    return list;
  }, [filteredVariants, sortBy, sortDir]);

  const totalItems = sortedVariants.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVariants = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedVariants.slice(start, start + pageSize);
  }, [sortedVariants, safeCurrentPage, pageSize]);

  // Group paginated variants by product
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const v of paginatedVariants) {
      let g = map.get(v.product_id);
      if (!g) {
        g = {
          productId: v.product_id,
          name: v.product_name,
          image: v.product_image,
          isActive: v.is_active,
          variants: [],
        };
        map.set(v.product_id, g);
      }
      g.variants.push(v);
    }
    return [...map.values()];
  }, [paginatedVariants]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setColorFilter("all");
    setSizeFilter("all");
    setStockFilter("all");
    setSortBy("product");
    setSortDir("asc");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    colorFilter !== "all" ||
    sizeFilter !== "all" ||
    stockFilter !== "all";

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal) return;
    const freshVariant =
      allVariants.find((v) => v.id === adjustModal.variant.id) || adjustModal.variant;
    const q = parseInt(adjustQty, 10);

    if (!Number.isFinite(q) || isNaN(q)) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    const fullReason = adjustNote.trim() ? `${adjustReason}: ${adjustNote.trim()}` : adjustReason;

    if (adjustModal.mode === "add") {
      if (q <= 0 || !Number.isInteger(q)) {
        toast.error("Enter a valid quantity greater than 0.");
        return;
      }
      addStock.mutate({
        variantId: freshVariant.id,
        quantity: q,
        reason: fullReason,
      });
    } else if (adjustModal.mode === "remove") {
      if (q <= 0 || !Number.isInteger(q)) {
        toast.error("Enter a valid quantity greater than 0.");
        return;
      }
      const available = Math.max(0, freshVariant.stock_quantity - freshVariant.reserved_stock);
      if (q > available) {
        toast.error(
          `Only ${available} units are available to remove because ${freshVariant.reserved_stock} units are reserved.`,
        );
        return;
      }
      if (q > freshVariant.stock_quantity) {
        toast.error(
          `Cannot remove ${q} units. Only ${freshVariant.stock_quantity} units are currently in stock.`,
        );
        return;
      }
      removeStock.mutate({
        variantId: freshVariant.id,
        quantity: q,
        reason: fullReason,
      });
    } else {
      if (q < 0 || !Number.isInteger(q)) {
        toast.error("Please enter a valid whole number quantity.");
        return;
      }
      if (q < freshVariant.reserved_stock) {
        toast.error(
          `New stock cannot be lower than reserved stock. ${freshVariant.reserved_stock} units are currently reserved.`,
        );
        return;
      }
      setStock.mutate({
        variantId: freshVariant.id,
        quantity: q,
        reason: fullReason,
      });
    }
  };

  const isAdjusting = setStock.isPending || addStock.isPending || removeStock.isPending;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor stock levels, manage variants and prevent stockouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showHistory ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowHistory(!showHistory);
              if (showHistory) setSelectedVariantForHistory(null);
            }}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            {showHistory ? "Hide Audit History" : "Audit History"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshAll()}
            title="Refresh inventory"
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Audit History Panel */}
      {showHistory && (
        <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Inventory Audit History</h2>
                <p className="text-xs text-muted-foreground">
                  Immutable audit trail of all stock movements and administrative adjustments.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedVariantForHistory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVariantForHistory(null)}
                  className="text-xs h-9 gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Show All History
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="text-xs h-9"
              >
                Close History
              </Button>
            </div>
          </div>

          {/* Variant Summary Banner if filtered by specific variant */}
          {selectedVariantForHistory && targetVariantObj && targetVariantStatus && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs uppercase font-mono">
                    Variant View
                  </Badge>
                  <span className="font-bold text-sm">{targetVariantObj.product_name}</span>
                </div>
                <Badge variant={targetVariantStatus.tone} className="text-xs">
                  {targetVariantStatus.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs pt-1 border-t">
                <div>
                  <span className="text-muted-foreground block">SKU</span>
                  <span className="font-mono font-medium">{targetVariantObj.sku}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Variant</span>
                  <span className="font-medium">
                    {[targetVariantObj.color, targetVariantObj.size].filter(Boolean).join(" / ") ||
                      "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Current Stock</span>
                  <span className="font-mono font-bold text-foreground">
                    {targetVariantObj.stock_quantity}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Reserved</span>
                  <span className="font-mono font-medium text-amber-600">
                    {targetVariantObj.reserved_stock}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Available</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {targetVariantStatus.available}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Reorder Level</span>
                  <span className="font-mono">{targetVariantObj.low_stock_threshold}</span>
                </div>
              </div>
            </div>
          )}

          {/* History Search & Filters Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history by product, SKU, reason, admin..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyOpFilter}
                onChange={(e) => {
                  setHistoryOpFilter(e.target.value);
                  setHistoryPage(1);
                }}
                aria-label="Filter by operation type"
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
              >
                <option value="all">All Operations</option>
                {uniqueHistoryOps.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>

              <select
                value={historyReasonFilter}
                onChange={(e) => {
                  setHistoryReasonFilter(e.target.value);
                  setHistoryPage(1);
                }}
                aria-label="Filter by reason"
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground max-w-[160px] truncate"
              >
                <option value="all">All Reasons</option>
                {uniqueHistoryReasons.map((rs) => (
                  <option key={rs} value={rs}>
                    {rs}
                  </option>
                ))}
              </select>

              <select
                value={historyAdminFilter}
                onChange={(e) => {
                  setHistoryAdminFilter(e.target.value);
                  setHistoryPage(1);
                }}
                aria-label="Filter by admin"
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
              >
                <option value="all">All Admins</option>
                {uniqueHistoryAdmins.map((ad) => (
                  <option key={ad} value={ad}>
                    {ad}
                  </option>
                ))}
              </select>

              {hasActiveHistoryFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistoryFilters}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* History Table or States */}
          {txQ.isLoading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : totalHistoryItems === 0 ? (
            <div className="py-12 text-center space-y-3 border rounded-xl bg-muted/20">
              <History className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {enrichedTransactions.length === 0
                    ? "No inventory history found"
                    : "No history matches your current filters."}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {enrichedTransactions.length === 0
                    ? "Stock changes made via Add, Remove, or Adjust operations will automatically record immutable audit logs here."
                    : "Try adjusting your search query or clearing active filters."}
                </p>
              </div>
              {hasActiveHistoryFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearHistoryFilters}
                  className="mt-2 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
                    <tr>
                      <th
                        className="p-3 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "date") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("date");
                            setHistorySortDir("desc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Date / Time
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "product") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("product");
                            setHistorySortDir("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Product &amp; Variant
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "sku") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("sku");
                            setHistorySortDir("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          SKU
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "op") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("op");
                            setHistorySortDir("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Operation
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="p-3 text-right font-semibold">Previous</th>
                      <th className="p-3 text-right font-semibold">New</th>
                      <th
                        className="p-3 text-right font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "change") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("change");
                            setHistorySortDir("desc");
                          }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          Change
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "reason") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("reason");
                            setHistorySortDir("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Reason / Note
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => {
                          if (historySortBy === "admin") {
                            setHistorySortDir(historySortDir === "asc" ? "desc" : "asc");
                          } else {
                            setHistorySortBy("admin");
                            setHistorySortDir("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Admin
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedHistory.map((tx) => {
                      const isPositive = tx.quantity_change > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="p-3 font-medium">
                            <div>{tx.product_name || "Product"}</div>
                            <div className="text-muted-foreground text-[11px]">{tx.variantStr}</div>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{tx.sku}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                                tx.opType === "Add Stock"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : tx.opType === "Remove Stock"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : tx.opType === "Adjust Stock"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : "bg-secondary text-foreground"
                              }`}
                            >
                              {tx.opType}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {tx.previous_quantity}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            {tx.new_quantity}
                          </td>
                          <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-0.5 ${
                                isPositive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : tx.quantity_change < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {isPositive ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : tx.quantity_change < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : null}
                              {isPositive ? `+${tx.quantity_change}` : tx.quantity_change}
                            </span>
                          </td>
                          <td className="p-3 max-w-xs truncate text-muted-foreground">
                            {tx.reason || (tx.order_id ? `Order ${tx.order_id}` : "—")}
                          </td>
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {tx.adminName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-muted-foreground">
                  Showing {(safeHistoryPage - 1) * historyPageSize + 1}–
                  {Math.min(totalHistoryItems, safeHistoryPage * historyPageSize)} of{" "}
                  {totalHistoryItems} history records
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Rows:</span>
                    <select
                      value={historyPageSize}
                      onChange={(e) => {
                        setHistoryPageSize(Number(e.target.value));
                        setHistoryPage(1);
                      }}
                      aria-label="Rows per page"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={safeHistoryPage === 1}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      Page {safeHistoryPage} of {totalHistoryPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                      disabled={safeHistoryPage >= totalHistoryPages}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 11 & 12. Inventory Summary Cards */}
      <InventorySummaryCards stats={stats} />

      {/* 13. Inventory Health Section */}
      <InventoryHealth stats={stats} />

      {/* 14 & 15. Low Stock Alerts Section */}
      <LowStockAlerts variants={allVariants} />

      {/* 20 & 21. Inventory Overview / Table Section with Search, Filters, Sorting, Pagination */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="rounded-xl border bg-card p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, SKU, color or size..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 pl-9 pr-9 w-full"
                aria-label="Search inventory"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="healthy">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="critical">Critical</option>
                <option value="out">Out of Stock</option>
              </select>

              <select
                value={colorFilter}
                onChange={(e) => {
                  setColorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                aria-label="Filter by color"
              >
                <option value="all">All Colors</option>
                {uniqueColors.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              <select
                value={sizeFilter}
                onChange={(e) => {
                  setSizeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                aria-label="Filter by size"
              >
                <option value="all">All Sizes</option>
                {uniqueSizes.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        <InventoryOverview
          groups={groups}
          isLoading={variantsQ.isLoading}
          onOpenModal={(variant, mode) => {
            setAdjustModal({ variant, mode });
            setAdjustQty(
              mode === "set" ? variant.stock_quantity.toString() : mode === "add" ? "5" : "1",
            );
            setAdjustReason(
              mode === "add"
                ? "New Stock Received"
                : mode === "remove"
                  ? "Damaged"
                  : "Physical Stock Count",
            );
            setAdjustNote("");
          }}
          onViewHistory={(variantId) => {
            setSelectedVariantForHistory(variantId);
            setShowHistory(true);
          }}
          onViewDetails={(variant) => setViewDetailsVariant(variant)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          totalItems={totalItems}
          allTotalItems={allVariants.length}
          safeCurrentPage={safeCurrentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setCurrentPage={setCurrentPage}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
        />
      </div>

      {/* View Details Modal */}
      <VariantDetailsModal
        variant={viewDetailsVariant}
        onClose={() => setViewDetailsVariant(null)}
        onOpenModal={(variant, mode) => {
          setAdjustModal({ variant, mode });
          setAdjustQty(
            mode === "set" ? variant.stock_quantity.toString() : mode === "add" ? "5" : "1",
          );
          setAdjustReason(
            mode === "add"
              ? "New Stock Received"
              : mode === "remove"
                ? "Damaged"
                : "Physical Stock Count",
          );
          setAdjustNote("");
        }}
        onViewHistory={(variantId) => {
          setSelectedVariantForHistory(variantId);
          setShowHistory(true);
        }}
      />

      {/* Stock Management Modals (Add, Remove, Adjust/Set) */}
      {adjustModal &&
        (() => {
          const freshVariant =
            allVariants.find((v) => v.id === adjustModal.variant.id) || adjustModal.variant;
          const st = getStockStatus(freshVariant);
          const qNum = parseInt(adjustQty, 10) || 0;

          const addReasons = [
            "New Stock Received",
            "Supplier Delivery",
            "Restock",
            "Customer Return",
            "Inventory Correction",
            "Other",
          ];
          const removeReasons = [
            "Damaged",
            "Lost",
            "Defective",
            "Inventory Correction",
            "Sample / Internal Use",
            "Supplier Adjustment",
            "Other",
          ];
          const setReasons = [
            "Physical Stock Count",
            "Inventory Correction",
            "Damaged Stock",
            "Lost Stock",
            "Supplier Adjustment",
            "System Correction",
            "Other",
          ];

          const currentReasons =
            adjustModal.mode === "add"
              ? addReasons
              : adjustModal.mode === "remove"
                ? removeReasons
                : setReasons;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      {adjustModal.mode === "add"
                        ? "Add Stock"
                        : adjustModal.mode === "remove"
                          ? "Remove Stock"
                          : "Adjust Stock"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {adjustModal.mode === "add"
                        ? "Increase physical stock quantity for this variant."
                        : adjustModal.mode === "remove"
                          ? "Decrease physical stock quantity securely."
                          : "Set exact physical stock count."}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdjustModal(null)}
                    className="h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>

                {/* Variant Details Info Box */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm truncate max-w-[280px]">
                      {freshVariant.product_name}
                    </div>
                    <Badge variant={st.tone} className="text-xs">
                      {st.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t">
                    <div>
                      <span className="text-muted-foreground block">SKU</span>
                      <span className="font-mono font-medium">{freshVariant.sku || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Color / Size</span>
                      <span className="font-medium">
                        {[freshVariant.color, freshVariant.size].filter(Boolean).join(" / ") || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Current Stock</span>
                      <span className="font-mono font-bold text-foreground">
                        {freshVariant.stock_quantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Available</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {st.available}
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {adjustModal.mode === "set" ? "New Stock Quantity" : "Quantity"}
                    </label>
                    <Input
                      type="number"
                      min={adjustModal.mode === "set" ? 0 : 1}
                      step="1"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      placeholder="Enter whole number quantity"
                      required
                      autoFocus
                      className="font-mono"
                    />
                  </div>

                  {/* Dynamic Preview Box */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                    <div className="font-semibold text-primary">Calculation Preview</div>
                    {adjustModal.mode === "add" && (
                      <div className="flex items-center justify-between font-mono">
                        <span>
                          Current: {freshVariant.stock_quantity} + Added: {qNum}
                        </span>
                        <span className="font-bold text-emerald-600">
                          = New Stock: {freshVariant.stock_quantity + Math.max(0, qNum)}
                        </span>
                      </div>
                    )}
                    {adjustModal.mode === "remove" && (
                      <div className="space-y-0.5 font-mono">
                        <div className="flex items-center justify-between">
                          <span>
                            Current Stock: {freshVariant.stock_quantity} − Remove: {qNum}
                          </span>
                          <span className="font-bold text-rose-600">
                            = New Stock: {Math.max(0, freshVariant.stock_quantity - qNum)}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Reserved: {freshVariant.reserved_stock} · Available after remove:{" "}
                          {Math.max(0, st.available - qNum)}
                        </div>
                      </div>
                    )}
                    {adjustModal.mode === "set" && (
                      <div className="flex items-center justify-between font-mono">
                        <span>
                          Current: {freshVariant.stock_quantity} → New: {qNum}
                        </span>
                        <span className="font-bold">
                          Difference:{" "}
                          {qNum - freshVariant.stock_quantity >= 0
                            ? `+${qNum - freshVariant.stock_quantity}`
                            : qNum - freshVariant.stock_quantity}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Reason
                      </label>
                      <select
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground"
                      >
                        {currentReasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Note (Optional)
                      </label>
                      <Input
                        type="text"
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder="Additional details..."
                        maxLength={100}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAdjustModal(null)}
                      disabled={isAdjusting}
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isAdjusting}
                      variant={adjustModal.mode === "remove" ? "destructive" : "default"}
                      size="sm"
                    >
                      {isAdjusting
                        ? "Updating..."
                        : adjustModal.mode === "add"
                          ? "Confirm Add Stock"
                          : adjustModal.mode === "remove"
                            ? "Confirm Remove Stock"
                            : "Confirm Adjustment"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

/** 11 & 12. Inventory Summary Cards Component */
function InventorySummaryCards({ stats }: { stats: any }) {
  const cards = [
    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "text-blue-600" },
    { label: "Total Variants", value: stats.totalVariants, icon: Layers, color: "text-indigo-600" },
    { label: "Total Stock", value: stats.totalStock, icon: BarChart3, color: "text-emerald-600" },
    {
      label: "Reserved Stock",
      value: stats.reservedStock,
      icon: TrendingDown,
      color: "text-amber-600",
    },
    {
      label: "Available Stock",
      value: stats.availableStock,
      icon: TrendingUp,
      color: "text-emerald-700 font-bold",
    },
    { label: "Low Stock", value: stats.lowCount, icon: AlertTriangle, color: "text-amber-500" },
    {
      label: "Critical Stock",
      value: stats.criticalCount,
      icon: AlertCircle,
      color: "text-rose-500",
    },
    { label: "Out of Stock", value: stats.outCount, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="rounded-xl border bg-card p-4 shadow-2xs space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium leading-tight">{c.label}</span>
              <Icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <div
              className={`text-xl font-bold tracking-tight ${c.color.includes("font-bold") ? "text-emerald-600 dark:text-emerald-400" : ""}`}
            >
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 13. Inventory Health Component */
function InventoryHealth({ stats }: { stats: any }) {
  const total = stats.totalVariants || 1;
  const healthyPct = Math.round((stats.healthyCount / total) * 100);
  const lowPct = Math.round((stats.lowCount / total) * 100);
  const criticalPct = Math.round((stats.criticalCount / total) * 100);
  const outPct = Math.round((stats.outCount / total) * 100);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Inventory Health Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Distribution of variants across stock status thresholds.
          </p>
        </div>
        <Badge variant="outline" className="gap-1 font-mono text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          {healthyPct}% Healthy
        </Badge>
      </div>

      {/* Visual progress bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          style={{ width: `${healthyPct}%` }}
          className="bg-emerald-500 transition-all"
          title={`Healthy: ${stats.healthyCount}`}
        />
        <div
          style={{ width: `${lowPct}%` }}
          className="bg-amber-400 transition-all"
          title={`Low Stock: ${stats.lowCount}`}
        />
        <div
          style={{ width: `${criticalPct}%` }}
          className="bg-orange-500 transition-all"
          title={`Critical: ${stats.criticalCount}`}
        />
        <div
          style={{ width: `${outPct}%` }}
          className="bg-destructive transition-all"
          title={`Out of Stock: ${stats.outCount}`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <div className="font-semibold">{stats.healthyCount} Variants</div>
            <div className="text-muted-foreground">Healthy Stock</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
          <div>
            <div className="font-semibold">{stats.lowCount} Variants</div>
            <div className="text-muted-foreground">Low Stock</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
          <div>
            <div className="font-semibold">{stats.criticalCount} Variants</div>
            <div className="text-muted-foreground">Critical Stock</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-destructive shrink-0" />
          <div>
            <div className="font-semibold">{stats.outCount} Variants</div>
            <div className="text-muted-foreground">Out of Stock</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 14 & 15. Low Stock Alerts Component */
function LowStockAlerts({ variants }: { variants: AdminVariant[] }) {
  const urgentVariants = useMemo(() => {
    return variants
      .map((v) => {
        const st = getStockStatus(v);
        return { v, st };
      })
      .filter(
        (item) =>
          item.st.category === "low" ||
          item.st.category === "critical" ||
          item.st.category === "out",
      )
      .sort((a, b) => a.st.available - b.st.available)
      .slice(0, 6);
  }, [variants]);

  if (urgentVariants.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 text-center text-muted-foreground">
        <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
        <p className="text-sm font-medium">
          All inventory levels are healthy! No stock alerts right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold">Low Stock &amp; Out of Stock Alerts</h2>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {urgentVariants.length} Urgent Items
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {urgentVariants.map(({ v, st }) => {
          const isOut = st.category === "out";
          return (
            <div
              key={v.id}
              className={`rounded-lg border p-3.5 flex items-start justify-between gap-3 ${
                isOut
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="font-medium text-sm truncate">{v.product_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {[v.size, v.color].filter(Boolean).join(" / ")}
                  </span>
                  <span>·</span>
                  <span className="font-mono">SKU: {v.sku}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge variant={st.tone} className="text-xs font-bold">
                  {isOut ? "Out of Stock" : `${st.available} left`}
                </Badge>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Reorder at ≤ {v.low_stock_threshold}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Color indicator helper */
function getColorIndicator(color?: string | null) {
  if (!color) return null;
  const c = color.toLowerCase();
  let bg = "bg-zinc-400";
  if (c.includes("black") || c.includes("dark")) bg = "bg-zinc-900 dark:bg-zinc-100";
  else if (c.includes("white") || c.includes("cream")) bg = "bg-zinc-100 border border-zinc-300";
  else if (c.includes("red") || c.includes("maroon")) bg = "bg-red-500";
  else if (c.includes("blue") || c.includes("navy")) bg = "bg-blue-500";
  else if (c.includes("green") || c.includes("olive")) bg = "bg-emerald-600";
  else if (c.includes("grey") || c.includes("gray")) bg = "bg-zinc-500";
  return <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${bg}`} title={color} />;
}

/** 20. Inventory Overview Component with 10 columns, sorting, and pagination */
function InventoryOverview({
  groups,
  isLoading,
  onOpenModal,
  onViewHistory,
  onViewDetails,
  sortBy,
  sortDir,
  onSort,
  totalItems,
  allTotalItems,
  safeCurrentPage,
  totalPages,
  pageSize,
  setPageSize,
  setCurrentPage,
  hasActiveFilters,
  clearFilters,
}: {
  groups: Group[];
  isLoading: boolean;
  onOpenModal: (variant: AdminVariant, mode: "add" | "remove" | "set") => void;
  onViewHistory: (variantId: string) => void;
  onViewDetails: (variant: AdminVariant) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  totalItems: number;
  allTotalItems: number;
  safeCurrentPage: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground space-y-3">
        <Package className="mx-auto h-10 w-10 opacity-40" />
        <h3 className="font-semibold text-foreground text-base">No inventory found</h3>
        <p className="text-xs max-w-sm mx-auto">
          Try changing your search or filters to find what you are looking for.
        </p>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="mt-2 text-xs gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.productId} className="rounded-xl border bg-card overflow-hidden shadow-2xs">
          <div className="flex items-center gap-3 border-b p-3.5 bg-muted/20">
            {g.image ? (
              <img src={g.image} alt={g.name} className="h-10 w-10 rounded bg-muted object-cover" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{g.name}</div>
              <div className="text-xs text-muted-foreground">
                {g.variants.length} variant(s) shown on this page
              </div>
            </div>
            <Badge variant={g.isActive ? "default" : "secondary"} className="ml-auto">
              {g.isActive ? "ACTIVE" : "DRAFT"}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/10">
                <tr>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("product")}
                  >
                    <div className="flex items-center gap-1">
                      Product{" "}
                      {sortBy === "product" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("sku")}
                  >
                    <div className="flex items-center gap-1">
                      SKU{" "}
                      {sortBy === "sku" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="p-3">Color</th>
                  <th className="p-3">Size</th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("current_stock")}
                  >
                    <div className="flex items-center gap-1">
                      Current Stock{" "}
                      {sortBy === "current_stock" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("reserved_stock")}
                  >
                    <div className="flex items-center gap-1">
                      Reserved{" "}
                      {sortBy === "reserved_stock" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("available_stock")}
                  >
                    <div className="flex items-center gap-1">
                      Available{" "}
                      {sortBy === "available_stock" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("reorder_level")}
                  >
                    <div className="flex items-center gap-1">
                      Reorder Level{" "}
                      {sortBy === "reorder_level" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status{" "}
                      {sortBy === "status" && (
                        <span className="text-primary font-bold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {g.variants.map((v) => {
                  const st = getStockStatus(v);
                  return (
                    <tr
                      key={v.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {v.product_image ? (
                            <img
                              src={v.product_image}
                              alt={v.product_name}
                              className="h-8 w-8 rounded bg-muted object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span
                            className="font-medium truncate max-w-[180px]"
                            title={v.product_name || "Untitled Product"}
                          >
                            {v.product_name || "Untitled Product"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {v.sku || "Unavailable"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getColorIndicator(v.color)}
                          <span>{v.color || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium">{v.size || "—"}</td>
                      <td className="p-3 font-mono font-semibold">{v.stock_quantity}</td>
                      <td className="p-3 font-mono text-muted-foreground">{v.reserved_stock}</td>
                      <td className="p-3 font-mono font-bold text-foreground">{st.available}</td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {v.low_stock_threshold}
                      </td>
                      <td className="p-3">
                        <Badge variant={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs font-mono text-muted-foreground">
                              SKU: {v.sku || "N/A"}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onViewDetails(v)}
                              className="gap-2 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onOpenModal(v, "add")}
                              className="gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
                            >
                              <Plus className="h-4 w-4" />
                              Add Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onOpenModal(v, "remove")}
                              className="gap-2 cursor-pointer text-rose-600 dark:text-rose-400"
                            >
                              <Minus className="h-4 w-4" />
                              Remove Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onOpenModal(v, "set")}
                              className="gap-2 cursor-pointer"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Adjust / Set Stock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onViewHistory(v.id)}
                              className="gap-2 cursor-pointer"
                            >
                              <History className="h-4 w-4" />
                              View History
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Pagination & Result count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t px-2">
        <div className="text-xs text-muted-foreground">
          Showing {totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–
          {Math.min(safeCurrentPage * pageSize, totalItems)} of {totalItems} matching variants
          {totalItems !== allTotalItems && ` (filtered from ${allTotalItems} total)`}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Rows per page"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            <div className="px-2 text-xs font-medium">
              Page {safeCurrentPage} of {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** View Details Modal */
function VariantDetailsModal({
  variant,
  onClose,
  onOpenModal,
  onViewHistory,
}: {
  variant: AdminVariant | null;
  onClose: () => void;
  onOpenModal: (variant: AdminVariant, mode: "add" | "remove" | "set") => void;
  onViewHistory: (variantId: string) => void;
}) {
  if (!variant) return null;
  const st = getStockStatus(variant);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl space-y-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {variant.product_image ? (
              <img
                src={variant.product_image}
                alt={variant.product_name}
                className="h-14 w-14 rounded-lg bg-muted object-cover border"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center border">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold">{variant.product_name || "Untitled Product"}</h3>
              <div className="text-xs font-mono text-muted-foreground">
                SKU: {variant.sku || "Unavailable"}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border text-xs">
          <div>
            <span className="text-muted-foreground block">Color</span>
            <div className="font-semibold flex items-center gap-1.5 mt-0.5">
              {getColorIndicator(variant.color)}
              <span>{variant.color || "—"}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground block">Size</span>
            <span className="font-semibold text-sm mt-0.5 block">{variant.size || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Status</span>
            <div className="mt-0.5">
              <Badge variant={st.tone}>{st.label}</Badge>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground block">Current Stock</span>
            <span className="font-mono font-bold text-sm text-foreground mt-0.5 block">
              {variant.stock_quantity}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Reserved Stock</span>
            <span className="font-mono font-semibold text-sm text-muted-foreground mt-0.5 block">
              {variant.reserved_stock}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Available Stock</span>
            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {st.available}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Reorder Level</span>
            <span className="font-mono text-sm text-muted-foreground mt-0.5 block">
              ≤ {variant.low_stock_threshold}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Variant ID</span>
            <span
              className="font-mono text-[10px] text-muted-foreground truncate mt-0.5 block"
              title={variant.id}
            >
              {variant.id}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onViewHistory(variant.id);
              }}
              className="gap-1.5 text-xs"
            >
              <History className="h-3.5 w-3.5" />
              View History
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenModal(variant, "remove");
              }}
              className="text-rose-600 hover:text-rose-700 text-xs"
            >
              Remove
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onClose();
                onOpenModal(variant, "add");
              }}
              className="text-xs"
            >
              Add Stock
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
