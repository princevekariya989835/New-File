import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Edit,
  Ban,
  CheckCircle2,
  ShoppingBag,
  IndianRupee,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  adminListCustomers,
  adminUpdateCustomer,
  adminUpdateCustomerStatus,
  type AdminCustomer,
} from "@/lib/admin-customers.functions";
import { money, dateTime, STATUS_TONE } from "@/components/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createLazyFileRoute("/_authenticated/admin/customers")({ component: AdminCustomersPage });

function AdminCustomersPage() {
  const listFn = useServerFn(adminListCustomers);
  const updateFn = useServerFn(adminUpdateCustomer);
  const statusFn = useServerFn(adminUpdateCustomerStatus);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const customersQ = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: () => listFn(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [spendingFilter, setSpendingFilter] = useState("all");
  const [ordersFilter, setOrdersFilter] = useState("all");

  // Sorting
  const [sortBy, setSortBy] = useState<string>("lastOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [viewCustomer, setViewCustomer] = useState<AdminCustomer | null>(null);
  const [editCustomer, setEditCustomer] = useState<AdminCustomer | null>(null);
  const [blockConfirmCustomer, setBlockConfirmCustomer] = useState<AdminCustomer | null>(null);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (d: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
      toast.success("Customer updated successfully.");
      setEditCustomer(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Unable to update customer. Please try again.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (d: Parameters<typeof statusFn>[0]["data"]) => statusFn({ data: d }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
      toast.success(
        variables.status === "Blocked"
          ? "Customer blocked successfully."
          : variables.status === "Active"
            ? "Customer unblocked successfully."
            : "Customer status updated.",
      );
      setBlockConfirmCustomer(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Unable to update customer status.");
    },
  });

  const customers = useMemo(() => customersQ.data ?? [], [customersQ.data]);

  // Summary calculation
  const summary = useMemo(() => {
    const total = customers.length;
    let active = 0;
    let inactive = 0;
    let blocked = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    for (const c of customers) {
      if (c.status === "Active") active++;
      else if (c.status === "Inactive") inactive++;
      else if (c.status === "Blocked") blocked++;
      totalOrders += c.totalOrders;
      totalRevenue += c.totalSpent;
    }

    return { total, active, inactive, blocked, totalOrders, totalRevenue };
  }, [customers]);

  // Filter logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (spendingFilter !== "all") {
        if (spendingFilter === "under_1k" && c.totalSpent >= 1000) return false;
        if (spendingFilter === "1k_5k" && (c.totalSpent < 1000 || c.totalSpent > 5000))
          return false;
        if (spendingFilter === "5k_10k" && (c.totalSpent < 5000 || c.totalSpent > 10000))
          return false;
        if (spendingFilter === "above_10k" && c.totalSpent <= 10000) return false;
      }
      if (ordersFilter !== "all") {
        if (ordersFilter === "0" && c.totalOrders !== 0) return false;
        if (ordersFilter === "1_5" && (c.totalOrders < 1 || c.totalOrders > 5)) return false;
        if (ordersFilter === "6_10" && (c.totalOrders < 6 || c.totalOrders > 10)) return false;
        if (ordersFilter === "10_plus" && c.totalOrders <= 10) return false;
      }
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [customers, statusFilter, spendingFilter, ordersFilter, search]);

  // Sorting logic
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    list.sort((a, b) => {
      let res = 0;
      if (sortBy === "name") {
        res = a.name.localeCompare(b.name);
      } else if (sortBy === "orders") {
        res = a.totalOrders - b.totalOrders;
      } else if (sortBy === "spent") {
        res = a.totalSpent - b.totalSpent;
      } else if (sortBy === "lastOrder") {
        const timeA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const timeB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        res = timeA - timeB;
      } else if (sortBy === "joined") {
        res = new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime();
      } else if (sortBy === "status") {
        res = a.status.localeCompare(b.status);
      }
      return sortDir === "asc" ? res : -res;
    });
    return list;
  }, [filteredCustomers, sortBy, sortDir]);

  const totalItems = sortedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedCustomers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, safePage, pageSize]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSpendingFilter("all");
    setOrdersFilter("all");
    setSortBy("lastOrder");
    setSortDir("desc");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    spendingFilter !== "all" ||
    ordersFilter !== "all" ||
    sortBy !== "lastOrder" ||
    sortDir !== "desc";

  // Open edit modal
  const handleOpenEdit = (c: AdminCustomer) => {
    setEditCustomer(c);
    setFormName(c.name);
    setFormEmail(c.email);
    setFormPhone(c.phone || "");
    setFormAddress(c.address || "");
    setFormCity(c.city || "");
    setFormState(c.state || "");
    setFormPostalCode(c.postalCode || "");
    setFormCountry(c.country || "India");
    setFormErrors({});
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = "Name is required.";
    if (!formEmail.trim() || !formEmail.includes("@"))
      errs.email = "Please enter a valid email address.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!editCustomer) return;
    updateMutation.mutate({
      id: editCustomer.id,
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || null,
      address: formAddress.trim() || null,
      city: formCity.trim() || null,
      state: formState.trim() || null,
      postalCode: formPostalCode.trim() || null,
      country: formCountry.trim() || null,
    });
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-sm text-muted-foreground">
            View registered customer accounts, total spending, order history, and account statuses.
          </p>
        </div>
        <AdminEraseDataButton
          section="customers"
          sectionLabel="Customers"
          onSuccess={() => qc.invalidateQueries({ queryKey: ["admin", "customers"] })}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Total Customers
          </span>
          <div className="text-2xl font-bold font-mono">{summary.total}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Active</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary.active}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Inactive</span>
          <div className="text-2xl font-bold font-mono text-muted-foreground">
            {summary.inactive}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Blocked</span>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {summary.blocked}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Total Orders</span>
          <div className="text-2xl font-bold font-mono">{summary.totalOrders}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Total Revenue</span>
          <div className="text-xl font-bold font-mono truncate">{money(summary.totalRevenue)}</div>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={spendingFilter}
            onChange={(e) => {
              setSpendingFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by spending range"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
          >
            <option value="all">All Spending</option>
            <option value="under_1k">Under ₹1,000</option>
            <option value="1k_5k">₹1,000–₹5,000</option>
            <option value="5k_10k">₹5,000–₹10,000</option>
            <option value="above_10k">Above ₹10,000</option>
          </select>

          <select
            value={ordersFilter}
            onChange={(e) => {
              setOrdersFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by order count"
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
          >
            <option value="all">All Orders Count</option>
            <option value="0">0 orders</option>
            <option value="1_5">1–5 orders</option>
            <option value="6_10">6–10 orders</option>
            <option value="10_plus">10+ orders</option>
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

      {/* Customer Table */}
      {customersQ.isLoading ? (
        <div className="space-y-3 py-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : totalItems === 0 ? (
        <div className="py-16 text-center space-y-3 border rounded-2xl bg-card">
          <Users className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold">
              {customers.length === 0 ? "No customers found" : "No customers match your filters."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {customers.length === 0
                ? "Customer accounts will appear here automatically when users register or place orders."
                : "Try adjusting your search query or clearing active filters."}
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b">
                <tr>
                  <th
                    className="p-3.5 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortBy === "name") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("name");
                        setSortDir("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Customer
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="p-3.5 text-left font-semibold">Email</th>
                  <th className="p-3.5 text-left font-semibold">Phone</th>
                  <th
                    className="p-3.5 text-right font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortBy === "orders") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("orders");
                        setSortDir("desc");
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Orders
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 text-right font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortBy === "spent") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("spent");
                        setSortDir("desc");
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Total Spent
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortBy === "lastOrder") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("lastOrder");
                        setSortDir("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Last Order
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortBy === "status") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("status");
                        setSortDir("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="p-3.5 text-left font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortBy === "joined") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy("joined");
                        setSortDir("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Joined
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCustomers.map((c) => {
                  const initials = c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3.5 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {c.avatar ? (
                              <img
                                src={c.avatar}
                                alt={c.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              initials || "C"
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{c.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              ID: {c.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{c.email}</td>
                      <td className="p-3.5 text-muted-foreground font-mono">{c.phone || "—"}</td>
                      <td className="p-3.5 text-right font-mono font-semibold">{c.totalOrders}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-foreground">
                        {money(c.totalSpent)}
                      </td>
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {c.lastOrderDate ? dateTime(c.lastOrderDate) : "—"}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            c.status === "Active"
                              ? "default"
                              : c.status === "Blocked"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(c.joinedDate).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="p-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <span className="font-bold">•••</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => setViewCustomer(c)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(c)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate({ to: "/admin/orders", search: { q: c.email } })
                              }
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              View Orders ({c.totalOrders})
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setBlockConfirmCustomer(c)}
                              className={`gap-2 text-xs cursor-pointer ${
                                c.status === "Blocked"
                                  ? "text-emerald-600 focus:text-emerald-600"
                                  : "text-destructive focus:text-destructive"
                              }`}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              {c.status === "Blocked" ? "Unblock Customer" : "Block Customer"}
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

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(totalItems, safePage * pageSize)} of{" "}
              {totalItems} customers
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER MODAL / DRAWER */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {viewCustomer.name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{viewCustomer.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Customer ID: {viewCustomer.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    viewCustomer.status === "Active"
                      ? "default"
                      : viewCustomer.status === "Blocked"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {viewCustomer.status}
                </Badge>
                <button
                  onClick={() => setViewCustomer(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Profile Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-muted/20 p-3">
                <span className="text-xs text-muted-foreground block">Total Orders</span>
                <span className="text-xl font-bold font-mono">{viewCustomer.totalOrders}</span>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <span className="text-xs text-muted-foreground block">Total Spent</span>
                <span className="text-xl font-bold font-mono text-primary">
                  {money(viewCustomer.totalSpent)}
                </span>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <span className="text-xs text-muted-foreground block">Avg. Order Value</span>
                <span className="text-xl font-bold font-mono">
                  {money(
                    viewCustomer.totalOrders > 0
                      ? viewCustomer.totalSpent / viewCustomer.totalOrders
                      : 0,
                  )}
                </span>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <span className="text-xs text-muted-foreground block">Customer Since</span>
                <span className="text-xs font-semibold mt-1 block">
                  {new Date(viewCustomer.joinedDate).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </div>

            {/* Contact & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border p-4 space-y-2">
                <h4 className="font-semibold text-sm border-b pb-2">Contact Information</h4>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{viewCustomer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-mono">{viewCustomer.phone || "No phone provided"}</span>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <h4 className="font-semibold text-sm border-b pb-2">Shipping Address</h4>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    {viewCustomer.address ? (
                      <>
                        <div>{viewCustomer.address}</div>
                        <div>
                          {[viewCustomer.city, viewCustomer.state, viewCustomer.postalCode]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                        <div>{viewCustomer.country}</div>
                      </>
                    ) : (
                      <span>No address on file</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Order History */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Customer Order History</h3>
              {viewCustomer.orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center border rounded-xl bg-muted/20">
                  No orders placed by this customer yet.
                </p>
              ) : (
                <div className="rounded-xl border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] border-b">
                      <tr>
                        <th className="p-2.5 text-left">Order #</th>
                        <th className="p-2.5 text-left">Date</th>
                        <th className="p-2.5 text-center">Items</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-left">Payment</th>
                        <th className="p-2.5 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewCustomer.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-2.5 font-mono font-semibold">{ord.order_number}</td>
                          <td className="p-2.5 text-muted-foreground">
                            {dateTime(ord.created_at)}
                          </td>
                          <td className="p-2.5 text-center font-mono">{ord.itemsCount}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            {money(ord.total_amount)}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {ord.payment_status}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {ord.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const c = viewCustomer;
                  setViewCustomer(null);
                  handleOpenEdit(c);
                }}
              >
                Edit Customer
              </Button>
              <Button size="sm" onClick={() => setViewCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl border shadow-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold">Edit Customer</h2>
              <button
                onClick={() => setEditCustomer(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="formName" className="text-xs font-semibold">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="h-9 text-xs"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formEmail" className="text-xs font-semibold">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="formEmail"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="h-9 text-xs"
                />
                {formErrors.email && (
                  <p className="text-[11px] text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formPhone" className="text-xs font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="formPhone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formAddress" className="text-xs font-semibold">
                  Address
                </Label>
                <Input
                  id="formAddress"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street address, apartment, suite"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="formCity" className="text-xs font-semibold">
                    City
                  </Label>
                  <Input
                    id="formCity"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Mumbai"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="formState" className="text-xs font-semibold">
                    State
                  </Label>
                  <Input
                    id="formState"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="Maharashtra"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="formPostalCode" className="text-xs font-semibold">
                    Postal Code
                  </Label>
                  <Input
                    id="formPostalCode"
                    value={formPostalCode}
                    onChange={(e) => setFormPostalCode(e.target.value)}
                    placeholder="400001"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="formCountry" className="text-xs font-semibold">
                    Country
                  </Label>
                  <Input
                    id="formCountry"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="India"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditCustomer(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK / UNBLOCK CONFIRMATION MODAL */}
      {blockConfirmCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  blockConfirmCustomer.status === "Blocked"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {blockConfirmCustomer.status === "Blocked"
                    ? `Unblock ${blockConfirmCustomer.name}?`
                    : `Block ${blockConfirmCustomer.name}?`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {blockConfirmCustomer.status === "Blocked"
                    ? "This customer will regain active store access."
                    : "Blocked customers will no longer be treated as active store users."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBlockConfirmCustomer(null)}
                disabled={statusMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={blockConfirmCustomer.status === "Blocked" ? "default" : "destructive"}
                size="sm"
                onClick={() =>
                  statusMutation.mutate({
                    id: blockConfirmCustomer.id,
                    email: blockConfirmCustomer.email,
                    status: blockConfirmCustomer.status === "Blocked" ? "Active" : "Blocked",
                  })
                }
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending
                  ? "Updating..."
                  : blockConfirmCustomer.status === "Blocked"
                    ? "Unblock Customer"
                    : "Block Customer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
