x import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminPanelAccess } from "@/lib/auth.types";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getAdminNotifications } from "@/lib/admin-dashboard.functions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Boxes,
  Palette,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  ScrollText,
  ExternalLink,
  RotateCcw,
  Star,
  Users,
  Megaphone,
  BarChart3,
  Truck,
  CreditCard,
  Store,
  UserCog,
  Settings,
  Ticket,
  Activity,
  Tag,
  ChevronDown,
} from "lucide-react";

function AdminPendingShell() {
  return (
    <div className="min-h-screen flex bg-[#0c0c0e]">
      {/* Dark Sidebar Skeleton */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0c0c0e] border-r border-zinc-800/60 h-screen sticky top-0 p-4">
        <div className="px-2 pt-2 pb-4">
          <img
            src="/assets/riotous-logo.png"
            alt="RIOTOUS"
            className="h-6 w-auto object-contain"
          />
          <span className="block text-[9px] font-bold tracking-[0.25em] text-zinc-500 uppercase mt-1">
            ADMIN PANEL
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-sm">
          <div className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold px-3.5 py-2.5 text-xs shadow-md shadow-red-950/40">
            Dashboard
          </div>
          <div className="px-3.5 py-2.5 text-xs text-zinc-500">Orders</div>
          <div className="px-3.5 py-2.5 text-xs text-zinc-500">Products</div>
          <div className="px-3.5 py-2.5 text-xs text-zinc-500">Inventory</div>
        </div>
      </aside>

      {/* Main Container Skeleton */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f4f5f7]">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800/60 bg-[#0c0c0e] px-6 py-2.5">
          <span className="text-xs font-semibold text-zinc-400">RIOTOUS Management Console</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9d5ff] text-[#581c87] text-xs font-bold">
            P
          </div>
        </div>
        <main className="flex-1 p-6 md:p-8">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Admin Console</h1>
            <p className="mt-1 text-xs text-zinc-500">Connecting to management console…</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
  pendingComponent: AdminPendingShell,
  head: () => ({
    meta: [
      { title: "Store Admin Dashboard | RIOTOUS Management Console" },
      { name: "description", content: "RIOTOUS store administration." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: boolean;
  isExternalIcon?: boolean;
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: Receipt, badge: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/returns", label: "Returns", icon: RotateCcw },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/offers", label: "Offers", icon: Tag },
  { to: "/admin/designs", label: "Design Studio", icon: Palette },
  { to: "/admin/storefront", label: "Storefront", icon: Store, isExternalIcon: true },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/staff", label: "Staff", icon: UserCog },
  { to: "/admin/health", label: "System Health", icon: Activity },
  { to: "/admin/activity", label: "Activity log", icon: ScrollText },
];

function AdminLayout() {
  const { user } = useRouteContext({ from: "/_authenticated" }) as {
    user: { id: string; email: string; role?: string };
  };
  const isAdminFn = useServerFn(checkIsAdmin);
  const notifFn = useServerFn(getAdminNotifications);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [term, setTerm] = useState("");

  const isExplicitAdmin = hasAdminPanelAccess(user as any);

  const roleQ = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      if (isExplicitAdmin) return true;
      const token = typeof window !== "undefined" ? localStorage.getItem("riotous_session") : null;
      try {
        const isAdm = await isAdminFn({ data: { token: token || undefined } });
        return Boolean(isAdm || isExplicitAdmin);
      } catch {
        return Boolean(isExplicitAdmin);
      }
    },
    initialData: isExplicitAdmin ? true : undefined,
    staleTime: Infinity,
    retry: 1,
  });

  const notifQ = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => notifFn(),
    enabled: roleQ.data !== false,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { signOut: authSignOut } = useAuth();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await authSignOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  useEffect(() => {
    if (roleQ.data === false && !isExplicitAdmin) {
      toast.error("Access denied: administrator privileges required");
      navigate({ to: "/", replace: true });
    }
  }, [roleQ.data, isExplicitAdmin, navigate]);

  const notifications = notifQ.data ?? [];

  const renderNavLinks = () => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to as "/admin"}
          activeOptions={item.exact ? { exact: true } : undefined}
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white group"
          activeProps={{
            className:
              "!bg-gradient-to-r !from-red-600 !to-rose-600 !text-white !font-semibold shadow-md shadow-red-950/40 hover:!bg-red-600 hover:!text-white",
          }}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0 transition-colors" />
            <span>{item.label}</span>
          </div>
          {item.badge && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 text-white px-1 text-[10px] font-bold leading-none shadow-xs">
              2
            </span>
          )}
          {item.isExternalIcon && (
            <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />
          )}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[#0c0c0e] text-zinc-900 font-sans selection:bg-red-600 selection:text-white">
      {/* Desktop Dark Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0c0c0e] border-r border-zinc-800/60 h-screen sticky top-0 z-50">
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-3">
          <Link to="/admin" className="block focus:outline-none">
            <img
              src="/assets/riotous-logo.png"
              alt="RIOTOUS"
              className="h-6 w-auto object-contain"
            />
            <span className="block text-[9px] font-bold tracking-[0.25em] text-zinc-500 uppercase mt-1">
              ADMIN PANEL
            </span>
          </Link>
        </div>

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {renderNavLinks()}
        </div>

        {/* Bottom Streetwear Branded Card */}
        <div className="p-3 pt-2 mt-auto">
          <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-3 text-white relative overflow-hidden shadow-inner">
            <img
              src="/assets/riotous-logo.png"
              alt="RIOTOUS"
              className="h-3.5 w-auto object-contain opacity-90 mb-1.5"
            />
            <p className="text-[9px] font-bold tracking-wider uppercase text-zinc-400 leading-tight">
              WE DON'T FOLLOW TRENDS. WE PRINT THEM.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-[#0c0c0e] border-r border-zinc-800/80 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-800/60">
              <Link to="/admin" onClick={() => setSidebarOpen(false)} className="block">
                <img
                  src="/assets/riotous-logo.png"
                  alt="RIOTOUS"
                  className="h-5 w-auto object-contain"
                />
                <span className="block text-[8px] font-bold tracking-[0.25em] text-zinc-500 uppercase mt-0.5">
                  ADMIN PANEL
                </span>
              </Link>
              <button
                aria-label="Close"
                onClick={() => setSidebarOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {renderNavLinks()}
            </div>
            <div className="p-3 mt-auto">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/90 p-3 text-white">
                <img
                  src="/assets/riotous-logo.png"
                  alt="RIOTOUS"
                  className="h-3.5 w-auto object-contain opacity-90 mb-1"
                />
                <p className="text-[8px] font-bold tracking-wider uppercase text-zinc-400 leading-tight">
                  WE DON'T FOLLOW TRENDS. WE PRINT THEM.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Column */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f4f5f7]">
        {/* Dark Top Utility Bar */}
        <header className="sticky top-0 z-40 bg-[#0c0c0e] border-b border-zinc-800/60 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <form
              className="relative flex-1 max-w-xs sm:max-w-sm lg:max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                if (!term.trim()) return;
                navigate({ to: "/admin/orders", search: { q: term.trim() } });
              }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search orders, customers, products…"
                className="h-9 w-full rounded-xl border border-zinc-800 bg-[#16161a] pl-9 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-red-600/70 focus:outline-none focus:ring-1 focus:ring-red-600/70 transition-all"
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Clear search text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold transition-colors"
            >
              <span>Visit Store</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Nothing needs your attention.
                  </div>
                ) : (
                  notifications.slice(0, 12).map((n, i) => (
                    <DropdownMenuItem key={i} className="flex-col items-start gap-0.5">
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.detail}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left"
                  aria-label="Admin profile"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9d5ff] text-[#581c87] font-black text-xs shrink-0 shadow-xs">
                    {((user as any).fullName?.[0] || user.email?.[0] || "P").toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col leading-tight">
                    <span className="text-xs font-bold text-white truncate max-w-[130px]">
                      {(user as any).fullName || user.email.split("@")[0] || "Prince Vekariya"}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {user.role === "admin" ? "Administrator" : (user.role || "Administrator")}
                    </span>
                  </div>
                  <ChevronDown className="hidden md:block h-3.5 w-3.5 text-zinc-400 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {(user as any).fullName || user.email.split("@")[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <span className="inline-block mt-1 w-fit text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-red/10 text-brand-red">
                      {user.role || "Staff"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/admin/settings" })}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" /> Store Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/account/orders" })}
                  className="cursor-pointer"
                >
                  Customer account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {roleQ.data === false && !isExplicitAdmin ? (
            <div className="container py-32 text-center">
              <h1 className="text-3xl font-bold">Access denied</h1>
              <p className="mt-2 text-muted-foreground">
                You must be an administrator to view this area.
              </p>
              <Button asChild className="mt-6">
                <Link to="/">Back to store</Link>
              </Button>
            </div>
          ) : roleQ.isError && !isExplicitAdmin ? (
            <div className="container py-32 text-center">
              <h1 className="text-3xl font-bold">Could not verify access</h1>
              <p className="mt-2 text-muted-foreground">
                Your administrator access could not be checked. Please try again.
              </p>
              <Button className="mt-6" onClick={() => roleQ.refetch()}>
                Try again
              </Button>
            </div>
          ) : roleQ.isLoading && !isExplicitAdmin ? (
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Verifying administrator credentials…</h2>
              <p className="mt-1 text-sm text-zinc-500">Securing administrative console.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
}
