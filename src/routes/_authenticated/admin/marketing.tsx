import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Copy,
  Archive,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Percent,
  Tag,
  Package,
  Users,
  BarChart2,
  Clock,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import {
  adminListCampaigns,
  adminSaveCampaign,
  adminUpdateCampaignStatus,
  adminDuplicateCampaign,
  adminArchiveCampaign,
  adminListProductsForMarketing,
  type CampaignRecord,
  type CampaignStatus,
  type CampaignType,
  type MarketingChannel,
  type DiscountType,
} from "@/lib/admin-marketing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: AdminMarketingPage,
  head: () => ({
    meta: [
      { title: "Marketing Campaigns & Promotions | RIOTOUS Admin Console" },
      { name: "description", content: "Manage marketing campaigns, performance, and discounts." },
    ],
  }),
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadgeTone(status: CampaignStatus) {
  switch (status) {
    case "Active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900";
    case "Scheduled":
      return "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900";
    case "Paused":
      return "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900";
    case "Completed":
      return "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900";
    case "Cancelled":
      return "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800";
  }
}

function AdminMarketingPage() {
  const listFn = useServerFn(adminListCampaigns);
  const saveFn = useServerFn(adminSaveCampaign);
  const statusFn = useServerFn(adminUpdateCampaignStatus);
  const duplicateFn = useServerFn(adminDuplicateCampaign);
  const archiveFn = useServerFn(adminArchiveCampaign);
  const productsFn = useServerFn(adminListProductsForMarketing);
  const qc = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All Time");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRecord | null>(null);
  const [detailsCampaign, setDetailsCampaign] = useState<CampaignRecord | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: "", message: "", action: () => {} });

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<CampaignType>("Product Promotion");
  const [formChannel, setFormChannel] = useState<MarketingChannel>("Website");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formBudget, setFormBudget] = useState<number>(10000);
  const [formAudience, setFormAudience] = useState("All Customers");
  const [formProductIds, setFormProductIds] = useState<string[]>([]);
  const [formDiscountCode, setFormDiscountCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>("Percentage");
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);

  // Queries
  const campaignsQ = useQuery({
    queryKey: ["admin", "campaigns"],
    queryFn: () => listFn(),
    refetchInterval: 30_000,
  });

  const productsQ = useQuery({
    queryKey: ["admin", "marketing-products"],
    queryFn: () => productsFn(),
    staleTime: 60_000,
  });

  const campaigns = useMemo(() => campaignsQ.data ?? [], [campaignsQ.data]);
  const products = useMemo(() => productsQ.data ?? [], [productsQ.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
  };

  // Mutations
  const saveM = useMutation({
    mutationFn: (data: any) => saveFn({ data }),
    onSuccess: () => {
      toast.success(
        editingCampaign ? "Campaign updated successfully" : "Campaign created successfully",
      );
      setCreateOpen(false);
      setEditingCampaign(null);
      resetForm();
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusM = useMutation({
    mutationFn: (data: { id: string; status: CampaignStatus }) => statusFn({ data }),
    onSuccess: (_, variables) => {
      toast.success(`Campaign status updated to ${variables.status}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateM = useMutation({
    mutationFn: (data: { id: string }) => duplicateFn({ data }),
    onSuccess: () => {
      toast.success("Campaign duplicated successfully as Draft");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveM = useMutation({
    mutationFn: (data: { id: string }) => archiveFn({ data }),
    onSuccess: () => {
      toast.success("Campaign archived successfully");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setFormName("");
    setFormDesc("");
    setFormType("Product Promotion");
    setFormChannel("Website");
    setFormStartDate("");
    setFormEndDate("");
    setFormBudget(10000);
    setFormAudience("All Customers");
    setFormProductIds([]);
    setFormDiscountCode("");
    setFormDiscountType("Percentage");
    setFormDiscountValue(10);
  }

  function openEdit(c: CampaignRecord) {
    setEditingCampaign(c);
    setFormName(c.name);
    setFormDesc(c.description || "");
    setFormType(c.type);
    setFormChannel(c.channel);
    setFormStartDate(c.startDate);
    setFormEndDate(c.endDate);
    setFormBudget(c.budget);
    setFormAudience(c.targetAudience);
    setFormProductIds(c.productIds || []);
    setFormDiscountCode(c.discountCode || "");
    setFormDiscountType(c.discountType);
    setFormDiscountValue(c.discountValue);
    setCreateOpen(true);
  }

  // Dashboard Summary Calculations
  const stats = useMemo(() => {
    const total = campaigns.length;
    let active = 0;
    let scheduled = 0;
    let completed = 0;
    let reach = 0;
    let clicks = 0;
    let conversions = 0;
    let revenue = 0;

    for (const c of campaigns) {
      if (c.status === "Active") active++;
      if (c.status === "Scheduled") scheduled++;
      if (c.status === "Completed") completed++;
      reach += c.impressions;
      clicks += c.clicks;
      conversions += c.conversions;
      revenue += c.revenue;
    }

    return { total, active, scheduled, completed, reach, clicks, conversions, revenue };
  }, [campaigns]);

  // Filtering, Searching, Sorting
  const filteredCampaigns = useMemo(() => {
    let list = [...campaigns];

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.discountCode && c.discountCode.toLowerCase().includes(q)) ||
          c.channel.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "All") {
      list = list.filter((c) => c.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "All") {
      list = list.filter((c) => c.type === typeFilter);
    }

    // Channel filter
    if (channelFilter !== "All") {
      list = list.filter((c) => c.channel === channelFilter);
    }

    // Date filter
    if (dateFilter !== "All Time") {
      const now = new Date();
      list = list.filter((c) => {
        const start = new Date(c.startDate);
        if (dateFilter === "Today") {
          return start.toDateString() === now.toDateString();
        } else if (dateFilter === "Last 7 Days") {
          const diff = now.getTime() - start.getTime();
          return diff <= 7 * 86400000;
        } else if (dateFilter === "Last 30 Days") {
          const diff = now.getTime() - start.getTime();
          return diff <= 30 * 86400000;
        }
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "budget_desc") {
        return b.budget - a.budget;
      } else if (sortBy === "spent_desc") {
        return b.spent - a.spent;
      } else if (sortBy === "revenue_desc") {
        return b.revenue - a.revenue;
      } else if (sortBy === "clicks_desc") {
        return b.clicks - a.clicks;
      } else if (sortBy === "conversions_desc") {
        return b.conversions - a.conversions;
      } else if (sortBy === "start_date") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      return 0;
    });

    return list;
  }, [campaigns, searchTerm, statusFilter, typeFilter, channelFilter, dateFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredCampaigns.length / pageSize) || 1;
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, currentPage, pageSize]);

  // Top & Low Performing Campaigns
  const topCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [campaigns]);

  const lowCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const spendRatio = c.budget > 0 ? c.spent / c.budget : 0;
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      return (
        (c.spent > 10000 && c.conversions === 0) ||
        (spendRatio > 0.85 && c.revenue < c.spent) ||
        (c.status === "Active" && ctr < 1)
      );
    });
  }, [campaigns]);

  // Chart data
  const chartData = useMemo(() => {
    return campaigns.map((c) => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + "…" : c.name,
      Revenue: c.revenue,
      Spent: c.spent,
      Clicks: c.clicks,
      Conversions: c.conversions,
    }));
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage promotional campaigns, discount codes, multi-channel reach, and ROI performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => {
              setEditingCampaign(null);
              resetForm();
              setCreateOpen(true);
            }}
            className="gap-2 bg-brand-red text-white hover:bg-brand-red/90"
          >
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
          <AdminEraseDataButton
            section="marketing"
            sectionLabel="Marketing"
            onSuccess={() => refresh()}
          />
        </div>
      </div>

      {/* 1. MARKETING DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Campaigns</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 tabular-nums">{stats.active}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <p className="mt-1 text-xl font-bold text-blue-600 tabular-nums">{stats.scheduled}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-xl font-bold text-purple-600 tabular-nums">{stats.completed}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Reach</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{stats.reach.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Clicks</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{stats.clicks.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Conversions</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {stats.conversions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="mt-1 text-base font-bold text-brand-red tabular-nums">
            {formatCurrency(stats.revenue)}
          </p>
        </div>
      </div>

      {/* Search, Filters, Sorting Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by name, ID, code, channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Product Promotion">Product Promotion</SelectItem>
                <SelectItem value="Discount Campaign">Discount Campaign</SelectItem>
                <SelectItem value="Seasonal Campaign">Seasonal Campaign</SelectItem>
                <SelectItem value="New Product">New Product</SelectItem>
                <SelectItem value="Flash Sale">Flash Sale</SelectItem>
                <SelectItem value="Social Media">Social Media</SelectItem>
                <SelectItem value="Email Campaign">Email Campaign</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Channels</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Time">All Time</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Campaign Name</SelectItem>
                <SelectItem value="budget_desc">Highest Budget</SelectItem>
                <SelectItem value="spent_desc">Highest Spent</SelectItem>
                <SelectItem value="revenue_desc">Highest Revenue</SelectItem>
                <SelectItem value="clicks_desc">Most Clicks</SelectItem>
                <SelectItem value="conversions_desc">Most Conversions</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm ||
              statusFilter !== "All" ||
              typeFilter !== "All" ||
              channelFilter !== "All" ||
              dateFilter !== "All Time") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setTypeFilter("All");
                  setChannelFilter("All");
                  setDateFilter("All Time");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. CAMPAIGNS TABLE */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {campaignsQ.isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Megaphone className="mx-auto h-10 w-10 opacity-40 mb-3" />
            <p className="text-base font-medium">No campaigns found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="border-b bg-secondary/50 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Type / Channel</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3 text-right">Budget / Spent</th>
                  <th className="p-3 text-right">Clicks / Conv.</th>
                  <th className="p-3 text-right">Revenue</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedCampaigns.map((c) => {
                  const spendRatio = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
                  return (
                    <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {c.description || "No description"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {c.id}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-xs">{c.type}</div>
                        <div className="text-xs text-muted-foreground">{c.channel}</div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${statusBadgeTone(c.status)}`}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        <div>{c.startDate}</div>
                        <div>to {c.endDate}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums text-xs">
                        <div className="font-medium">{formatCurrency(c.budget)}</div>
                        <div className="text-muted-foreground">
                          Spent: {formatCurrency(c.spent)}
                        </div>
                        <div className="w-24 ml-auto mt-1">
                          <Progress value={spendRatio} className="h-1" />
                        </div>
                      </td>
                      <td className="p-3 text-right tabular-nums text-xs">
                        <div className="font-medium">{c.clicks.toLocaleString()}</div>
                        <div className="text-muted-foreground">
                          {c.conversions.toLocaleString()} conv.
                        </div>
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold text-brand-red text-xs">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Details"
                            onClick={() => setDetailsCampaign(c)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Context-sensitive actions */}
                          {c.status === "Draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => openEdit(c)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Schedule"
                                onClick={() => statusM.mutate({ id: c.id, status: "Scheduled" })}
                                className="h-8 w-8 text-blue-600"
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancel"
                                onClick={() => statusM.mutate({ id: c.id, status: "Cancelled" })}
                                className="h-8 w-8 text-rose-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {c.status === "Scheduled" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => openEdit(c)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Activate"
                                onClick={() => statusM.mutate({ id: c.id, status: "Active" })}
                                className="h-8 w-8 text-emerald-600"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancel"
                                onClick={() => statusM.mutate({ id: c.id, status: "Cancelled" })}
                                className="h-8 w-8 text-rose-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {c.status === "Active" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Pause Campaign"
                                onClick={() => statusM.mutate({ id: c.id, status: "Paused" })}
                                className="h-8 w-8 text-amber-600"
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Complete Campaign"
                                onClick={() => statusM.mutate({ id: c.id, status: "Completed" })}
                                className="h-8 w-8 text-purple-600"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {c.status === "Paused" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Resume Campaign"
                                onClick={() => statusM.mutate({ id: c.id, status: "Active" })}
                                className="h-8 w-8 text-emerald-600"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Complete Campaign"
                                onClick={() => statusM.mutate({ id: c.id, status: "Completed" })}
                                className="h-8 w-8 text-purple-600"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => openEdit(c)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {(c.status === "Completed" || c.status === "Cancelled") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Duplicate Campaign"
                              onClick={() => duplicateM.mutate({ id: c.id })}
                              className="h-8 w-8 text-blue-600"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        <div className="flex flex-col gap-3 sm:flex-row items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredCampaigns.length)} of{" "}
            {filteredCampaigns.length} campaigns
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 20. PERFORMANCE CHARTS & INSIGHTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Campaign Revenue & Spend Comparison</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={40}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Legend />
                <Bar dataKey="Revenue" fill="#e11d48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top & Low Performing Campaigns Insights */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Top Performing Campaigns (by
              Revenue)
            </h2>
            <div className="space-y-3">
              {topCampaigns.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center justify-between text-xs border-b pb-2 last:border-0"
                >
                  <div>
                    <div className="font-medium text-foreground">{tc.name}</div>
                    <div className="text-muted-foreground">
                      {tc.channel} · {tc.conversions} conversions
                    </div>
                  </div>
                  <div className="text-right font-semibold text-emerald-600">
                    {formatCurrency(tc.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Campaigns Needing Attention
            </h2>
            {lowCampaigns.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                All active campaigns are performing within healthy ROAS and conversion thresholds.
              </p>
            ) : (
              <div className="space-y-3">
                {lowCampaigns.map((lc) => (
                  <div
                    key={lc.id}
                    className="flex items-center justify-between text-xs border-b pb-2 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-foreground">{lc.name}</div>
                      <div className="text-muted-foreground">
                        Spend: {formatCurrency(lc.spent)} / Rev: {formatCurrency(lc.revenue)}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-200"
                    >
                      Low ROI
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
            <DialogDescription>
              Configure campaign target audience, budget, schedule, and discount attributes.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formName.trim()) {
                toast.error("Campaign name is required");
                return;
              }
              if (!formStartDate || !formEndDate) {
                toast.error("Start and end dates are required");
                return;
              }
              saveM.mutate({
                id: editingCampaign ? editingCampaign.id : null,
                name: formName,
                description: formDesc,
                type: formType,
                channel: formChannel,
                startDate: formStartDate,
                endDate: formEndDate,
                budget: formBudget,
                targetAudience: formAudience,
                productIds: formProductIds,
                discountCode: formDiscountCode,
                discountType: formDiscountType,
                discountValue: formDiscountValue,
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold">Campaign Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Monsoon Graphic Tee Drop"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold">Description</label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Short summary of goals and promotional offer..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Campaign Type *</label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CampaignType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Product Promotion">Product Promotion</SelectItem>
                    <SelectItem value="Discount Campaign">Discount Campaign</SelectItem>
                    <SelectItem value="Seasonal Campaign">Seasonal Campaign</SelectItem>
                    <SelectItem value="New Product">New Product</SelectItem>
                    <SelectItem value="Flash Sale">Flash Sale</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Email Campaign">Email Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Channel *</label>
                <Select
                  value={formChannel}
                  onValueChange={(v) => setFormChannel(v as MarketingChannel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Start Date *</label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">End Date *</label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Budget (INR) *</label>
                <Input
                  type="number"
                  min="0"
                  value={formBudget}
                  onChange={(e) => setFormBudget(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Target Audience</label>
                <Select value={formAudience} onValueChange={setFormAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Customers">All Customers</SelectItem>
                    <SelectItem value="New Customers">New Customers</SelectItem>
                    <SelectItem value="Returning Customers">Returning Customers</SelectItem>
                    <SelectItem value="High-Spending Customers">High-Spending Customers</SelectItem>
                    <SelectItem value="Customers With No Orders">
                      Customers With No Orders
                    </SelectItem>
                    <SelectItem value="Custom Audience">Custom Audience</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Discount Code</label>
                <Input
                  value={formDiscountCode}
                  onChange={(e) => setFormDiscountCode(e.target.value)}
                  placeholder="e.g. MONSOON20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Discount Type</label>
                  <Select
                    value={formDiscountType}
                    onValueChange={(v) => setFormDiscountType(v as DiscountType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Percentage">Percentage (%)</SelectItem>
                      <SelectItem value="Fixed Amount">Fixed Amount (₹)</SelectItem>
                      <SelectItem value="No Discount">No Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Discount Value</label>
                  <Input
                    type="number"
                    min="0"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold">Target Products (Optional)</label>
              <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-secondary/20">
                {products.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">
                    No active products available in catalog.
                  </p>
                ) : (
                  products.map((p) => {
                    const selected = formProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (selected) {
                            setFormProductIds(formProductIds.filter((id) => id !== p.id));
                          } else {
                            setFormProductIds([...formProductIds, p.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors ${
                          selected
                            ? "bg-brand-red/10 border border-brand-red/30"
                            : "hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {p.images?.[0] && (
                            <img
                              src={p.images[0]}
                              alt=""
                              className="h-7 w-7 object-cover rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium text-foreground">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Stock: {p.stock_quantity}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold">{formatCurrency(p.price)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveM.isPending}
                className="bg-brand-red text-white hover:bg-brand-red/90"
              >
                {saveM.isPending
                  ? "Saving..."
                  : editingCampaign
                    ? "Save Changes"
                    : "Create Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS MODAL */}
      {detailsCampaign && (
        <Dialog open={Boolean(detailsCampaign)} onOpenChange={() => setDetailsCampaign(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold">{detailsCampaign.name}</DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${statusBadgeTone(detailsCampaign.status)}`}
                >
                  {detailsCampaign.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs font-mono">
                {detailsCampaign.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2 text-sm">
              {/* Description & Overview */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Description
                </h3>
                <p className="text-foreground">
                  {detailsCampaign.description || "No description provided."}
                </p>
              </div>

              {/* Schedule & Channel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/40 p-3 rounded-xl border">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Type</span>
                  <p className="font-medium text-xs">{detailsCampaign.type}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Channel</span>
                  <p className="font-medium text-xs">{detailsCampaign.channel}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Start Date</span>
                  <p className="font-medium text-xs">{detailsCampaign.startDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">End Date</span>
                  <p className="font-medium text-xs">{detailsCampaign.endDate}</p>
                </div>
              </div>

              {/* Budget & Spend */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Budget Management
                </h3>
                <div className="grid grid-cols-3 gap-3 rounded-xl border p-3 bg-card">
                  <div>
                    <span className="text-xs text-muted-foreground">Budget</span>
                    <p className="text-base font-bold">{formatCurrency(detailsCampaign.budget)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Spent</span>
                    <p className="text-base font-bold text-blue-600">
                      {formatCurrency(detailsCampaign.spent)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Remaining</span>
                    <p className="text-base font-bold text-emerald-600">
                      {formatCurrency(detailsCampaign.budget - detailsCampaign.spent)}
                    </p>
                  </div>
                </div>
                {detailsCampaign.spent >= detailsCampaign.budget && detailsCampaign.budget > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> Budget Limit Reached
                  </div>
                )}
              </div>

              {/* Discount & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border p-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Target Audience
                  </h3>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-red" /> {detailsCampaign.targetAudience}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Discount Promotion
                  </h3>
                  {detailsCampaign.discountType === "No Discount" ? (
                    <p className="text-xs text-muted-foreground">No discount attached.</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-purple-600" />
                      <span className="font-mono font-semibold text-xs">
                        {detailsCampaign.discountCode || "CODE"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {detailsCampaign.discountValue}
                        {detailsCampaign.discountType === "Percentage" ? "%" : " ₹"} OFF
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics & ROAS */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Performance & ROI
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border p-3 bg-secondary/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Impressions</span>
                    <p className="text-sm font-bold">
                      {detailsCampaign.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Clicks</span>
                    <p className="text-sm font-bold">{detailsCampaign.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">CTR</span>
                    <p className="text-sm font-bold">
                      {detailsCampaign.impressions > 0
                        ? ((detailsCampaign.clicks / detailsCampaign.impressions) * 100).toFixed(
                            2,
                          ) + "%"
                        : "0.00%"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Conversion Rate</span>
                    <p className="text-sm font-bold">
                      {detailsCampaign.clicks > 0
                        ? ((detailsCampaign.conversions / detailsCampaign.clicks) * 100).toFixed(
                            2,
                          ) + "%"
                        : "0.00%"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Conversions</span>
                    <p className="text-sm font-bold">
                      {detailsCampaign.conversions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Revenue Generated</span>
                    <p className="text-sm font-bold text-brand-red">
                      {formatCurrency(detailsCampaign.revenue)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">ROAS</span>
                    <p className="text-sm font-bold text-emerald-600">
                      {detailsCampaign.spent > 0
                        ? (detailsCampaign.revenue / detailsCampaign.spent).toFixed(2) + "x"
                        : "0.00x"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsCampaign(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
