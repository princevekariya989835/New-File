import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  RotateCcw,
  Star,
  Megaphone,
  Download,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Layers,
  Tag,
  ShieldAlert,
} from "lucide-react";
import {
  adminGetAnalytics,
  type DateRangeOption,
  type AnalyticsData,
} from "@/lib/admin-analytics.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
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
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalyticsPage,
  head: () => ({
    meta: [
      { title: "Store Analytics & Revenue Intelligence | RIOTOUS Admin" },
      {
        name: "description",
        content: "Comprehensive store analytics, revenue, inventory, and customer intelligence.",
      },
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

const COLORS = ["#e11d48", "#0284c7", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function AdminAnalyticsPage() {
  const analyticsFn = useServerFn(adminGetAnalytics);

  // Global Date Range Selector state
  const [dateRange, setDateRange] = useState<DateRangeOption>("Last 30 Days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Search / filter states for tables
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productPageSize, setProductPageSize] = useState(10);
  const [productPage, setProductPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(10);
  const [customerPage, setCustomerPage] = useState(1);

  const analyticsQ = useQuery({
    queryKey: ["admin", "analytics", dateRange, customStart, customEnd],
    queryFn: () =>
      analyticsFn({
        data: {
          dateRange,
          startDate: customStart || undefined,
          endDate: customEnd || undefined,
        },
      }),
    refetchInterval: 60_000,
  });

  const data: AnalyticsData | undefined = analyticsQ.data;

  // Filtered product performance table
  const filteredProducts = useMemo(() => {
    if (!data?.productPerformance) return [];
    if (!productSearch.trim()) return data.productPerformance;
    const q = productSearch.toLowerCase();
    return data.productPerformance.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [data?.productPerformance, productSearch]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Filtered customer table
  const filteredCustomers = useMemo(() => {
    if (!data?.customerAnalytics?.topCustomers) return [];
    if (!customerSearch.trim()) return data.customerAnalytics.topCustomers;
    const q = customerSearch.toLowerCase();
    return data.customerAnalytics.topCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [data?.customerAnalytics?.topCustomers, customerSearch]);

  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * customerPageSize;
    return filteredCustomers.slice(start, start + customerPageSize);
  }, [filteredCustomers, customerPage, customerPageSize]);

  // CSV Export
  const exportCsv = () => {
    if (!data) return;
    try {
      let csv = "RIOTUS STORE ANALYTICS REPORT\n";
      csv += `Period: ${data.periodLabel}\n\n`;
      csv += "SUMMARY METRICS\n";
      csv += `Total Revenue,${data.summary.totalRevenue}\n`;
      csv += `Net Revenue,${data.summary.netRevenue}\n`;
      csv += `Total Orders,${data.summary.totalOrders}\n`;
      csv += `Total Customers,${data.summary.totalCustomers}\n`;
      csv += `Average Order Value,${data.summary.averageOrderValue}\n`;
      csv += `Total Products Sold,${data.summary.totalProductsSold}\n`;
      csv += `Conversion Rate,${data.summary.conversionRate}%\n`;
      csv += `Refund Amount,${data.summary.refundAmount}\n\n`;

      csv += "TOP PRODUCTS\n";
      csv += "ID,Name,Units Sold,Orders,Revenue,ASP\n";
      data.productPerformance.forEach((p) => {
        csv += `${p.id},"${p.name}",${p.unitsSold},${p.ordersCount},${p.revenue},${p.asp}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `riotous_analytics_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Analytics report exported successfully as CSV.");
    } catch {
      toast.error("Failed to export analytics report.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            {data?.periodLabel
              ? `Analytics: ${data.periodLabel}`
              : "Real-time store performance and business metrics."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
            <SelectTrigger className="w-44 h-9 text-xs font-medium">
              <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
              <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
              <SelectItem value="Last 90 Days">Last 90 Days</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="Custom Range">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "Custom Range" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 w-36 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-36 text-xs"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => analyticsQ.refetch()}
            className="gap-2 h-9"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={exportCsv}
            className="gap-2 bg-brand-red text-white hover:bg-brand-red/90 h-9"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>

          <AdminEraseDataButton
            section="analytics"
            sectionLabel="Analytics & Activity Data"
            buttonText="Reset Analytics"
            onSuccess={() => analyticsQ.refetch()}
          />
        </div>
      </div>

      {analyticsQ.isLoading ? (
        <div className="rounded-xl border bg-card p-16 text-center text-muted-foreground">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin opacity-50 mb-3" />
          Computing store analytics and metrics...
        </div>
      ) : analyticsQ.isError || !data ? (
        <div className="rounded-xl border bg-card p-16 text-center text-rose-600">
          <AlertTriangle className="mx-auto h-8 w-8 opacity-75 mb-3" />
          <p className="font-medium">Failed to load analytics data.</p>
          <Button variant="outline" size="sm" onClick={() => analyticsQ.refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* 1. SUMMARY CARDS (8 KPIs) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {/* Total Revenue */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-brand-red" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold tracking-tight">
                  {formatCurrency(data.summary.totalRevenue)}
                </span>
                <span className="flex items-center text-[10px] font-semibold text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{data.kpiComparison.revenueChange}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Gross sales for period</p>
            </div>

            {/* Net Revenue */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Net Revenue</span>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold tracking-tight">
                  {formatCurrency(data.summary.netRevenue)}
                </span>
                <span className="text-[10px] text-muted-foreground">Gross - Disc - Ref</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Actual revenue earned</p>
            </div>

            {/* Total Orders */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Orders</span>
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold tracking-tight">
                  {data.summary.totalOrders.toLocaleString()}
                </span>
                <span className="flex items-center text-[10px] font-semibold text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{data.kpiComparison.orderChange}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Orders placed in period</p>
            </div>

            {/* Total Customers */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Customers</span>
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold tracking-tight">
                  {data.summary.totalCustomers.toLocaleString()}
                </span>
                <span className="flex items-center text-[10px] font-semibold text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{data.kpiComparison.customerChange}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Registered profiles</p>
            </div>

            {/* Average Order Value */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Avg Order Value (AOV)</span>
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold tracking-tight">
                  {formatCurrency(data.summary.averageOrderValue)}
                </span>
                <span className="flex items-center text-[10px] font-semibold text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{data.kpiComparison.aovChange}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Revenue / Completed orders</p>
            </div>

            {/* Total Products Sold */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Products Sold</span>
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold tracking-tight">
                  {data.summary.totalProductsSold.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Units across all sizes/colors
              </p>
            </div>

            {/* Conversion Rate */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Conversion Rate</span>
                <BarChart3 className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold tracking-tight">
                  {data.summary.conversionRate.toFixed(2)}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Estimated visitors to orders</p>
            </div>

            {/* Refund Amount */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Refund Amount</span>
                <RotateCcw className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold tracking-tight text-rose-600">
                  {formatCurrency(data.summary.refundAmount)}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {data.returnsAnalytics.totalReturns} total return requests
              </p>
            </div>
          </div>

          {/* 30. BUSINESS INSIGHTS & 31. LOW-PERFORMANCE ALERTS */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Business Insights
              </h3>
              <ul className="space-y-2 text-xs">
                {data.insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand-red font-bold">•</span>
                    <span className="text-foreground">{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" /> Low-Performance & Inventory
                Alerts
              </h3>
              <div className="space-y-2 text-xs">
                {data.alerts.map((alt, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                      alt.type === "warning"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                        : alt.type === "success"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                    }`}
                  >
                    {alt.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    )}
                    <span>{alt.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DETAILED TABS NAVIGATION */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 sm:grid-cols-7 h-auto p-1 bg-secondary/50">
              <TabsTrigger value="overview" className="text-xs py-2">
                Revenue & Orders
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs py-2">
                Products & Variants
              </TabsTrigger>
              <TabsTrigger value="customers" className="text-xs py-2">
                Customers
              </TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs py-2">
                Inventory Health
              </TabsTrigger>
              <TabsTrigger value="returns" className="text-xs py-2">
                Returns & Refunds
              </TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs py-2">
                Reviews & Ratings
              </TabsTrigger>
              <TabsTrigger value="marketing" className="text-xs py-2">
                Marketing & ROAS
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & REVENUE ANALYTICS */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Revenue Over Time Chart */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Revenue Over Time</h3>
                    <Badge variant="outline" className="text-[10px]">
                      Gross vs Net
                    </Badge>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.revenueChart}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Gross Revenue"
                          stroke="#e11d48"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="netRevenue"
                          name="Net Revenue"
                          stroke="#0284c7"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Orders Over Time Chart */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Orders Growth Over Time</h3>
                    <Badge variant="outline" className="text-[10px]">
                      Total vs Completed
                    </Badge>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.orderTrend}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="orders"
                          name="Total Orders"
                          fill="#0284c7"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="completedOrders"
                          name="Completed Orders"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-semibold mb-4">Order Status Breakdown</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Total Orders</span>
                      <p className="text-lg font-bold mt-1">{data.orderStatusCounts.total}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      <span className="text-xs">Completed / Delivered</span>
                      <p className="text-lg font-bold mt-1">
                        {data.orderStatusCounts.completed + data.orderStatusCounts.delivered}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      <span className="text-xs">Processing / Shipped</span>
                      <p className="text-lg font-bold mt-1">
                        {data.orderStatusCounts.processing + data.orderStatusCounts.shipped}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border bg-rose-500/10 text-rose-700 dark:text-rose-400">
                      <span className="text-xs">Cancelled / Returned</span>
                      <p className="text-lg font-bold mt-1">
                        {data.orderStatusCounts.cancelled + data.orderStatusCounts.returned}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Revenue Breakdown</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">Gross Revenue</span>
                      <span className="font-bold">
                        {formatCurrency(data.revenueBreakdown.grossRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">Discounts Given</span>
                      <span className="font-semibold text-amber-600">
                        -{formatCurrency(data.revenueBreakdown.discounts)}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">Refunds Issued</span>
                      <span className="font-semibold text-rose-600">
                        -{formatCurrency(data.revenueBreakdown.refunds)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-sm">
                      <span>Net Revenue</span>
                      <span className="text-brand-red">
                        {formatCurrency(data.revenueBreakdown.netRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PRODUCTS & VARIANTS ANALYTICS */}
            <TabsContent value="products" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Sales by Color */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Sales by T-Shirt Color</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.variantAnalytics.colors}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="color" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Revenue (₹)"
                          fill="#e11d48"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="units"
                          name="Units Sold"
                          fill="#0284c7"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sales by Size */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Sales by T-Shirt Size</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.variantAnalytics.sizes}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="size" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Revenue (₹)"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="units"
                          name="Units Sold"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Product Performance Table */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-sm font-semibold">Product Performance Ranking</h3>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="border-b bg-secondary/50 font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Units Sold</th>
                        <th className="p-3 text-right">Orders</th>
                        <th className="p-3 text-right">Revenue</th>
                        <th className="p-3 text-right">Avg Selling Price</th>
                        <th className="p-3 text-right">Return Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No products found matching search.
                          </td>
                        </tr>
                      ) : (
                        paginatedProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="p-3 flex items-center gap-3">
                              <img
                                src={p.image}
                                alt=""
                                className="h-9 w-9 object-cover rounded-md border"
                              />
                              <div>
                                <div className="font-medium text-foreground">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {p.id}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right tabular-nums font-semibold">
                              {p.unitsSold}
                            </td>
                            <td className="p-3 text-right tabular-nums">{p.ordersCount}</td>
                            <td className="p-3 text-right tabular-nums font-semibold text-brand-red">
                              {formatCurrency(p.revenue)}
                            </td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(p.asp)}</td>
                            <td className="p-3 text-right tabular-nums text-muted-foreground">
                              {p.returnRate}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                  <div>
                    Showing {(productPage - 1) * productPageSize + 1}–
                    {Math.min(productPage * productPageSize, filteredProducts.length)} of{" "}
                    {filteredProducts.length} products
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Per page:</span>
                    <Select
                      value={String(productPageSize)}
                      onValueChange={(val) => {
                        setProductPageSize(Number(val));
                        setProductPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={productPage === 1}
                      onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                      className="h-7 px-2 text-xs"
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={productPage * productPageSize >= filteredProducts.length}
                      onClick={() => setProductPage((p) => p + 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: CUSTOMER ANALYTICS */}
            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold">Customer Metrics</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">Total Customers</span>
                      <span className="font-bold">{data.customerAnalytics.totalCustomers}</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">New Customers (Period)</span>
                      <span className="font-semibold text-emerald-600">
                        {data.customerAnalytics.newCustomers}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">Returning Customers</span>
                      <span className="font-semibold text-blue-600">
                        {data.customerAnalytics.returningCustomers}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-muted-foreground">Customers With Orders</span>
                      <span className="font-semibold">
                        {data.customerAnalytics.customersWithOrders}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-sm">
                      <span>Avg Customer Spend</span>
                      <span className="text-brand-red">
                        {formatCurrency(data.customerAnalytics.avgCustomerSpend)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
                  <h3 className="text-sm font-semibold mb-4">New vs Returning Customers Revenue</h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.customerAnalytics.newVsReturningChart}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="newCustomers"
                          name="New Customers"
                          fill="#0284c7"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="returningCustomers"
                          name="Returning Customers"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Top Customers Table */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-sm font-semibold">Top Performing Customers</h3>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="border-b bg-secondary/50 font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Orders</th>
                        <th className="p-3 text-right">Total Spent</th>
                        <th className="p-3 text-right">AOV</th>
                        <th className="p-3 text-right">Last Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No customers found.
                          </td>
                        </tr>
                      ) : (
                        paginatedCustomers.map((c) => (
                          <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="p-3">
                              <div className="font-medium text-foreground">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground">{c.email}</div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  c.status === "VIP"
                                    ? "bg-purple-500/10 text-purple-600 border-purple-200"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                }`}
                              >
                                {c.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-right tabular-nums">{c.orders}</td>
                            <td className="p-3 text-right tabular-nums font-semibold text-brand-red">
                              {formatCurrency(c.totalSpent)}
                            </td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(c.aov)}</td>
                            <td className="p-3 text-right tabular-nums text-muted-foreground">
                              {new Date(c.lastOrder).toLocaleDateString("en-IN")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                  <div>
                    Showing {(customerPage - 1) * customerPageSize + 1}–
                    {Math.min(customerPage * customerPageSize, filteredCustomers.length)} of{" "}
                    {filteredCustomers.length} customers
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Per page:</span>
                    <Select
                      value={String(customerPageSize)}
                      onValueChange={(val) => {
                        setCustomerPageSize(Number(val));
                        setCustomerPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={customerPage === 1}
                      onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                      className="h-7 px-2 text-xs"
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={customerPage * customerPageSize >= filteredCustomers.length}
                      onClick={() => setCustomerPage((p) => p + 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: INVENTORY HEALTH */}
            <TabsContent value="inventory" className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Total Stock Units</span>
                  <p className="text-xl font-bold mt-1">
                    {data.inventoryAnalytics.totalStock.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Available Stock</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">
                    {data.inventoryAnalytics.availableStock.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Reserved Stock</span>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    {data.inventoryAnalytics.reservedStock.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Inventory Valuation</span>
                  <p className="text-xl font-bold text-brand-red mt-1">
                    {formatCurrency(data.inventoryAnalytics.inventoryValue)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold">Inventory Health Distribution</h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">In Stock</span>
                        <span className="font-bold text-emerald-600">
                          {data.inventoryAnalytics.health.inStock} variants
                        </span>
                      </div>
                      <Progress value={100} className="h-2 bg-secondary" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Low Stock Threshold</span>
                        <span className="font-bold text-amber-600">
                          {data.inventoryAnalytics.health.lowStock} variants
                        </span>
                      </div>
                      <Progress
                        value={data.inventoryAnalytics.health.lowStock * 10}
                        className="h-2 bg-secondary"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Critical Stock (≤2)</span>
                        <span className="font-bold text-orange-600">
                          {data.inventoryAnalytics.health.critical} variants
                        </span>
                      </div>
                      <Progress
                        value={data.inventoryAnalytics.health.critical * 10}
                        className="h-2 bg-secondary"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Out of Stock</span>
                        <span className="font-bold text-rose-600">
                          {data.inventoryAnalytics.health.outOfStock} variants
                        </span>
                      </div>
                      <Progress
                        value={data.inventoryAnalytics.health.outOfStock * 10}
                        className="h-2 bg-secondary"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold">Centralized Inventory State Integrity</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Inventory analytics read directly from the centralized store inventory engine.
                    Stock adjustments, reservations, and audits are automatically reflected in
                    real-time without duplicating inventory states.
                  </p>
                  <div className="p-3 rounded-lg border bg-secondary/30 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Low Stock Warnings:</span>
                      <span className="font-semibold">
                        {data.inventoryAnalytics.lowStockVariants}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Critical Warnings:</span>
                      <span className="font-semibold text-amber-600">
                        {data.inventoryAnalytics.criticalStockVariants}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Out of Stock Warnings:</span>
                      <span className="font-semibold text-rose-600">
                        {data.inventoryAnalytics.outOfStockVariants}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: RETURNS & REFUNDS ANALYTICS */}
            <TabsContent value="returns" className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Total Returns</span>
                  <p className="text-xl font-bold mt-1">{data.returnsAnalytics.totalReturns}</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Return Rate</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">
                    {data.returnsAnalytics.returnRate.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Total Refund Amount</span>
                  <p className="text-xl font-bold text-rose-600 mt-1">
                    {formatCurrency(data.returnsAnalytics.totalRefundAmount)}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Avg Refund Amount</span>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(data.returnsAnalytics.avgRefundAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold">Return Status Workflow</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between p-2.5 rounded-lg border bg-secondary/30">
                      <span>Pending Returns</span>
                      <span className="font-bold text-amber-600">
                        {data.returnsAnalytics.pendingReturns}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg border bg-secondary/30">
                      <span>Approved Returns</span>
                      <span className="font-bold text-blue-600">
                        {data.returnsAnalytics.approvedReturns}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg border bg-secondary/30">
                      <span>Completed / Refunded</span>
                      <span className="font-bold text-emerald-600">
                        {data.returnsAnalytics.completedReturns}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold">Return Impact on Net Revenue</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Refunds and approved return requests are automatically deducted from gross sales
                    to calculate precise Net Revenue.
                  </p>
                  <div className="p-3 rounded-lg border bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                    Total refunded amount of{" "}
                    <strong className="font-semibold">
                      {formatCurrency(data.returnsAnalytics.totalRefundAmount)}
                    </strong>{" "}
                    has been subtracted from gross earnings.
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 6: REVIEWS & RATINGS */}
            <TabsContent value="reviews" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Average Public Rating
                  </span>
                  <div className="text-4xl font-extrabold text-amber-500 mt-2 flex items-center gap-1">
                    <Star className="h-8 w-8 fill-amber-500 text-amber-500" />
                    {data.reviewAnalytics.averageRating.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {data.reviewAnalytics.totalReviews} approved reviews
                  </p>
                  <div className="flex gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Pending:</span>{" "}
                      <strong className="font-semibold">
                        {data.reviewAnalytics.pendingReviews}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reported:</span>{" "}
                      <strong className="font-semibold text-rose-600">
                        {data.reviewAnalytics.reportedReviews}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2 space-y-3">
                  <h3 className="text-sm font-semibold mb-2">Rating Distribution</h3>
                  {([5, 4, 3, 2, 1] as const).map((stars) => {
                    const item = data.reviewAnalytics.ratingDistribution[stars];
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 w-20 text-amber-500 font-medium">
                          {stars} <Star className="h-3 w-3 fill-amber-500" />
                        </div>
                        <div className="flex-1">
                          <Progress value={item.percentage} className="h-2 bg-secondary" />
                        </div>
                        <div className="w-24 text-right tabular-nums text-muted-foreground">
                          {item.count} ({item.percentage.toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 7: MARKETING & ROAS */}
            <TabsContent value="marketing" className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Campaign Revenue</span>
                  <p className="text-xl font-bold text-brand-red mt-1">
                    {formatCurrency(data.marketingAnalytics.campaignRevenue)}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Campaign Spend</span>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(data.marketingAnalytics.campaignSpend)}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">ROAS</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">
                    {data.marketingAnalytics.roas.toFixed(2)}x
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground">Total Clicks</span>
                  <p className="text-xl font-bold mt-1">
                    {data.marketingAnalytics.clicks.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Top Campaigns Table */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-5 space-y-4">
                <h3 className="text-sm font-semibold">Top Performing Marketing Campaigns</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="border-b bg-secondary/50 font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Campaign Name</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3 text-right">Clicks</th>
                        <th className="p-3 text-right">Conversions</th>
                        <th className="p-3 text-right">ROAS</th>
                        <th className="p-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.marketingAnalytics.topCampaigns.map((c) => (
                        <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-3 font-medium text-foreground">{c.name}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px]">
                              {c.channel}
                            </Badge>
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {c.clicks.toLocaleString()}
                          </td>
                          <td className="p-3 text-right tabular-nums">{c.conversions}</td>
                          <td className="p-3 text-right tabular-nums font-semibold text-emerald-600">
                            {c.roas.toFixed(2)}x
                          </td>
                          <td className="p-3 text-right tabular-nums font-semibold text-brand-red">
                            {formatCurrency(c.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
