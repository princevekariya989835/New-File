import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  adminListShipments,
  adminUpdateShipmentStatus,
  adminSaveTrackingNumber,
  adminCreateShipment,
  type AdminShipment,
  type ShipmentStatus,
  type ShippingMethod,
  type Carrier,
} from "@/lib/admin-shipping.functions";
import { adminListOrders } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import {
  Truck,
  Package,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar,
  ExternalLink,
  Edit3,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";

export const Route = createLazyFileRoute("/_authenticated/admin/shipping")({ component: AdminShippingPage });

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Processing: "bg-blue-50 text-blue-700 border-blue-200",
  Packed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Shipped: "bg-purple-50 text-purple-700 border-purple-200",
  "In Transit": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Out for Delivery": "bg-teal-50 text-teal-700 border-teal-200",
  Delivered: "bg-green-50 text-green-700 border-green-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  Returned: "bg-orange-50 text-orange-700 border-orange-200",
};

export function AdminShippingPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListShipments);
  const updateStatusFn = useServerFn(adminUpdateShipmentStatus);
  const saveTrackingFn = useServerFn(adminSaveTrackingNumber);
  const createShipmentFn = useServerFn(adminCreateShipment);
  const listOrdersFn = useServerFn(adminListOrders);

  const {
    data: shipments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: async () => listFn(),
    staleTime: 1000 * 30,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders-for-shipping"],
    queryFn: async () => {
      const res: any = await listOrdersFn({ data: { limit: 50 } });
      return Array.isArray(res) ? res : res?.orders || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [carrierFilter, setCarrierFilter] = useState<string>("All");
  const [methodFilter, setMethodFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All Time");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [selectedShipment, setSelectedShipment] = useState<AdminShipment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditTrackingOpen, setIsEditTrackingOpen] = useState(false);

  // Create form state
  const [newOrderId, setNewOrderId] = useState("");
  const [newCarrier, setNewCarrier] = useState<Carrier>("Delhivery");
  const [newMethod, setNewMethod] = useState<ShippingMethod>("Standard");
  const [newCost, setNewCost] = useState("99");
  const [newTracking, setNewTracking] = useState("");
  const [newEstDate, setNewEstDate] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPostal, setNewPostal] = useState("");
  const [newNote, setNewNote] = useState("");

  // Tracking edit state
  const [editTrackingNumber, setEditTrackingNumber] = useState("");
  const [editCarrier, setEditCarrier] = useState<Carrier>("Delhivery");

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ShipmentStatus }) => {
      return updateStatusFn({ data: { shipmentId: id, newStatus: status } });
    },
    onSuccess: () => {
      toast.success("Shipment status updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-shipments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update shipment status");
    },
  });

  const saveTrackingMutation = useMutation({
    mutationFn: async ({
      id,
      trackingNumber,
      carrier,
    }: {
      id: string;
      trackingNumber: string;
      carrier: Carrier;
    }) => {
      return saveTrackingFn({ data: { shipmentId: id, trackingNumber, carrier } });
    },
    onSuccess: () => {
      toast.success("Tracking number updated");
      qc.invalidateQueries({ queryKey: ["admin-shipments"] });
      setIsEditTrackingOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save tracking number");
    },
  });

  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!newOrderId) throw new Error("Order required");
      return createShipmentFn({
        data: {
          orderId: newOrderId,
          carrier: newCarrier,
          shippingMethod: newMethod,
          shippingCost: Number(newCost) || 0,
          trackingNumber: newTracking || undefined,
          estimatedDeliveryDate: newEstDate ? new Date(newEstDate).toISOString() : undefined,
          shippingAddress: newAddress || "123 Street",
          city: newCity || "Mumbai",
          state: newState || "Maharashtra",
          postalCode: newPostal || "400001",
          adminNote: newNote || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Shipment created successfully");
      qc.invalidateQueries({ queryKey: ["admin-shipments"] });
      setIsCreateOpen(false);
      // Reset form
      setNewOrderId("");
      setNewTracking("");
      setNewAddress("");
      setNewCity("");
      setNewState("");
      setNewPostal("");
      setNewNote("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create shipment");
    },
  });

  // Summary counts
  const stats = useMemo<Record<string, number>>(() => {
    const total = shipments.length;
    const counts: Record<string, number> = {
      Pending: 0,
      Processing: 0,
      Packed: 0,
      Shipped: 0,
      "In Transit": 0,
      "Out for Delivery": 0,
      Delivered: 0,
      Failed: 0,
      Returned: 0,
    };
    for (const s of shipments) {
      if (counts[s.status] !== undefined) {
        counts[s.status]++;
      }
    }
    return { total, ...counts };
  }, [shipments]);

  // Alerts
  const alerts = useMemo(() => {
    const list: string[] = [];
    const missingTracking = shipments.filter(
      (s) => !s.trackingNumber && s.status !== "Pending" && s.status !== "Cancelled",
    ).length;
    if (missingTracking > 0) {
      list.push(`${missingTracking} active shipment(s) have no tracking number.`);
    }
    const failedCount = shipments.filter((s) => s.status === "Failed").length;
    if (failedCount > 0) {
      list.push(`${failedCount} shipment delivery has failed and requires attention.`);
    }
    const returnedCount = shipments.filter((s) => s.status === "Returned").length;
    if (returnedCount > 0) {
      list.push(`${returnedCount} returned shipment(s) received.`);
    }
    return list;
  }, [shipments]);

  // Filtered & Sorted Shipments
  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        // Search
        const search = searchTerm.toLowerCase();
        const matchSearch =
          !search ||
          s.id.toLowerCase().includes(search) ||
          s.orderNumber.toLowerCase().includes(search) ||
          s.customerName.toLowerCase().includes(search) ||
          (s.trackingNumber && s.trackingNumber.toLowerCase().includes(search)) ||
          s.carrier.toLowerCase().includes(search) ||
          s.city.toLowerCase().includes(search) ||
          s.state.toLowerCase().includes(search) ||
          s.postalCode.toLowerCase().includes(search);

        // Status
        const matchStatus = statusFilter === "All" || s.status === statusFilter;
        // Carrier
        const matchCarrier = carrierFilter === "All" || s.carrier === carrierFilter;
        // Method
        const matchMethod = methodFilter === "All" || s.shippingMethod === methodFilter;

        // Date filter
        let matchDate = true;
        if (dateFilter !== "All Time") {
          const d = new Date(s.createdAt);
          const now = new Date();
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          if (dateFilter === "Today") matchDate = diffDays <= 1;
          else if (dateFilter === "Last 7 Days") matchDate = diffDays <= 7;
          else if (dateFilter === "Last 30 Days") matchDate = diffDays <= 30;
        }

        return matchSearch && matchStatus && matchCarrier && matchMethod && matchDate;
      })
      .sort((a, b) => {
        let valA: any = a.createdAt;
        let valB: any = b.createdAt;
        if (sortBy === "oldest") {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          return sortOrder === "asc" ? valA - valB : valB - valA;
        } else if (sortBy === "order_id") {
          valA = a.orderNumber;
          valB = b.orderNumber;
        } else if (sortBy === "customer") {
          valA = a.customerName;
          valB = b.customerName;
        } else if (sortBy === "cost") {
          valA = a.shippingCost;
          valB = b.shippingCost;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        } else if (sortBy === "estimated_delivery") {
          valA = a.estimatedDeliveryDate ? new Date(a.estimatedDeliveryDate).getTime() : 0;
          valB = b.estimatedDeliveryDate ? new Date(b.estimatedDeliveryDate).getTime() : 0;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        } else if (sortBy === "status") {
          valA = a.status;
          valB = b.status;
        } else {
          // newest
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    shipments,
    searchTerm,
    statusFilter,
    carrierFilter,
    methodFilter,
    dateFilter,
    sortBy,
    sortOrder,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredShipments.length / pageSize) || 1;
  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, currentPage, pageSize]);

  // Performance metrics
  const performance = useMemo(() => {
    const total = shipments.length;
    if (total === 0)
      return {
        delivered: 0,
        inTransit: 0,
        failed: 0,
        returned: 0,
        deliveryRate: 0,
        failureRate: 0,
        returnRate: 0,
      };
    const delivered = shipments.filter((s) => s.status === "Delivered").length;
    const inTransit = shipments.filter(
      (s) => s.status === "In Transit" || s.status === "Out for Delivery" || s.status === "Shipped",
    ).length;
    const failed = shipments.filter((s) => s.status === "Failed").length;
    const returned = shipments.filter((s) => s.status === "Returned").length;

    return {
      delivered,
      inTransit,
      failed,
      returned,
      deliveryRate: ((delivered / total) * 100).toFixed(1),
      failureRate: ((failed / total) * 100).toFixed(1),
      returnRate: ((returned / total) * 100).toFixed(1),
    };
  }, [shipments]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Shipping Management</h1>
          <p className="text-sm text-gray-500">
            Monitor shipments, carrier performance, tracking, and delivery workflows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-black text-white hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" /> Create Shipment
          </Button>
          <AdminEraseDataButton
            section="shipping"
            sectionLabel="Shipping & Shipments"
            onSuccess={() => refetch()}
          />
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900">Shipping Attention Required</h4>
            <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
              {alerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Shipments", value: stats.total, color: "text-gray-900" },
          { label: "Pending", value: stats.Pending, color: "text-yellow-600" },
          { label: "Processing", value: stats.Processing, color: "text-blue-600" },
          { label: "Packed", value: stats.Packed, color: "text-indigo-600" },
          { label: "Shipped", value: stats.Shipped, color: "text-purple-600" },
          { label: "In Transit", value: stats["In Transit"], color: "text-cyan-600" },
          { label: "Out for Delivery", value: stats["Out for Delivery"], color: "text-teal-600" },
          { label: "Delivered", value: stats.Delivered, color: "text-green-600" },
          { label: "Failed", value: stats.Failed, color: "text-red-600" },
          { label: "Returned", value: stats.Returned, color: "text-orange-600" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1"
          >
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {stat.label}
            </span>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Shipping Performance Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Shipping Performance & Rates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">Delivery Rate</span>
            <div className="text-2xl font-bold text-green-700 mt-1">
              {performance.deliveryRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {performance.delivered} of {stats.total} delivered
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">Failure Rate</span>
            <div className="text-2xl font-bold text-red-600 mt-1">{performance.failureRate}%</div>
            <p className="text-xs text-gray-500 mt-1">{performance.failed} delivery failures</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">Return Rate</span>
            <div className="text-2xl font-bold text-orange-600 mt-1">{performance.returnRate}%</div>
            <p className="text-xs text-gray-500 mt-1">{performance.returned} returned shipments</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">Active In Transit</span>
            <div className="text-2xl font-bold text-cyan-600 mt-1">{performance.inTransit}</div>
            <p className="text-xs text-gray-500 mt-1">En route or dispatched</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search shipment, order ID, customer, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
            >
              <option value="All">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Carrier Filter */}
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
            >
              <option value="All">All Carriers</option>
              <option value="Delhivery">Delhivery</option>
              <option value="Blue Dart">Blue Dart</option>
              <option value="DTDC">DTDC</option>
              <option value="Ecom Express">Ecom Express</option>
              <option value="India Post">India Post</option>
              <option value="Other">Other</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
            >
              <option value="All">All Methods</option>
              <option value="Standard">Standard</option>
              <option value="Express">Express</option>
              <option value="Same Day">Same Day</option>
              <option value="Free Shipping">Free Shipping</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>

            {/* Clear filters */}
            {(searchTerm ||
              statusFilter !== "All" ||
              carrierFilter !== "All" ||
              methodFilter !== "All" ||
              dateFilter !== "All Time") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setCarrierFilter("All");
                  setMethodFilter("All");
                  setDateFilter("All Time");
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Sorting and Page Size */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-gray-100 gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 px-2 rounded border border-gray-200 bg-white text-gray-700 text-xs font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="order_id">Order ID</option>
              <option value="customer">Customer Name</option>
              <option value="cost">Shipping Cost</option>
              <option value="estimated_delivery">Estimated Delivery</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1.5 border border-gray-200 rounded hover:bg-gray-50"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 rounded border border-gray-200 bg-white text-gray-700 text-xs font-medium"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shipment Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Shipment</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Carrier</th>
                <th className="py-3 px-4">Tracking Number</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Est. Delivery</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Loading shipments...
                  </td>
                </tr>
              ) : paginatedShipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    No shipments found.
                  </td>
                </tr>
              ) : (
                paginatedShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      <div>{s.id}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to="/admin/orders"
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {s.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{s.customerName}</div>
                      <div className="text-xs text-gray-500">
                        {s.city}, {s.state}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">{s.carrier}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      {s.trackingNumber ? (
                        s.trackingNumber
                      ) : (
                        <span className="text-amber-600 italic">No tracking</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{s.shippingMethod}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      ₹{s.shippingCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {s.estimatedDeliveryDate
                        ? new Date(s.estimatedDeliveryDate).toLocaleDateString()
                        : "TBD"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={`border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[s.status] || ""}`}
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedShipment(s);
                          setIsDetailsOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      <select
                        value={s.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            id: s.id,
                            status: e.target.value as ShipmentStatus,
                          })
                        }
                        className="h-8 px-2 text-xs rounded border border-gray-200 bg-white font-medium"
                      >
                        {Object.keys(STATUS_COLORS).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing {filteredShipments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredShipments.length)} of{" "}
            {filteredShipments.length} shipments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-medium">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Shipment Details Modal / Sheet */}
      {isDetailsOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Shipment Details: {selectedShipment.id}
                </h2>
                <p className="text-xs text-gray-500">
                  Linked to Order {selectedShipment.orderNumber}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsDetailsOpen(false)}>
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipment Info */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Shipment Information</h4>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Status:</span>{" "}
                    <Badge
                      className={`border text-[10px] ${STATUS_COLORS[selectedShipment.status]}`}
                    >
                      {selectedShipment.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Carrier:</span>{" "}
                    <span className="font-medium text-gray-900">{selectedShipment.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tracking No:</span>
                    <span className="font-mono font-medium text-indigo-600">
                      {selectedShipment.trackingNumber || "None"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {selectedShipment.shippingMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>{" "}
                    <span className="font-medium text-gray-900">
                      ₹{selectedShipment.shippingCost}
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs gap-1"
                    onClick={() => {
                      setEditTrackingNumber(selectedShipment.trackingNumber || "");
                      setEditCarrier(selectedShipment.carrier);
                      setIsEditTrackingOpen(true);
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Tracking & Carrier
                  </Button>
                </div>
              </div>

              {/* Customer & Address */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Customer & Delivery Address</h4>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="font-medium text-gray-900">{selectedShipment.customerName}</div>
                  {selectedShipment.customerEmail && <div>{selectedShipment.customerEmail}</div>}
                  {selectedShipment.customerPhone && <div>{selectedShipment.customerPhone}</div>}
                  <div className="pt-1 text-gray-800 font-medium">
                    {selectedShipment.shippingAddress}
                  </div>
                  <div>
                    {selectedShipment.city}, {selectedShipment.state} -{" "}
                    {selectedShipment.postalCode}
                  </div>
                  <div>{selectedShipment.country}</div>
                </div>
              </div>
            </div>

            {/* Delivery Dates & Timeline */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Delivery Timeline</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Created At</span>
                  <div className="font-medium text-gray-900">
                    {new Date(selectedShipment.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Shipped At</span>
                  <div className="font-medium text-gray-900">
                    {selectedShipment.shippedAt
                      ? new Date(selectedShipment.shippedAt).toLocaleString()
                      : "Pending"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Est. Delivery</span>
                  <div className="font-medium text-gray-900">
                    {selectedShipment.estimatedDeliveryDate
                      ? new Date(selectedShipment.estimatedDeliveryDate).toLocaleDateString()
                      : "TBD"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Delivered At</span>
                  <div className="font-medium text-gray-900">
                    {selectedShipment.deliveredAt
                      ? new Date(selectedShipment.deliveredAt).toLocaleString()
                      : "In Progress"}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Order Items ({selectedShipment.orderItems.length})
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[320px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Variant</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedShipment.orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 font-medium text-gray-900">{item.productName}</td>
                        <td className="p-3 text-gray-500">
                          {item.size || "-"} / {item.color || "-"}
                        </td>
                        <td className="p-3 text-gray-900 font-medium">{item.quantity}</td>
                        <td className="p-3 text-right font-medium text-gray-900">₹{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Link
                to="/admin/orders"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                View Order Details
              </Link>
              <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tracking Modal */}
      {isEditTrackingOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Update Tracking & Carrier</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Carrier</label>
                <select
                  value={editCarrier}
                  onChange={(e) => setEditCarrier(e.target.value as Carrier)}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                >
                  <option value="Delhivery">Delhivery</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Ecom Express">Ecom Express</option>
                  <option value="India Post">India Post</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tracking Number
                </label>
                <Input
                  value={editTrackingNumber}
                  onChange={(e) => setEditTrackingNumber(e.target.value)}
                  placeholder="e.g. TRK98374928"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditTrackingOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  saveTrackingMutation.mutate({
                    id: selectedShipment.id,
                    trackingNumber: editTrackingNumber,
                    carrier: editCarrier,
                  })
                }
              >
                Save Tracking
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Shipment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">Create New Shipment</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Order *
                </label>
                <select
                  value={newOrderId}
                  onChange={(e) => {
                    setNewOrderId(e.target.value);
                    const ord = orders.find((o: any) => o.id === e.target.value);
                    if (ord) {
                      setNewAddress(ord.shipping_address || "");
                      setNewCity("Mumbai");
                      setNewState("Maharashtra");
                      setNewPostal("400001");
                    }
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                >
                  <option value="">-- Choose Order --</option>
                  {orders.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.shipping_name} (₹{o.total_amount})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Carrier *</label>
                  <select
                    value={newCarrier}
                    onChange={(e) => setNewCarrier(e.target.value as Carrier)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="Blue Dart">Blue Dart</option>
                    <option value="DTDC">DTDC</option>
                    <option value="Ecom Express">Ecom Express</option>
                    <option value="India Post">India Post</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shipping Method *
                  </label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as ShippingMethod)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Express">Express</option>
                    <option value="Same Day">Same Day</option>
                    <option value="Free Shipping">Free Shipping</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shipping Cost (₹) *
                  </label>
                  <Input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <Input
                    value={newTracking}
                    onChange={(e) => setNewTracking(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estimated Delivery Date
                </label>
                <Input
                  type="date"
                  value={newEstDate}
                  onChange={(e) => setNewEstDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shipping Address *
                </label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street Address"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="State"
                />
                <Input
                  value={newPostal}
                  onChange={(e) => setNewPostal(e.target.value)}
                  placeholder="Postal Code"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Admin Note</label>
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Optional handling instructions"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createShipmentMutation.mutate()}
                disabled={createShipmentMutation.isPending}
              >
                {createShipmentMutation.isPending ? "Creating..." : "Create Shipment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
