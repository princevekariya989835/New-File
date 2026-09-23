import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2,
  Package,
  ArrowRight,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  ChevronRight,
  Info,
} from "lucide-react";
import { SiteLoader } from "@/components/site-loader";
import { toast } from "sonner";
import { getMyOrders, cancelMyOrder, type CustomerOrder } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createLazyFileRoute("/_authenticated/account/orders")({ component: OrdersPage });

const STATUS_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

function getStatusStepIndex(status: string | null): number {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s === "pending") return 0;
  if (s === "confirmed") return 1;
  if (s === "processing") return 2;
  if (s === "shipped") return 3;
  if (s === "delivered") return 4;
  return -1; // Cancelled, Returned, etc.
}

function OrdersPage() {
  const qc = useQueryClient();
  const fetchOrders = useServerFn(getMyOrders);
  const cancelOrderFn = useServerFn(cancelMyOrder);

  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => cancelOrderFn({ data: { orderId } }),
    onSuccess: (_, orderId) => {
      toast.success("Order has been cancelled and items returned to stock");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setCancellingId(null);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                fulfillmentStatus: "Cancelled",
                cancelledAt: new Date().toISOString(),
              }
            : null,
        );
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to cancel order");
      setCancellingId(null);
    },
  });

  const handleCancel = (order: CustomerOrder) => {
    if (
      confirm(
        `Are you sure you want to cancel order ${order.name}? This cannot be undone and will restore the reserved stock.`,
      )
    ) {
      setCancellingId(order.id);
      cancelMut.mutate(order.id);
    }
  };

  const orders = Array.isArray(data) ? data : [];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 md:px-10 md:py-20">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Account Overview
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            My Orders
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium sm:text-sm text-muted-foreground">
          <Link
            to="/account/returns"
            className="transition-colors hover:text-foreground underline-offset-4 hover:underline"
          >
            Returns &amp; Support →
          </Link>
          <Link
            to="/account/favorites"
            className="transition-colors hover:text-foreground underline-offset-4 hover:underline"
          >
            Saved Favorites →
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20">
          <SiteLoader size="md" text="LOADING YOUR ORDERS..." />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center sm:p-12">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-bold text-foreground">Unable to load your orders</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {(error as Error)?.message ||
              "We encountered an issue connecting to the database. Please check your connection and retry."}
          </p>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="mt-6 rounded-full px-6"
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && orders.length === 0 && (
        <div className="rounded-2xl border border-border bg-secondary/30 py-20 px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">You haven't placed any orders yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Explore our latest oversized streetwear collection and start crafting your look.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            START SHOPPING <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !isError && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((o) => {
            const isCancellable = ["Pending", "Processing"].includes(o.fulfillmentStatus || "");
            const dateStr = new Date(o.processedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const timeStr = new Date(o.processedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <article
                key={o.id}
                className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-border/80 hover:shadow-sm"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/20 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs font-mono font-bold tracking-wider text-foreground">
                        #{o.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dateStr} at {timeStr}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badges */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        o.fulfillmentStatus === "Delivered"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : o.fulfillmentStatus === "Shipped"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : o.fulfillmentStatus === "Cancelled"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {o.fulfillmentStatus || "Pending"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        o.financialStatus === "Paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {o.financialStatus || "Pending"}
                    </span>
                  </div>
                </div>

                {/* Courier / Tracking Notice if Shipped */}
                {o.trackingNumber && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-primary/5 px-6 py-2.5 text-xs text-primary">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Shipped via <strong>{o.courierName || "Courier"}</strong> · Tracking ID:{" "}
                        <strong className="font-mono">{o.trackingNumber}</strong>
                      </span>
                    </div>
                    {o.trackingUrl && (
                      <a
                        href={o.trackingUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80"
                      >
                        Track Package <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Line Items Preview */}
                <div className="p-5 sm:p-6">
                  <div className="divide-y divide-border/50">
                    {o.lineItems.map((li, idx) => (
                      <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                          {li.imageUrl ? (
                            <img
                              src={li.imageUrl}
                              alt={li.title}
                              className={`h-full w-full ${
                                li.designSubmissionId ? "object-contain p-1" : "object-cover"
                              }`}
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.src.endsWith("/products/zoro-black-1.jpg")) {
                                  target.src = "/products/zoro-black-1.jpg";
                                }
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{li.title}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {li.size && (
                              <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">
                                Size: {li.size}
                              </span>
                            )}
                            {li.color && (
                              <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">
                                Color: {li.color}
                              </span>
                            )}
                            <span>Qty: {li.quantity}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">
                            {li.price ? formatPrice(li.price.amount, li.price.currencyCode) : "—"}
                          </p>
                          {li.quantity > 1 && li.price && (
                            <p className="text-[11px] text-muted-foreground">
                              Total:{" "}
                              {formatPrice(
                                String(parseFloat(li.price.amount) * li.quantity),
                                li.price.currencyCode,
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Bar: Total & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-secondary/10 p-5 sm:p-6">
                  <div>
                    <span className="text-xs text-muted-foreground">Total Amount</span>
                    <p className="text-lg font-black text-foreground">
                      {formatPrice(o.total.amount, o.total.currencyCode)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-semibold"
                      onClick={() => setSelectedOrder(o)}
                    >
                      View Order Details <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>

                    {isCancellable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={cancelMut.isPending && cancellingId === o.id}
                        onClick={() => handleCancel(o)}
                      >
                        {cancelMut.isPending && cancellingId === o.id ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Cancelling…
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Order
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Order Details Modal Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-2xl">
            <DialogHeader className="border-b border-border pb-4 text-left">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">
                    Order #{selectedOrder.name}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-muted-foreground">
                    Placed on{" "}
                    {new Date(selectedOrder.processedAt).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                      selectedOrder.fulfillmentStatus === "Delivered"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : selectedOrder.fulfillmentStatus === "Shipped"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : selectedOrder.fulfillmentStatus === "Cancelled"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {selectedOrder.fulfillmentStatus || "Pending"}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {selectedOrder.financialStatus || "Pending"}
                  </span>
                </div>
              </div>
            </DialogHeader>

            {/* Status Timeline */}
            <div className="py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order Status Tracker
              </p>

              {selectedOrder.fulfillmentStatus === "Cancelled" ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Order Cancelled</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This order was cancelled and items were restored to inventory.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {STATUS_STEPS.map((step, idx) => {
                    const currentIndex = getStatusStepIndex(selectedOrder.fulfillmentStatus);
                    const isCompleted = currentIndex >= idx;
                    const isCurrent = currentIndex === idx;

                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                            isCompleted
                              ? "bg-foreground text-background shadow-sm"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span
                          className={`mt-1.5 text-[11px] font-medium leading-tight ${
                            isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tracking Banner if Shipped */}
            {selectedOrder.trackingNumber && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <Truck className="h-4 w-4" /> Shipment In Transit
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Courier: <strong>{selectedOrder.courierName || "Standard Delivery"}</strong> · Tracking
                    No: <strong className="font-mono">{selectedOrder.trackingNumber}</strong>
                  </p>
                </div>
                {selectedOrder.trackingUrl && (
                  <a
                    href={selectedOrder.trackingUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1"
                  >
                    Track Package <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Itemized Products */}
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Items in this Order ({selectedOrder.lineItems.length})
              </p>
              <div className="divide-y divide-border">
                {selectedOrder.lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.endsWith("/products/zoro-black-1.jpg")) {
                              target.src = "/products/zoro-black-1.jpg";
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.size && <span>Size: <strong>{item.size}</strong></span>}
                        {item.color && <span>Color: <strong>{item.color}</strong></span>}
                        <span>Qty: <strong>{item.quantity}</strong></span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-bold">
                        {item.price ? formatPrice(item.price.amount, item.price.currencyCode) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment &amp; Price Breakdown
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>
                    {formatPrice(selectedOrder.subtotal.amount, selectedOrder.subtotal.currencyCode)}
                  </span>
                </div>
                {parseFloat(selectedOrder.discount.amount) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>
                      Discount {selectedOrder.discount.code ? `(${selectedOrder.discount.code})` : ""}
                    </span>
                    <span>
                      -{formatPrice(selectedOrder.discount.amount, selectedOrder.discount.currencyCode)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>
                    {parseFloat(selectedOrder.shippingCharge.amount) === 0
                      ? "FREE"
                      : formatPrice(
                          selectedOrder.shippingCharge.amount,
                          selectedOrder.shippingCharge.currencyCode,
                        )}
                  </span>
                </div>
                {parseFloat(selectedOrder.taxAmount.amount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimated Tax</span>
                    <span>
                      {formatPrice(selectedOrder.taxAmount.amount, selectedOrder.taxAmount.currencyCode)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-black text-foreground">
                  <span>Total Paid</span>
                  <span>{formatPrice(selectedOrder.total.amount, selectedOrder.total.currencyCode)}</span>
                </div>
                {selectedOrder.paymentMethod && (
                  <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Paid via: {selectedOrder.paymentMethod}
                  </p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Shipping Address
              </p>
              <div className="rounded-xl bg-secondary/30 p-3 text-xs leading-relaxed">
                <p className="font-bold text-foreground">{selectedOrder.shipping.name}</p>
                <p className="text-muted-foreground">{selectedOrder.shipping.address}</p>
                {selectedOrder.shipping.phone && (
                  <p className="text-muted-foreground">Phone: {selectedOrder.shipping.phone}</p>
                )}
                <p className="text-muted-foreground">Email: {selectedOrder.shipping.email}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/account/returns"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Info className="h-3.5 w-3.5" /> Need to request a return or exchange?
              </Link>

              <div className="flex items-center gap-2">
                {["Pending", "Processing"].includes(selectedOrder.fulfillmentStatus || "") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                    disabled={cancelMut.isPending && cancellingId === selectedOrder.id}
                    onClick={() => handleCancel(selectedOrder)}
                  >
                    {cancelMut.isPending && cancellingId === selectedOrder.id ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Cancelling…
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Order
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-xs font-semibold"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
