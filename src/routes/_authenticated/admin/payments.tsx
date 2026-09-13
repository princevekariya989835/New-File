import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  adminListPayments,
  adminUpdatePaymentStatus,
  type AdminPayment,
  type PaymentStatus,
  type PaymentMethod,
} from "@/lib/admin-payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import {
  CreditCard,
  Receipt,
  Search,
  ArrowUpDown,
  Eye,
  RefreshCcw,
  ShieldAlert,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPaymentsPage,
  head: () => ({
    meta: [
      { title: "Payment Gateway & Transactions | RIOTOUS Admin Store" },
      {
        name: "description",
        content: "Manage store transactions, payment statuses, refunds, and financial performance.",
      },
    ],
  }),
});

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Processing: "bg-blue-50 text-blue-700 border-blue-200",
  Paid: "bg-green-50 text-green-700 border-green-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  "Partially Refunded": "bg-orange-50 text-orange-700 border-orange-200",
  Refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export function AdminPaymentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPayments);
  const updatePaymentStatusFn = useServerFn(adminUpdatePaymentStatus);

  const {
    data: payments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => listFn(),
  });

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [methodFilter, setMethodFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All Time");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal State
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [refundInput, setRefundInput] = useState<string>("");
  const [adminNoteInput, setAdminNoteInput] = useState<string>("");

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      refundAmount,
      adminNote,
    }: {
      id: string;
      status: PaymentStatus;
      refundAmount?: number;
      adminNote?: string;
    }) => {
      return updatePaymentStatusFn({
        data: { paymentId: id, newStatus: status, refundAmount, adminNote },
      });
    },
    onSuccess: () => {
      toast.success("Payment status updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update payment status");
    },
  });

  // Summary counts & totals
  const stats = useMemo(() => {
    const totalPayments = payments.length;
    let pendingPayments = 0;
    let processing = 0;
    let paid = 0;
    let failed = 0;
    let refunded = 0;
    let totalPaymentAmount = 0;
    let totalRefundAmount = 0;

    for (const p of payments) {
      if (p.status === "Pending") pendingPayments++;
      if (p.status === "Processing") processing++;
      if (p.status === "Paid") paid++;
      if (p.status === "Failed") failed++;
      if (p.status === "Refunded" || p.status === "Partially Refunded") refunded++;

      totalPaymentAmount += p.amount;
      totalRefundAmount += p.refundAmount;
    }

    return {
      totalPayments,
      pendingPayments,
      processing,
      paid,
      failed,
      refunded,
      totalPaymentAmount,
      totalRefundAmount,
    };
  }, [payments]);

  // Alerts
  const alerts = useMemo(() => {
    const list: string[] = [];
    const failedPayments = payments.filter((p) => p.status === "Failed").length;
    if (failedPayments > 0) {
      list.push(`${failedPayments} payment transaction(s) failed.`);
    }
    const pendingCount = payments.filter((p) => p.status === "Pending").length;
    if (pendingCount > 0) {
      list.push(`${pendingCount} payment(s) pending processing.`);
    }
    return list;
  }, [payments]);

  // Filtered & Sorted Payments
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const search = searchTerm.toLowerCase();
        const matchSearch =
          !search ||
          p.id.toLowerCase().includes(search) ||
          p.orderNumber.toLowerCase().includes(search) ||
          p.customerName.toLowerCase().includes(search) ||
          (p.transactionId && p.transactionId.toLowerCase().includes(search)) ||
          p.paymentMethod.toLowerCase().includes(search);

        const matchStatus = statusFilter === "All" || p.status === statusFilter;
        const matchMethod = methodFilter === "All" || p.paymentMethod === methodFilter;

        let matchDate = true;
        if (dateFilter !== "All Time") {
          const d = new Date(p.createdAt);
          const now = new Date();
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          if (dateFilter === "Today") matchDate = diffDays <= 1;
          else if (dateFilter === "Last 7 Days") matchDate = diffDays <= 7;
          else if (dateFilter === "Last 30 Days") matchDate = diffDays <= 30;
        }

        return matchSearch && matchStatus && matchMethod && matchDate;
      })
      .sort((a, b) => {
        let valA: any = a.createdAt;
        let valB: any = b.createdAt;
        if (sortBy === "oldest") {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          return sortOrder === "asc" ? valA - valB : valB - valA;
        } else if (sortBy === "amount") {
          valA = a.amount;
          valB = b.amount;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        } else if (sortBy === "customer") {
          valA = a.customerName;
          valB = b.customerName;
        } else if (sortBy === "method") {
          valA = a.paymentMethod;
          valB = b.paymentMethod;
        } else if (sortBy === "status") {
          valA = a.status;
          valB = b.status;
        } else if (sortBy === "refund") {
          valA = a.refundAmount;
          valB = b.refundAmount;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        } else {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [payments, searchTerm, statusFilter, methodFilter, dateFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Performance
  const performance = useMemo(() => {
    const total = payments.length;
    if (total === 0) return { successRate: "0.0", paidCount: 0, failedCount: 0 };
    const paidCount = payments.filter(
      (p) => p.status === "Paid" || p.status === "Partially Refunded" || p.status === "Refunded",
    ).length;
    const failedCount = payments.filter((p) => p.status === "Failed").length;
    return {
      successRate: ((paidCount / total) * 100).toFixed(1),
      paidCount,
      failedCount,
    };
  }, [payments]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payments Management</h1>
          <p className="text-sm text-gray-500">
            Track financial transactions, payment statuses, refunds, and gateway performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </Button>
          <AdminEraseDataButton
            section="payments"
            sectionLabel="Payments & Transactions"
            onSuccess={() => refetch()}
          />
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900">Payment Attention Required</h4>
            <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
              {alerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Payments
          </span>
          <div className="text-xl font-bold text-gray-900">{stats.totalPayments}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Pending Payments
          </span>
          <div className="text-xl font-bold text-yellow-600">{stats.pendingPayments}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Paid Success
          </span>
          <div className="text-xl font-bold text-green-600">{stats.paid}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Failed / Refunded
          </span>
          <div className="text-xl font-bold text-red-600">{stats.failed + stats.refunded}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Payment Volume
          </span>
          <div className="text-2xl font-bold text-gray-900">
            ₹{stats.totalPaymentAmount.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Refunded Amount
          </span>
          <div className="text-2xl font-bold text-purple-600">
            ₹{stats.totalRefundAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Payment Performance Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Performance & Success Rate</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">
              Payment Success Rate
            </span>
            <div className="text-2xl font-bold text-green-700 mt-1">{performance.successRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {performance.paidCount} successful attempts
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">Total Paid Volume</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ₹{stats.totalPaymentAmount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Net revenue collected</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-medium">Total Refunds</span>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              ₹{stats.totalRefundAmount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Processed returns/refunds</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search payment ID, order ID, customer, TXN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
            >
              <option value="All">All Statuses</option>
              {Object.keys(PAYMENT_STATUS_COLORS).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
            >
              <option value="All">All Methods</option>
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Wallet">Wallet</option>
              <option value="Other">Other</option>
            </select>

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

            {(searchTerm ||
              statusFilter !== "All" ||
              methodFilter !== "All" ||
              dateFilter !== "All Time") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
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

        {/* Sorting & Page Size */}
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
              <option value="amount">Amount</option>
              <option value="customer">Customer</option>
              <option value="method">Payment Method</option>
              <option value="status">Status</option>
              <option value="refund">Refund Amount</option>
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

      {/* Payment Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Refund</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{p.id}</td>
                    <td className="py-3 px-4">
                      <Link
                        to="/admin/orders"
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {p.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{p.customerName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      {p.transactionId ? (
                        p.transactionId
                      ) : (
                        <span className="text-gray-400 italic">No TXN</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={`border px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[p.status] || ""}`}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-purple-700 font-medium text-xs">
                      {p.refundAmount > 0 ? `₹${p.refundAmount}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPayment(p);
                          setRefundInput(String(p.refundAmount || 0));
                          setAdminNoteInput(p.adminNote || "");
                          setIsDetailsOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      <select
                        value={p.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            id: p.id,
                            status: e.target.value as PaymentStatus,
                          })
                        }
                        className="h-8 px-2 text-xs rounded border border-gray-200 bg-white font-medium"
                      >
                        {Object.keys(PAYMENT_STATUS_COLORS).map((st) => (
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
            Showing {filteredPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length}{" "}
            payments
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

      {/* Payment Details Modal */}
      {isDetailsOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Payment Details: {selectedPayment.id}
                </h2>
                <p className="text-xs text-gray-500">
                  Linked to Order {selectedPayment.orderNumber}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsDetailsOpen(false)}>
                ✕
              </Button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <h4 className="font-semibold text-gray-900">Payment Information</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    Status:{" "}
                    <Badge
                      className={`border text-[10px] ${PAYMENT_STATUS_COLORS[selectedPayment.status]}`}
                    >
                      {selectedPayment.status}
                    </Badge>
                  </div>
                  <div>
                    Method:{" "}
                    <span className="font-medium text-gray-900">
                      {selectedPayment.paymentMethod}
                    </span>
                  </div>
                  <div>
                    Amount:{" "}
                    <span className="font-bold text-gray-900">₹{selectedPayment.amount}</span>
                  </div>
                  <div>
                    Currency:{" "}
                    <span className="font-medium text-gray-900">{selectedPayment.currency}</span>
                  </div>
                  <div className="col-span-2">
                    TXN ID:{" "}
                    <span className="font-mono text-indigo-600">
                      {selectedPayment.transactionId || "N/A"}
                    </span>
                  </div>
                  <div>
                    Paid At:{" "}
                    {selectedPayment.paidAt
                      ? new Date(selectedPayment.paidAt).toLocaleString()
                      : "Not paid"}
                  </div>
                  <div>Updated At: {new Date(selectedPayment.updatedAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <h4 className="font-semibold text-gray-900">Customer</h4>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="font-medium text-gray-900">{selectedPayment.customerName}</div>
                  {selectedPayment.customerEmail && <div>{selectedPayment.customerEmail}</div>}
                  <div>Customer ID: {selectedPayment.customerId}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <h4 className="font-semibold text-gray-900">Refund Management</h4>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">₹{selectedPayment.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already Refunded:</span>
                    <span className="font-medium text-purple-700">
                      ₹{selectedPayment.refundAmount}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Remaining Refundable:</span>
                    <span>
                      ₹{Math.max(0, selectedPayment.amount - selectedPayment.refundAmount)}
                    </span>
                  </div>
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Update Refund Amount (₹)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={refundInput}
                        onChange={(e) => setRefundInput(e.target.value)}
                        placeholder="0"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const amt = Number(refundInput);
                          updateStatusMutation.mutate({
                            id: selectedPayment.id,
                            status:
                              amt >= selectedPayment.amount
                                ? "Refunded"
                                : amt > 0
                                  ? "Partially Refunded"
                                  : selectedPayment.status,
                            refundAmount: amt,
                          });
                        }}
                      >
                        Apply Refund
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Admin Note</label>
                <Input
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Optional internal financial note"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <Link
                to="/admin/orders"
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                View Linked Order →
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    updateStatusMutation.mutate({
                      id: selectedPayment.id,
                      status: selectedPayment.status,
                      refundAmount: Number(refundInput) || selectedPayment.refundAmount,
                      adminNote: adminNoteInput,
                    });
                    setIsDetailsOpen(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
