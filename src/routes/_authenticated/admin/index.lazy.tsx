import { createLazyFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminDashboard } from "@/lib/admin-dashboard.functions";
import { AdminDashboardSkeleton } from "@/components/admin/admin-skeletons";
import { money, dateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  Package,
  Receipt,
  Users,
  Ticket,
  ArrowRight,
  Activity,
  Calendar,
  MoreHorizontal,
  MoreVertical,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";

export const Route = createLazyFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Sparkline({
  stroke = "#dc2626",
  points = "0,15 15,12 30,18 45,8 60,16 75,5 90,12",
}: {
  stroke?: string;
  points?: string;
}) {
  const gradId = `spark-${stroke.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="w-20 h-7 shrink-0 overflow-visible" viewBox="0 0 90 22" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M 0,22 L ${points} L 90,22 Z`} fill={`url(#${gradId})`} />
      <path
        d={`M ${points}`}
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  indicator,
  indicatorColor = "text-emerald-600",
  icon: Icon,
  iconBg = "bg-red-50 text-red-600 border border-red-100",
  sparklineColor = "#dc2626",
  sparklinePoints = "0,15 15,12 30,18 45,8 60,16 75,5 90,12",
  showArrow = true,
}: {
  label: string;
  value: string;
  indicator: string;
  indicatorColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  sparklineColor?: string;
  sparklinePoints?: string;
  showArrow?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              {label}
            </span>
          </div>
          <button
            type="button"
            className="p-1 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight">
          {value}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between pt-2">
        <div className={`text-xs font-semibold flex items-center gap-1 ${indicatorColor}`}>
          {showArrow && <ArrowUpRight className="h-3.5 w-3.5" />}
          <span>{indicator}</span>
        </div>
        <Sparkline stroke={sparklineColor} points={sparklinePoints} />
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useRouteContext({ from: "/_authenticated" }) as {
    user: { id: string; email: string; role?: string; fullName?: string };
  };

  const dashFn = useServerFn(adminDashboard);
  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => dashFn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(now);
    } catch {
      return "Thursday, 16 Oct 2026";
    }
  }, [now]);

  const formattedTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(now);
    } catch {
      return "01:24 PM";
    }
  }, [now]);

  const firstName = useMemo(() => {
    const raw = (user as any)?.fullName || user?.email?.split("@")[0] || "Prince";
    return raw.split(" ")[0].toUpperCase();
  }, [user]);

  if (q.isLoading) return <AdminDashboardSkeleton />;
  if (q.isError)
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-xs">
        <p className="text-destructive font-medium text-sm">
          {(q.error as Error)?.message ?? "Could not load dashboard"}
        </p>
        <button
          onClick={() => q.refetch()}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-xs"
        >
          Retry Loading Dashboard
        </button>
      </div>
    );
  if (!q.data) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 text-center text-zinc-500 text-sm">
        No dashboard data available
      </div>
    );
  }
  const d = q.data;
  if ((d as any)?.error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-xs">
        <p className="text-destructive font-medium text-sm">{String((d as any).error)}</p>
        <button
          onClick={() => q.refetch()}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const totals = d?.totals ?? {
    sales: 0,
    salesToday: 0,
    salesMonth: 0,
    orders: 0,
    products: 0,
    customers: 0,
    avgOrderValue: 0,
  };
  const lowStock = Array.isArray(d?.lowStock) ? d.lowStock : [];
  const outOfStock = Array.isArray(d?.outOfStock) ? d.outOfStock : [];
  const recentOrders = Array.isArray(d?.recentOrders) ? d.recentOrders : [];
  const bestSellers = Array.isArray(d?.bestSellers) ? d.bestSellers : [];
  const salesByDay = Array.isArray(d?.salesByDay) ? d.salesByDay : [];
  const recentCustomers = Array.isArray(d?.recentCustomers) ? d.recentCustomers : [];
  const cur = d?.currency || "INR";

  // Combine low stock & out of stock products for the inventory alert list
  const combinedAlertProducts = [...outOfStock, ...lowStock].slice(0, 6);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* 1. Welcome Banner Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Greeting & Subtitle */}
        <div className="z-10">
          <span className="text-[11px] font-black tracking-widest text-zinc-400 uppercase">
            WELCOME BACK,
          </span>
          <h1 className="text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight mt-0.5 flex items-center gap-2">
            <span>{firstName}</span>
            <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
            Here's what's happening with your store today.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Link to="/admin/health">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700 hover:bg-zinc-50 gap-1.5"
              >
                <Activity className="h-3.5 w-3.5 text-red-600" />
                System Health
              </Button>
            </Link>
            <AdminEraseDataButton
              section="dashboard"
              sectionLabel="Dashboard & Operations"
              buttonText="Erase All Operational Data"
              onSuccess={() => q.refetch()}
            />
          </div>
        </div>

        {/* Center: RIOTOUS Streetwear T-shirt Graphic (seamlessly blending into the card) */}
        <div className="hidden xl:flex items-center justify-center relative h-32 w-80 shrink-0 pointer-events-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src="/assets/tee-black-front.webp"
              alt="RIOTOUS Streetwear"
              className="h-36 w-auto object-contain drop-shadow-xl"
            />
            {/* Soft gradient masks on sides */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
          </div>
        </div>

        {/* Right: Slogan & Live Date/Clock */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8 z-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-100">
          {/* Slogan */}
          <div className="text-left sm:text-right hidden sm:block">
            <div className="text-[11px] font-black tracking-tight text-zinc-900 uppercase leading-snug">
              WE
              <br />
              DON'T
              <br />
              FOLLOW
              <br />
              TRENDS.
              <br />
              WE
              <br />
              PRINT
              <br />
              THEM.
            </div>
            <div className="h-1 w-10 bg-red-600 mt-1.5 sm:ml-auto rounded-full" />
          </div>

          {/* Clock Widget */}
          <div className="text-left sm:text-right">
            <div className="text-xs font-medium text-zinc-500">{formattedDate}</div>
            <div className="text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight mt-0.5">
              {formattedTime}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Have a productive day!</div>
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Cards (4 in a row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Sales"
          value={money(totals.sales, cur)}
          indicator="+12% from last month"
          indicatorColor="text-emerald-600"
          icon={IndianRupee}
          iconBg="bg-zinc-950 text-white shadow-xs"
          sparklineColor="#dc2626"
          sparklinePoints="0,18 15,14 30,17 45,9 60,15 75,5 90,11"
        />
        <StatCard
          label="Orders"
          value={String(totals.orders)}
          indicator="+1 new today"
          indicatorColor="text-emerald-600"
          icon={Receipt}
          iconBg="bg-red-50 text-red-600 border border-red-100/80"
          sparklineColor="#f43f5e"
          sparklinePoints="0,17 15,16 30,12 45,15 60,8 75,12 90,6"
        />
        <StatCard
          label="Products"
          value={String(totals.products)}
          indicator={`• ${lowStock.length} low stock`}
          indicatorColor="text-zinc-500"
          icon={Package}
          iconBg="bg-red-50 text-red-600 border border-red-100/80"
          sparklineColor="#94a3b8"
          sparklinePoints="0,15 15,15 30,13 45,14 60,10 75,10 90,9"
          showArrow={false}
        />
        <StatCard
          label="Customers"
          value={String(totals.customers)}
          indicator="+1 new this week"
          indicatorColor="text-emerald-600"
          icon={Users}
          iconBg="bg-red-50 text-red-600 border border-red-100/80"
          sparklineColor="#10b981"
          sparklinePoints="0,18 15,16 30,14 45,15 60,11 75,8 90,6"
        />
      </div>

      {/* 3. Row 2: Sales Overview Area Chart + Promotions Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart (2 Columns) */}
        <section className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/70">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 leading-tight">Sales Overview</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Total sales for the last 30 days</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs font-semibold cursor-pointer hover:bg-zinc-100 transition-colors">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              <span>Last 30 Days</span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    if (typeof v !== "string") return "";
                    const parts = v.split("-");
                    if (parts.length === 3) {
                      const months = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ];
                      return `${parts[2]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`;
                    }
                    return v;
                  }}
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  stroke="#94a3b8"
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#ffffff",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                  }}
                  formatter={(v: number) => [money(v, cur), "Revenue"]}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  fill="url(#salesGrad)"
                  dot={{ r: 3.5, fill: "#dc2626", stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "#b91c1c", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Promotions Card (1 Column) */}
        <section className="rounded-2xl border border-red-950/40 bg-gradient-to-br from-[#0c0505] via-[#160606] to-[#260a0a] p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-xs">
          {/* Streetwear backdrop graphic */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3/5 opacity-25 mix-blend-luminosity bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: "url('/assets/tee-black-front.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0505] via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-950/60 mb-5">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">
              PROMOTIONS
            </span>
            <h3 className="text-2xl font-black text-white mt-1 leading-tight tracking-tight">
              Active Coupons
              <br />& Discounts
            </h3>
            <p className="text-xs text-zinc-300/80 mt-3 leading-relaxed max-w-xs">
              Monitor active promotions, redemption frequency, and total discounts given.
            </p>
          </div>

          <div className="relative z-10 pt-6">
            <Link
              to="/admin/coupons"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Manage Coupons</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* 4. Row 3: Recent Orders Table + Inventory Alerts List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Orders (3 Columns) */}
        <section className="lg:col-span-3 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/70">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 leading-tight">Recent Orders</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Latest orders from your store</p>
                </div>
              </div>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400">No orders placed yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="pb-3 w-8">#</th>
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {recentOrders.map((o, idx) => {
                      const statusColor =
                        o.status === "Pending"
                          ? "bg-amber-50 text-amber-700 border-amber-200/60"
                          : o.status === "Confirmed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : o.status === "Shipped"
                              ? "bg-sky-50 text-sky-700 border-sky-200/60"
                              : o.status === "Delivered"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200";

                      return (
                        <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 text-zinc-400 font-medium">{idx + 1}</td>
                          <td className="py-3 font-bold text-zinc-900">
                            <Link
                              to="/admin/orders"
                              search={{ q: o.order_number }}
                              className="hover:text-red-600 transition-colors"
                            >
                              {o.order_number}
                            </Link>
                          </td>
                          <td className="py-3 text-zinc-700 font-medium truncate max-w-[120px]">
                            {o.shipping_name || "Guest Customer"}
                          </td>
                          <td className="py-3 text-zinc-500 text-[11px]">
                            {dateTime(o.created_at)}
                          </td>
                          <td className="py-3 font-bold text-zinc-900">
                            {money(o.total_amount, o.currency)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              to="/admin/orders"
                              search={{ q: o.order_number }}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 inline-block transition-colors"
                              title="View Order"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Inventory Alerts (2 Columns) */}
        <section className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/70">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 leading-tight">
                    Inventory Alerts
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Products running low on stock</p>
                </div>
              </div>
              <Link
                to="/admin/inventory"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {combinedAlertProducts.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400">
                All products have healthy inventory levels.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">SKU</th>
                      <th className="pb-3 text-center">Stock</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {combinedAlertProducts.map((p) => {
                      const isZero = p.stock_quantity <= 0;
                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden flex items-center justify-center">
                                <img
                                  src="/assets/tee-black-front.webp"
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              </div>
                              <span className="font-semibold text-zinc-900 truncate max-w-[130px] block">
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 font-mono text-[11px] text-zinc-400">
                            RIO-TS-{String(p.id).padStart(3, "0")}
                          </td>
                          <td className="py-2.5 text-center font-bold text-red-600">
                            {p.stock_quantity}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isZero
                                  ? "bg-rose-50 text-rose-600 border-rose-200/60"
                                  : "bg-red-50 text-red-600 border-red-200/60"
                              }`}
                            >
                              {isZero ? "Out of Stock" : "Low Stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 5. Additional Operational Overview: Best Sellers & Newest Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Best Sellers */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Top Selling Designs</h3>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              By units sold
            </span>
          </div>
          {bestSellers.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No sales recorded yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-50 text-xs">
              {bestSellers.map((b) => (
                <li key={b.name} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="font-semibold text-zinc-800 truncate">{b.name}</span>
                  <span className="shrink-0 font-medium text-zinc-500">
                    <span className="font-bold text-zinc-900">{b.units}</span> units ·{" "}
                    <span className="font-bold text-zinc-900">{money(b.revenue, cur)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Newest Customers */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Recent Customer Registrations</h3>
            <Link
              to="/admin/customers"
              className="text-xs text-red-600 font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No registered customers yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-50 text-xs">
              {recentCustomers.slice(0, 5).map((c) => (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-800 block truncate">
                      {c.full_name || "Account Member"}
                    </span>
                    <span className="text-[11px] text-zinc-400 block truncate">{c.email}</span>
                  </div>
                  <span className="shrink-0 text-zinc-500 font-medium">
                    <span className="font-bold text-zinc-900">{c.orders}</span> orders ·{" "}
                    <span className="font-bold text-zinc-900">{money(c.spent, cur)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
