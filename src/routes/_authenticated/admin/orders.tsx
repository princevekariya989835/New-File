import React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  adminListOrders,
  adminUpdateOrderStatus,
  adminBulkUpdateOrderStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type AdminOrder,
} from "@/lib/admin.functions";
import {
  amazonListTemplates,
  amazonExportOrders,
  type AmazonTemplate,
} from "@/lib/amazon-export.functions";
import { money, dateTime, STATUS_TONE } from "@/components/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  Package,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Truck,
  Clock,
  Calendar,
  MapPin,
  Mail,
  Phone,
  User,
  CreditCard,
} from "lucide-react";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";

type Search = { q?: string; status?: string; payment?: string; from?: string; to?: string };

export const Route = createFileRoute("/_authenticated/admin/orders")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    status: typeof s["status"] === "string" ? s["status"] : undefined,
    payment: typeof s["payment"] === "string" ? s["payment"] : undefined,
    from: typeof s["from"] === "string" ? s["from"] : undefined,
    to: typeof s["to"] === "string" ? s["to"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order Fulfillment & Processing | RIOTOUS Admin Store" },
      { name: "description", content: "Process and fulfill customer orders for RIOTOUS." },
    ],
  }),
  component: OrdersPage,
});

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function invoiceHtml(o: AdminOrder) {
  const rows = o.items
    .map(
      (i) => `<tr>
        <td>${esc(i.product_name)}${i.selected_size ? ` · ${esc(i.selected_size)}` : ""}${i.selected_color ? ` · ${esc(i.selected_color)}` : ""}</td>
        <td style="text-align:center">${esc(i.quantity)}</td>
        <td style="text-align:right">${esc(money(i.price, o.currency))}</td>
        <td style="text-align:right">${esc(money(i.subtotal, o.currency))}</td>
      </tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.order_number)}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,Arial;padding:32px;color:#111}
    h1{letter-spacing:.3em;margin:0 0 4px;font-size:22px}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
    th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left}
    .muted{color:#666;font-size:12px}
    .totals{margin-top:16px;width:260px;margin-left:auto;font-size:13px}
    .totals div{display:flex;justify-content:space-between;padding:4px 0}
    .grand{font-weight:700;border-top:1px solid #111;margin-top:4px;padding-top:6px}
  </style></head><body>
  <h1>RI<span style="color:#f00b11">O</span>T<span style="color:#f00b11">O</span>US</h1>
  <div class="muted">Tax invoice · ${esc(o.order_number)}</div>
  <p class="muted">Date: ${esc(dateTime(o.created_at))}<br/>Payment: ${esc(o.payment_method)} (${esc(o.payment_status)})<br/>Status: ${esc(o.status)}</p>
  <p><strong>Ship to</strong><br/>${esc(o.shipping_name)}<br/>${esc(o.shipping_address).replace(/\n/g, "<br/>")}<br/>${esc(o.shipping_email)}${o.shipping_phone ? `<br/>${esc(o.shipping_phone)}` : ""}</p>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><span>${esc(money(o.subtotal || o.total_amount, o.currency))}</span></div>
    <div><span>Discount${o.discount_code ? ` (${esc(o.discount_code)})` : ""}</span><span>-${esc(money(o.discount_amount, o.currency))}</span></div>
    <div><span>Shipping</span><span>${esc(money(o.shipping_charge, o.currency))}</span></div>
    <div><span>Tax</span><span>${esc(money(o.tax_amount, o.currency))}</span></div>
    <div class="grand"><span>Total</span><span>${esc(money(o.total_amount, o.currency))}</span></div>
  </div>
  <p class="muted" style="margin-top:32px">Thank you for shopping with RIOTOUS.</p>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
}

function csvExport(orders: AdminOrder[]) {
  const head = [
    "Order",
    "Date",
    "Customer",
    "Email",
    "Phone",
    "Status",
    "Payment",
    "Method",
    "Total",
    "Courier",
    "Tracking",
    "Address",
  ];
  const rows = orders.map((o) => [
    o.order_number,
    new Date(o.created_at).toISOString(),
    o.shipping_name,
    o.shipping_email,
    o.shipping_phone ?? "",
    o.status,
    o.payment_status,
    o.payment_method,
    String(o.total_amount),
    o.courier_name ?? "",
    o.tracking_number ?? "",
    o.shipping_address.replace(/\n/g, " "),
  ]);
  const csv = [head, ...rows]
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `riotous-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrdersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const listFn = useServerFn(adminListOrders);
  const updateFn = useServerFn(adminUpdateOrderStatus);
  const bulkFn = useServerFn(adminBulkUpdateOrderStatus);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("Confirmed");

  // Amazon Export state
  const listTemplatesFn = useServerFn(amazonListTemplates);
  const exportFn = useServerFn(amazonExportOrders);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [amazonModalOpen, setAmazonModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [amazonExporting, setAmazonExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const templatesQ = useQuery({
    queryKey: ["admin", "amazon-templates"],
    queryFn: () => listTemplatesFn(),
  });
  const amazonTemplates: AmazonTemplate[] = Array.isArray(templatesQ.data) ? templatesQ.data : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAmazonExport = async () => {
    if (!selectedTemplateId) return toast.error("Select a template.");
    setAmazonExporting(true);
    try {
      const scope = selected.length > 0 ? selected : [];
      const result = await exportFn({
        data: {
          templateId: selectedTemplateId,
          orderIds: scope,
          filters:
            scope.length === 0
              ? {
                  status: search.status,
                  paymentStatus: search.payment,
                  from: search.from,
                  to: search.to,
                }
              : {},
        },
      });
      if (result.warnings.length > 0) {
        toast.warning(
          `Export completed with ${result.warnings.length} missing value(s). Check the file for blank cells.`,
        );
      } else {
        toast.success(`Exported ${result.rowCount} row(s)`);
      }
      // Trigger browser download
      const byteChars = atob(result.base64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
      setAmazonModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Export failed.");
    } finally {
      setAmazonExporting(false);
    }
  };

  const ordersQ = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => listFn(),
    refetchInterval: 20000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin", "variants"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  const update = useMutation({
    mutationFn: (p: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: p }),
    onSuccess: () => {
      toast.success("Order updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: (p: { orderIds: string[]; status: string }) => bulkFn({ data: p }),
    onSuccess: (r) => {
      toast.success(`${r.updated} order(s) updated`);
      setSelected([]);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setSearchKey = (key: keyof Search, value: string) =>
    navigate({
      search: (prev) => ({ ...prev, [key]: value || undefined }),
      replace: true,
    });

  const orders = useMemo(() => (Array.isArray(ordersQ.data) ? ordersQ.data : []), [ordersQ.data]);
  const filtered = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const q = (search.q ?? "").toLowerCase().trim();
    const from = search.from ? new Date(search.from).getTime() : null;
    const to = search.to ? new Date(search.to).getTime() + 86400000 : null;
    return orders.filter((o) => {
      if (!o) return false;
      if (search.status && o.status !== search.status) return false;
      if (search.payment && o.payment_status !== search.payment) return false;
      const t = new Date(o.created_at).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      if (q) {
        const hay =
          `${o.order_number ?? ""} ${o.shipping_name ?? ""} ${o.shipping_email ?? ""} ${o.shipping_phone ?? ""} ${o.tracking_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search]);

  const revenue = useMemo(() => {
    if (!Array.isArray(filtered)) return 0;
    return filtered
      .filter((o) => o && !["Cancelled", "Returned", "Refunded"].includes(o.status))
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
  }, [filtered]);

  return (
    <React.Fragment>
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} order(s) · {money(revenue)} net revenue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setExportMenuOpen((v) => !v)}
            >
              <Download className="h-4 w-4" /> Export
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover shadow-lg py-1">
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                  onClick={() => {
                    csvExport(filtered);
                    setExportMenuOpen(false);
                  }}
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Export RIOTOUS CSV</div>
                    <div className="text-[11px] text-muted-foreground">Standard order export</div>
                  </div>
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                {amazonTemplates.length === 0 ? (
                  <Link
                    to="/admin/settings"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                    onClick={() => setExportMenuOpen(false)}
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Amazon Export</div>
                      <div className="text-[11px] text-muted-foreground">Configure templates first →</div>
                    </div>
                  </Link>
                ) : (
                  amazonTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                      onClick={() => {
                        setSelectedTemplateId(tmpl.id);
                        setAmazonModalOpen(true);
                        setExportMenuOpen(false);
                      }}
                    >
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{tmpl.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {tmpl.purpose} · {tmpl.headers.length} cols
                        </div>
                      </div>
                    </button>
                  ))
                )}
                <div className="h-px bg-border mx-2 my-1" />
                <Link
                  to="/admin/settings"
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
                  onClick={() => setExportMenuOpen(false)}
                >
                  <ExternalLink className="h-3 w-3" /> Manage Amazon Templates
                </Link>
              </div>
            )}
          </div>
          <AdminEraseDataButton
            section="orders"
            sectionLabel="Orders"
            onSuccess={() => refresh()}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search order, name, email, tracking…"
          value={search.q ?? ""}
          onChange={(e) => setSearchKey("q", e.target.value)}
          className="h-9 w-full sm:w-72"
        />
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={search.status ?? ""}
          onChange={(e) => setSearchKey("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={search.payment ?? ""}
          onChange={(e) => setSearchKey("payment", e.target.value)}
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={search.from ?? ""}
          onChange={(e) => setSearchKey("from", e.target.value)}
          className="h-9 w-auto"
        />
        <Input
          type="date"
          value={search.to ?? ""}
          onChange={(e) => setSearchKey("to", e.target.value)}
          className="h-9 w-auto"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <span>{selected.length} selected</span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate({ orderIds: selected, status: bulkStatus })}
          >
            Apply status
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {ordersQ.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h3 className="font-semibold text-lg text-destructive">Failed to load orders from database</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {(ordersQ.error as Error)?.message || "A database query or authorization error occurred while fetching orders."}
          </p>
          <Button variant="outline" className="gap-2" onClick={() => ordersQ.refetch()}>
            <RefreshCw className="h-4 w-4" /> Retry loading orders
          </Button>
        </div>
      ) : ordersQ.isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-64 max-w-full rounded" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-5 w-20 ml-auto rounded" />
                <Skeleton className="h-3 w-14 ml-auto rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-3 shadow-xs">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="font-semibold text-lg">No orders yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            When customer purchases are made on the live RIOTOUS storefront, orders will be recorded and displayed here in real time.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
          <p className="font-medium text-foreground">No orders match these filters.</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or selecting a different status filter.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ search: {}, replace: true })}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const d = new Date(o.created_at);
            const dateStr = !isNaN(d.getTime())
              ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : o.created_at;
            const timeStr = !isNaN(d.getTime())
              ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "";
            const totalQuantity = (o.items ?? []).reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
            const shippingStatusLabel = o.courier_name && o.tracking_number
              ? `${o.courier_name} (${o.tracking_number})`
              : o.status === "Delivered"
                ? "Delivered to Customer"
                : o.status === "Shipped"
                  ? "In Transit / Dispatched"
                  : o.status === "Cancelled"
                    ? "Order Cancelled"
                    : o.status === "Returned"
                      ? "Item Returned"
                      : o.status === "Refunded"
                        ? "Refund Completed"
                        : "Pending Dispatch";

            return (
              <div key={o.id} className="rounded-xl border bg-card overflow-hidden shadow-xs">
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${o.order_number}`}
                        checked={selected.includes(o.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked ? [...s, o.id] : s.filter((x) => x !== o.id),
                          )
                        }
                      />
                      <span className="font-mono font-bold text-base tracking-tight">{o.order_number}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[o.status] ?? "bg-muted text-foreground"}`}>
                        {o.status}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[o.payment_status] ?? "bg-muted text-foreground"}`}>
                        {o.payment_status}
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                        <Truck className="h-3 w-3" /> {shippingStatusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <div className="font-bold text-base text-foreground">{money(o.total_amount, o.currency)}</div>
                        <div className="text-[11px] text-muted-foreground">{totalQuantity} item(s)</div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8 text-xs"
                        onClick={() => {
                          const w = window.open("", "_blank", "width=820,height=900");
                          if (!w) return toast.error("Allow pop-ups to print invoices");
                          w.document.write(invoiceHtml(o));
                          w.document.close();
                        }}
                      >
                        <Printer className="h-3.5 w-3.5" /> Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      >
                        {expanded === o.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Customer, Date, Time, and Products Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" /> {o.shipping_name}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {o.shipping_email}
                      </span>
                      {o.shipping_phone && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {o.shipping_phone}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {dateStr}
                      </span>
                      {timeStr && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeStr}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Products, Quantity, Size, Color summary */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(o.items ?? []).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1 text-xs"
                      >
                        <span className="font-medium text-foreground">{item.product_name}</span>
                        <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-semibold border">
                          Qty: {item.quantity}
                        </span>
                        {item.selected_size && (
                          <span className="rounded bg-background px-1.5 py-0.5 text-[10px] border">
                            Size: {item.selected_size}
                          </span>
                        )}
                        {item.selected_color && (
                          <span className="rounded bg-background px-1.5 py-0.5 text-[10px] border">
                            Color: {item.selected_color}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {expanded === o.id && (
                  <div className="grid gap-6 border-t p-5 lg:grid-cols-2 bg-muted/10">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                          Order Line Items
                        </h3>
                        <div className="space-y-2">
                          {(o.items ?? []).map((i) => {
                            const sides = Object.entries(i.design_preview_images ?? {}).filter(
                              ([, url]) => typeof url === "string" && url.startsWith("data:image/"),
                            );
                            if (sides.length === 0 && i.design_preview) {
                              sides.push(["Design", i.design_preview]);
                            }

                            return (
                              <div key={i.id} className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-start gap-3">
                                  {i.product_image ? (
                                    <img
                                      src={i.product_image}
                                      alt={i.product_name}
                                      className="h-14 w-12 rounded object-contain bg-muted border shrink-0"
                                    />
                                  ) : (
                                    <div className="h-14 w-12 rounded bg-muted flex items-center justify-center border shrink-0">
                                      <Package className="h-5 w-5 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-sm truncate">{i.product_name}</div>
                                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                                      {i.selected_size && <span>Size: <strong>{i.selected_size}</strong></span>}
                                      {i.selected_color && <span>Color: <strong>{i.selected_color}</strong></span>}
                                      {i.design_submission_id && <span className="text-brand-red font-medium">Custom Artwork</span>}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Unit Price: {money(i.price, o.currency)} × {i.quantity}
                                    </div>
                                  </div>
                                  <div className="text-right font-bold text-sm">
                                    {money(i.subtotal, o.currency)}
                                  </div>
                                </div>

                                {sides.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t">
                                    {sides.map(([side, url]) => (
                                      <a
                                        key={side}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="relative block overflow-hidden rounded-md border bg-muted"
                                        title={`View ${side} design`}
                                      >
                                        <img
                                          src={url}
                                          alt={`${side} design`}
                                          className="h-16 w-16 object-contain p-1"
                                        />
                                        <span className="absolute left-1 top-1 rounded bg-background/90 px-1 py-0.5 text-[8px] font-semibold uppercase">
                                          {side}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Financial Totals */}
                      <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
                        <Row label="Subtotal" value={money(o.subtotal || o.total_amount, o.currency)} />
                        {o.discount_amount > 0 && (
                          <Row
                            label={`Discount${o.discount_code ? ` (${o.discount_code})` : ""}`}
                            value={`-${money(o.discount_amount, o.currency)}`}
                          />
                        )}
                        <Row label="Shipping" value={o.shipping_charge > 0 ? money(o.shipping_charge, o.currency) : "FREE"} />
                        <Row label="Tax" value={money(o.tax_amount, o.currency)} />
                        <div className="border-t pt-2">
                          <Row label="Grand Total" value={money(o.total_amount, o.currency)} bold />
                        </div>
                      </div>

                      {/* Customer Addresses */}
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <div className="rounded-lg border bg-card p-3 space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-brand-red" /> Shipping Address
                          </div>
                          <div className="font-medium text-foreground">{o.shipping_name}</div>
                          <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                            {o.shipping_address}
                          </div>
                          {o.shipping_phone && <div className="text-muted-foreground pt-1">{o.shipping_phone}</div>}
                        </div>

                        <div className="rounded-lg border bg-card p-3 space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5 text-brand-red" /> Billing Address
                          </div>
                          <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                            {o.billing_address || o.shipping_address}
                          </div>
                          <div className="pt-1 text-muted-foreground">
                            Payment Method: <strong>{o.payment_method}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <OrderControls
                      order={o}
                      onSave={(p) => update.mutate(p)}
                      busy={update.isPending}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Amazon Export Confirmation Modal */}
    {amazonModalOpen && (
      <AmazonExportModal
        template={amazonTemplates.find((t) => t.id === selectedTemplateId) ?? null}
        exportScope={
          selected.length > 0
            ? `${selected.length} selected order(s)`
            : `${filtered.length} filtered order(s)`
        }
        exporting={amazonExporting}
        onClose={() => setAmazonModalOpen(false)}
        onConfirm={handleAmazonExport}
      />
    )}
    </React.Fragment>
  );
}

function AmazonExportModal({
  template,
  exportScope,
  exporting,
  onClose,
  onConfirm,
}: {
  template: import("@/lib/amazon-export.functions").AmazonTemplate | null;
  exportScope: string;
  exporting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const unmappedCount = template
    ? template.headers.filter((h) => !template.mapping[h]).length
    : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-brand-red" />
            <div>
              <h2 className="font-bold text-base">Amazon Export</h2>
              <p className="text-xs text-muted-foreground">{template?.name}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template</span>
              <span className="font-medium">{template?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purpose</span>
              <span>{template?.purpose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scope</span>
              <span>{exportScope}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Columns</span>
              <span>{template?.headers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mapped</span>
              <span>{(template?.headers.length ?? 0) - unmappedCount}</span>
            </div>
          </div>

          {unmappedCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {unmappedCount} column{unmappedCount > 1 ? "s" : ""} are not mapped
                and will be blank in the output. Go to{" "}
                <Link to="/admin/settings" className="underline">Settings → Amazon Export</Link>{" "}
                to complete the mapping.
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Orders with multiple items generate <strong>one row per item</strong>. The output file
            will exactly match your uploaded Amazon template structure.
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-brand-red text-white hover:bg-brand-red/90"
              disabled={exporting}
              onClick={onConfirm}
            >
              {exporting ? "Generating…" : "Generate & Download"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function OrderControls({
  order,
  onSave,
  busy,
}: {
  order: AdminOrder;
  onSave: (p: {
    orderId: string;
    status?: string;
    paymentStatus?: string;
    courierName?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    adminNotes?: string | null;
  }) => void;
  busy: boolean;
}) {
  const [status, setStatus] = useState(order.status);
  const [payment, setPayment] = useState(order.payment_status);
  const [courier, setCourier] = useState(order.courier_name ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [notes, setNotes] = useState(order.admin_notes ?? "");

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">Manage order</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Order status</Label>
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Payment status</Label>
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Courier</Label>
          <Input value={courier} onChange={(e) => setCourier(e.target.value)} />
        </div>
        <div>
          <Label>Tracking number</Label>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Tracking URL</Label>
          <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Internal notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Marking an order Shipped deducts the reserved stock. Cancelling, returning or refunding it
        puts the stock back automatically.
      </p>
      <Button
        disabled={busy}
        onClick={() =>
          onSave({
            orderId: order.id,
            status,
            paymentStatus: payment,
            courierName: courier.trim() || null,
            trackingNumber: tracking.trim() || null,
            trackingUrl: trackingUrl.trim() || null,
            adminNotes: notes.trim() || null,
          })
        }
      >
        {busy ? "Saving…" : "Save order"}
      </Button>
    </div>
  );
}
