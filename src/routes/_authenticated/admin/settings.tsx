import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getStoreSettings,
  updateStoreSettings,
  updateAccountProfile,
  changeAccountPassword,
  exportStoreData,
  toggleMaintenanceMode,
  type StoreSettings,
} from "@/lib/admin-settings.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Store,
  User,
  Shield,
  Bell,
  Globe2,
  Palette,
  CreditCard,
  Truck,
  Globe,
  Database,
  AlertOctagon,
  Save,
  Download,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  FileSpreadsheet,
  FileCode,
  ExternalLink,
  Layers,
  Lock,
  Package,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Upload,
  CheckCheck,
  X,
} from "lucide-react";
import {
  amazonListTemplates,
  amazonSaveTemplate,
  amazonUpdateMapping,
  amazonDeleteTemplate,
  amazonParseTemplateHeaders,
  RIOTOUS_FIELD_KEYS,
  type AmazonTemplate,
} from "@/lib/amazon-export.functions";
import { toast } from "sonner";
import { useRouteContext } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
  head: () => ({
    meta: [
      { title: "Store Preferences & Settings | RIOTOUS Admin Console" },
      {
        name: "description",
        content:
          "Configure store information, security, notifications, payments, and system preferences.",
      },
    ],
  }),
});

type SettingsTab =
  | "store"
  | "account"
  | "security"
  | "notifications"
  | "regional"
  | "appearance"
  | "payment"
  | "shipping"
  | "website"
  | "data"
  | "amazon"
  | "danger";

function AdminSettingsPage() {
  const qc = useQueryClient();
  const { user } = useRouteContext({ from: "/_authenticated" }) as {
    user: { id: string; email: string; fullName?: string | null; role?: string };
  };

  const getSettingsFn = useServerFn(getStoreSettings);
  const updateSettingsFn = useServerFn(updateStoreSettings);
  const updateAccountFn = useServerFn(updateAccountProfile);
  const changePasswordFn = useServerFn(changeAccountPassword);
  const exportDataFn = useServerFn(exportStoreData);
  const toggleMaintenanceFn = useServerFn(toggleMaintenanceMode);

  const [activeTab, setActiveTab] = useState<SettingsTab>("store");

  // Store settings form state
  const [form, setForm] = useState<Partial<StoreSettings>>({});

  // Personal account form state
  const [accountName, setAccountName] = useState(user.fullName || "");
  const [accountPhone, setAccountPhone] = useState("");

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Danger zone state
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");

  // Export state
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Fetch store settings query
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => getSettingsFn(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
      setMaintenanceMsg(settingsQuery.data.maintenanceMessage || "");
    }
  }, [settingsQuery.data]);

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: (data: Partial<StoreSettings>) => updateSettingsFn({ data }),
    onSuccess: () => {
      toast.success("Settings saved successfully!");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save settings.");
    },
  });

  const saveAccountMutation = useMutation({
    mutationFn: () =>
      updateAccountFn({ data: { fullName: accountName, phone: accountPhone || null } }),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update profile.");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      changePasswordFn({
        data: { currentPassword, newPassword, confirmPassword },
      }),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to change password.");
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      toggleMaintenanceFn({
        data: { enabled, message: maintenanceMsg },
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      setMaintenanceDialog(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to change maintenance mode.");
    },
  });

  const handleExport = async (dataType: any, format: "json" | "csv") => {
    setExportingType(`${dataType}_${format}`);
    try {
      const res = await exportDataFn({ data: { dataType, format } });
      const blob = new Blob([res.data], {
        type: format === "csv" ? "text/csv;charset=utf-8;" : "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.count} records (${format.toUpperCase()})`);
    } catch (err: any) {
      toast.error(err?.message || "Export failed.");
    } finally {
      setExportingType(null);
    }
  };

  const navItems: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "store", label: "Store Profile", icon: Store },
    { id: "account", label: "My Account", icon: User },
    { id: "security", label: "Security & Access", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "regional", label: "Regional & Currency", icon: Globe2 },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "payment", label: "Payment Gateways", icon: CreditCard },
    { id: "shipping", label: "Shipping & Delivery", icon: Truck },
    { id: "website", label: "Website & SEO", icon: Globe },
    { id: "data", label: "Data Export & Backup", icon: Database },
    { id: "amazon", label: "Amazon Export", icon: Package },
    { id: "danger", label: "Danger Zone", icon: AlertOctagon },
  ];

  if (settingsQuery.isLoading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-brand-red" />
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System & Store Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure store preferences, business profile, security, and administrative settings.
          </p>
        </div>
        <Button
          onClick={() => saveSettingsMutation.mutate(form)}
          disabled={saveSettingsMutation.isPending}
          className="bg-brand-red text-white hover:bg-brand-red/90"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      {/* Settings Layout: Sidebar + Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <Card className="md:col-span-1 border-border h-fit">
          <CardContent className="p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isDanger = item.id === "danger";
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-colors text-left ${
                    isActive
                      ? isDanger
                        ? "bg-destructive/15 text-destructive font-semibold"
                        : "bg-brand-red/10 text-brand-red font-semibold"
                      : isDanger
                        ? "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? (isDanger ? "text-destructive" : "text-brand-red") : ""}`}
                  />
                  {item.label}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* TAB 1: STORE PROFILE */}
          {activeTab === "store" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-brand-red" /> Store Information
                </CardTitle>
                <CardDescription>
                  Public company and branding details displayed on customer invoices, emails, and
                  footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="store-name">Store Name</Label>
                    <Input
                      id="store-name"
                      value={form.storeName || ""}
                      onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                      placeholder="RIOTOUS"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="business-gstin">GSTIN / Tax Registration ID</Label>
                    <Input
                      id="business-gstin"
                      value={form.businessGstin || ""}
                      onChange={(e) => setForm({ ...form, businessGstin: e.target.value })}
                      placeholder="24AAAAA0000A1Z5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="store-email">Support Email</Label>
                    <Input
                      id="store-email"
                      type="email"
                      value={form.storeEmail || ""}
                      onChange={(e) => setForm({ ...form, storeEmail: e.target.value })}
                      placeholder="support@riotous.store"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="store-phone">Customer Service Helpline</Label>
                    <Input
                      id="store-phone"
                      value={form.storePhone || ""}
                      onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="store-address">Registered Business Address</Label>
                  <Input
                    id="store-address"
                    value={form.storeAddress || ""}
                    onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                    placeholder="Plot 42, Streetwear District, Surat, Gujarat 395006, India"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveSettingsMutation.mutate(form)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Store Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: MY ACCOUNT */}
          {activeTab === "account" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-brand-red" /> Personal Staff Account
                </CardTitle>
                <CardDescription>
                  Manage your personal display name, contact phone, and review your assigned role.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red text-white font-bold text-lg">
                    {(user.fullName?.[0] || user.email[0] || "A").toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-none">
                      {user.fullName || user.email.split("@")[0]}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{user.email}</p>
                    <div className="mt-2">
                      <Badge className="bg-brand-red text-white font-semibold text-[11px]">
                        {user.role || "Staff Member"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-name">Full Name</Label>
                    <Input
                      id="acc-name"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Alex Mercer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="acc-phone">Phone Number</Label>
                    <Input
                      id="acc-phone"
                      value={accountPhone}
                      onChange={(e) => setAccountPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveAccountMutation.mutate()}
                    disabled={saveAccountMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: SECURITY & ACCESS */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-brand-red" /> Change Account Password
                  </CardTitle>
                  <CardDescription>
                    Update your login credentials. Must verify your current password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="curr-pwd">Current Password</Label>
                    <Input
                      id="curr-pwd"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pwd">New Password</Label>
                      <Input
                        id="new-pwd"
                        type="password"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="conf-pwd">Confirm New Password</Label>
                      <Input
                        id="conf-pwd"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={() => changePasswordMutation.mutate()}
                      disabled={
                        changePasswordMutation.isPending || !currentPassword || !newPassword
                      }
                      className="bg-brand-red text-white hover:bg-brand-red/90"
                    >
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" /> Security Safeguards & Audit
                    Status
                  </CardTitle>
                  <CardDescription>
                    Real-time security mechanisms active for your administrative environment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border">
                    <div>
                      <span className="font-semibold block text-foreground">
                        Role-Based Access Control (RBAC)
                      </span>
                      <span className="text-muted-foreground">
                        Enforces server-side permission validations on all administrative API
                        endpoints.
                      </span>
                    </div>
                    <Badge className="bg-emerald-600/10 text-emerald-500 border-emerald-500/30">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border">
                    <div>
                      <span className="font-semibold block text-foreground">
                        SHA-256 Salted Cryptographic Hashing
                      </span>
                      <span className="text-muted-foreground">
                        Passwords are securely salted and never stored in plain text.
                      </span>
                    </div>
                    <Badge className="bg-emerald-600/10 text-emerald-500 border-emerald-500/30">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border">
                    <div>
                      <span className="font-semibold block text-foreground">
                        Immutable Audit Trail Logging
                      </span>
                      <span className="text-muted-foreground">
                        Records all staff changes, role modifications, and sensitive transactions.
                      </span>
                    </div>
                    <Badge className="bg-emerald-600/10 text-emerald-500 border-emerald-500/30">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-brand-red" /> Email & Dispatch Alerts
                </CardTitle>
                <CardDescription>
                  Configure automated email notifications for store activities and inventory
                  thresholds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="notify-email">Notification Dispatch Email</Label>
                  <Input
                    id="notify-email"
                    type="email"
                    value={form.notificationEmail || ""}
                    onChange={(e) => setForm({ ...form, notificationEmail: e.target.value })}
                    placeholder="alerts@riotous.store"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                    Alert Triggers
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.orderNotifications !== false}
                        onChange={(e) => setForm({ ...form, orderNotifications: e.target.checked })}
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">New Orders</span>
                        <span className="text-xs text-muted-foreground">
                          Notify on new completed customer order
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.lowStockNotifications !== false}
                        onChange={(e) =>
                          setForm({ ...form, lowStockNotifications: e.target.checked })
                        }
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">
                          Low Stock Warnings
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Alert when product variant reaches ≤ 5 units
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.returnNotifications !== false}
                        onChange={(e) =>
                          setForm({ ...form, returnNotifications: e.target.checked })
                        }
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">
                          Returns & Exchanges
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Alert on new return request submission
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.reviewNotifications !== false}
                        onChange={(e) =>
                          setForm({ ...form, reviewNotifications: e.target.checked })
                        }
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">Customer Reviews</span>
                        <span className="text-xs text-muted-foreground">
                          Alert on new product feedback submission
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.paymentNotifications !== false}
                        onChange={(e) =>
                          setForm({ ...form, paymentNotifications: e.target.checked })
                        }
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">Payment Events</span>
                        <span className="text-xs text-muted-foreground">
                          Alert on webhook failures or chargebacks
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.shippingNotifications !== false}
                        onChange={(e) =>
                          setForm({ ...form, shippingNotifications: e.target.checked })
                        }
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">Shipment Tracking</span>
                        <span className="text-xs text-muted-foreground">
                          Alert on courier out-for-delivery events
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveSettingsMutation.mutate(form)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Notification Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: REGIONAL */}
          {activeTab === "regional" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-brand-red" /> Regional & Currency Localization
                </CardTitle>
                <CardDescription>
                  Configure base currency, time display, date formatting, and regional targets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="curr-sym">Currency Symbol</Label>
                    <Input
                      id="curr-sym"
                      value={form.currencySymbol || "₹"}
                      onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="curr-code">Currency Code</Label>
                    <Input
                      id="curr-code"
                      value={form.currencyCode || "INR"}
                      onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <select
                      value={form.timezone || "Asia/Kolkata"}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                      <option value="UTC">UTC (+00:00)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Date Format</Label>
                    <select
                      value={form.dateFormat || "DD/MM/YYYY"}
                      onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (Indian standard)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US standard)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Operating Country</Label>
                    <Input
                      value={form.country || "India"}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Default Language</Label>
                    <Input
                      value={form.language || "en"}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveSettingsMutation.mutate(form)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Regional Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: APPEARANCE */}
          {activeTab === "appearance" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-brand-red" /> Admin Appearance & Theme
                </CardTitle>
                <CardDescription>
                  Configure control panel visual styling and branding accents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Interface Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {["dark", "light", "system"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, appearanceTheme: t as any })}
                        className={`p-4 rounded-lg border text-center text-xs font-semibold capitalize transition-all ${
                          form.appearanceTheme === t
                            ? "border-brand-red bg-brand-red/10 text-brand-red ring-1 ring-brand-red"
                            : "border-border hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {t} Mode
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Branding Accent Palette
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#ef4444] border-2 border-white shadow-sm" />
                    <div>
                      <span className="text-xs font-bold block">RIOTOUS Crimson</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        #ef4444 (Primary Brand Color)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveSettingsMutation.mutate(form)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Appearance
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 7: PAYMENT */}
          {activeTab === "payment" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-red" /> Payment Gateways & Checkout
                  Methods
                </CardTitle>
                <CardDescription>
                  Manage active payment methods, Razorpay integration, and Cash on Delivery
                  surcharges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Razorpay Status */}
                <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <span>Razorpay Payment Gateway</span>
                      <Badge className="bg-emerald-600/10 text-emerald-500 border-emerald-500/30">
                        Integrated
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Handles instant UPI, Cards, NetBanking, and Digital Wallets checkout.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                    Customer Checkout Options
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* COD */}
                    <div className="p-3.5 rounded-md border bg-card space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.codEnabled !== false}
                          onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
                          className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                        />
                        <span className="font-medium text-foreground">Cash on Delivery (COD)</span>
                      </label>
                      <div className="pl-7 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          COD Extra Handling Fee (₹)
                        </Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={form.codExtraCharge ?? 0}
                          onChange={(e) =>
                            setForm({ ...form, codExtraCharge: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    {/* UPI */}
                    <label className="flex items-center gap-3 p-3.5 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.upiEnabled !== false}
                        onChange={(e) => setForm({ ...form, upiEnabled: e.target.checked })}
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">
                          UPI (GPay / PhonePe / Paytm)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Instant QR & App redirection
                        </span>
                      </div>
                    </label>

                    {/* Cards */}
                    <label className="flex items-center gap-3 p-3.5 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.cardEnabled !== false}
                        onChange={(e) => setForm({ ...form, cardEnabled: e.target.checked })}
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">
                          Credit & Debit Cards
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Visa, MasterCard, RuPay, Amex
                        </span>
                      </div>
                    </label>

                    {/* NetBanking */}
                    <label className="flex items-center gap-3 p-3.5 rounded-md border bg-card cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.netbankingEnabled !== false}
                        onChange={(e) => setForm({ ...form, netbankingEnabled: e.target.checked })}
                        className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-4 w-4"
                      />
                      <div>
                        <span className="font-medium block text-foreground">
                          Net Banking & Wallets
                        </span>
                        <span className="text-xs text-muted-foreground">
                          50+ major Indian banks supported
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveSettingsMutation.mutate(form)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Payment Rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 8: SHIPPING */}
          {activeTab === "shipping" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-brand-red" /> Shipping & Fulfillment Rates
                </CardTitle>
                <CardDescription>
                  Configure automated free shipping cart thresholds and express dispatch charges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="free-thresh">Free Shipping Minimum (₹)</Label>
                    <Input
                      id="free-thresh"
                      type="number"
                      value={form.freeShippingThreshold ?? 1499}
                      onChange={(e) =>
                        setForm({ ...form, freeShippingThreshold: Number(e.target.value) })
                      }
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Orders ≥ this amount get free shipping.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="std-charge">Standard Delivery Fee (₹)</Label>
                    <Input
                      id="std-charge"
                      type="number"
                      value={form.standardShippingCharge ?? 99}
                      onChange={(e) =>
                        setForm({ ...form, standardShippingCharge: Number(e.target.value) })
                      }
                    />
                    <span className="text-[11px] text-muted-foreground">
                      3–5 Business Days delivery
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="exp-charge">Express Air Delivery Fee (₹)</Label>
                    <Input
                      id="exp-charge"
                      type="number"
                      value={form.expressShippingCharge ?? 199}
                      onChange={(e) =>
                        setForm({ ...form, expressShippingCharge: Number(e.target.value) })
                      }
                    />
                    <span className="text-[11px] text-muted-foreground">
                      1–2 Days priority air delivery
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => saveSettingsMutation.mutate(form)}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-brand-red text-white hover:bg-brand-red/90"
                  >
                    Save Shipping Rates
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 9: WEBSITE & SEO */}
          {activeTab === "website" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-brand-red" /> Storefront & SEO Configuration
                </CardTitle>
                <CardDescription>
                  Access visual site editor, adjust meta details, and preview live customer
                  experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">Visual Website Builder & Layouts</h4>
                      <p className="text-xs text-muted-foreground">
                        Customize hero banners, typography, announcements, and storefront layout in
                        real-time.
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-brand-red text-white hover:bg-brand-red/90"
                    >
                      <a href="/admin/website">
                        Open Website Builder <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">Live Storefront</h4>
                      <p className="text-xs text-muted-foreground">
                        View the public customer-facing RIOTOUS shopping storefront.
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href="/" target="_blank" rel="noreferrer">
                        Open Storefront <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 10: DATA EXPORT & BACKUP */}
          {activeTab === "data" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-brand-red" /> Data Export & Database Backups
                </CardTitle>
                <CardDescription>
                  Download complete database snapshots and audit records for accounting, compliance,
                  and backups.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Products Export */}
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Products Catalog</h4>
                      <Badge variant="outline" className="text-[10px]">
                        Catalog
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All products, prices, stock quantities, and tags.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "products_csv"}
                        onClick={() => handleExport("products", "csv")}
                      >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "products_json"}
                        onClick={() => handleExport("products", "json")}
                      >
                        <FileCode className="mr-1.5 h-3.5 w-3.5" /> JSON
                      </Button>
                    </div>
                  </div>

                  {/* Orders Export */}
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Orders & Invoices</h4>
                      <Badge variant="outline" className="text-[10px]">
                        Sales
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Full customer order histories, payment statuses, and totals.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "orders_csv"}
                        onClick={() => handleExport("orders", "csv")}
                      >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "orders_json"}
                        onClick={() => handleExport("orders", "json")}
                      >
                        <FileCode className="mr-1.5 h-3.5 w-3.5" /> JSON
                      </Button>
                    </div>
                  </div>

                  {/* Customers Export */}
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Customers & Users</h4>
                      <Badge variant="outline" className="text-[10px]">
                        CRM
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registered customer accounts, contact details, and dates.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "customers_csv"}
                        onClick={() => handleExport("customers", "csv")}
                      >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "customers_json"}
                        onClick={() => handleExport("customers", "json")}
                      >
                        <FileCode className="mr-1.5 h-3.5 w-3.5" /> JSON
                      </Button>
                    </div>
                  </div>

                  {/* Audit Log Export */}
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Security Audit Logs</h4>
                      <Badge variant="outline" className="text-[10px]">
                        Compliance
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Administrative audit logs, actor emails, timestamps, and IP trails.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "audit_csv"}
                        onClick={() => handleExport("audit", "csv")}
                      >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        disabled={exportingType === "audit_json"}
                        onClick={() => handleExport("audit", "json")}
                      >
                        <FileCode className="mr-1.5 h-3.5 w-3.5" /> JSON
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 11: DANGER ZONE */}
          {activeTab === "danger" && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertOctagon className="h-5 w-5" /> Danger Zone (Super Admin Access Only)
                </CardTitle>
                <CardDescription>
                  Critical system operations that affect public storefront availability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-destructive/30 bg-background/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        Store Maintenance Mode
                        {form.maintenanceMode ? (
                          <Badge className="bg-amber-600 text-white font-semibold">Enabled</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-emerald-500 border-emerald-500/30"
                          >
                            Store LIVE
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        When enabled, non-admin visitors will see a maintenance notice instead of
                        the store catalog.
                      </p>
                    </div>
                    <Button
                      variant={form.maintenanceMode ? "default" : "destructive"}
                      size="sm"
                      onClick={() => setMaintenanceDialog(true)}
                    >
                      {form.maintenanceMode
                        ? "Disable Maintenance Mode"
                        : "Enable Maintenance Mode"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* TAB: AMAZON EXPORT */}
      {activeTab === "amazon" && <AmazonExportSettings />}

      {/* MAINTENANCE MODE CONFIRMATION DIALOG */}
      <Dialog open={maintenanceDialog} onOpenChange={setMaintenanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.maintenanceMode
                ? "Disable Maintenance Mode?"
                : "Enable Store Maintenance Mode?"}
            </DialogTitle>
            <DialogDescription>
              {form.maintenanceMode
                ? "This will make your RIOTOUS store immediately accessible to all public visitors."
                : "Visitors will see the broadcast notice below while you make updates."}
            </DialogDescription>
          </DialogHeader>

          {!form.maintenanceMode && (
            <div className="space-y-1.5 py-2">
              <Label htmlFor="maint-msg">Maintenance Broadcast Message</Label>
              <Input
                id="maint-msg"
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                placeholder="We are currently updating the store. Please check back shortly."
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={form.maintenanceMode ? "default" : "destructive"}
              disabled={maintenanceMutation.isPending}
              onClick={() => maintenanceMutation.mutate(!form.maintenanceMode)}
            >
              {maintenanceMutation.isPending
                ? "Updating..."
                : form.maintenanceMode
                  ? "Go Live Now"
                  : "Enable Maintenance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AmazonExportSettings — Standalone component (avoids polluting parent state)
// ─────────────────────────────────────────────────────────────────────────────

const PURPOSES = [
  "Shipment Confirmation",
  "Order Report",
  "Inventory Loader",
  "Return Merchandise",
  "General",
];

function AmazonExportSettings() {
  const qc = useQueryClient();

  const listFn = useServerFn(amazonListTemplates);
  const saveFn = useServerFn(amazonSaveTemplate);
  const updateMappingFn = useServerFn(amazonUpdateMapping);
  const deleteFn = useServerFn(amazonDeleteTemplate);
  const parseFn = useServerFn(amazonParseTemplateHeaders);

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<"idle" | "parsed" | "saving">("idle");
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedFormat, setParsedFormat] = useState("");
  const [parsedFileName, setParsedFileName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("Shipment Confirmation");
  const [parseError, setParseError] = useState("");
  const [localMapping, setLocalMapping] = useState<Record<string, string>>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templatesQ = useQuery({
    queryKey: ["admin", "amazon-templates"],
    queryFn: () => listFn(),
  });

  const templates: AmazonTemplate[] = Array.isArray(templatesQ.data) ? templatesQ.data : [];

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;

  // Sync local mapping when active template changes
  useEffect(() => {
    if (activeTemplate) {
      setLocalMapping({ ...activeTemplate.mapping });
      setMappingDirty(false);
    }
  }, [activeTemplateId, activeTemplate?.id]);

  const saveMutation = useMutation({
    mutationFn: (d: Parameters<typeof saveFn>[0]["data"]) => saveFn({ data: d }),
    onSuccess: () => {
      toast.success("Template saved!");
      qc.invalidateQueries({ queryKey: ["admin", "amazon-templates"] });
      setUploadStep("idle");
      setParsedHeaders([]);
      setNewName("");
      setNewPurpose("Shipment Confirmation");
      setParsedFileName("");
    },
    onError: (e: any) => toast.error(e?.message || "Save failed."),
  });

  const updateMappingMutation = useMutation({
    mutationFn: (d: Parameters<typeof updateMappingFn>[0]["data"]) =>
      updateMappingFn({ data: d }),
    onSuccess: () => {
      toast.success("Mapping saved!");
      setMappingDirty(false);
      qc.invalidateQueries({ queryKey: ["admin", "amazon-templates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { templateId: id } }),
    onSuccess: () => {
      toast.success("Template deleted.");
      setActiveTemplateId(null);
      qc.invalidateQueries({ queryKey: ["admin", "amazon-templates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed."),
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError("");
      setUploadStep("idle");
      setParsedHeaders([]);
      setNewName(file.name.replace(/\.[^.]+$/, ""));

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = (ev.target?.result as string).split(",")[1];
          const result = await parseFn({ data: { base64, fileName: file.name } });
          setParsedHeaders(result.headers);
          setParsedFormat(result.detectedFormat);
          setParsedFileName(file.name);
          setUploadStep("parsed");
        } catch (err: any) {
          setParseError(err?.message || "Failed to parse file.");
        }
      };
      reader.readAsDataURL(file);
    },
    [parseFn],
  );

  const handleSaveTemplate = () => {
    if (!newName.trim()) return toast.error("Please enter a template name.");
    if (parsedHeaders.length === 0) return toast.error("No headers detected.");
    saveMutation.mutate({
      name: newName,
      purpose: newPurpose,
      fileName: parsedFileName,
      fileFormat: parsedFormat,
      headers: parsedHeaders,
      mapping: {},
    });
  };

  const handleMappingChange = (amazonCol: string, riotousKey: string) => {
    setLocalMapping((prev) => ({ ...prev, [amazonCol]: riotousKey }));
    setMappingDirty(true);
  };

  const handleSaveMapping = () => {
    if (!activeTemplateId) return;
    updateMappingMutation.mutate({
      templateId: activeTemplateId,
      mapping: localMapping,
    });
  };

  const riotousOptions = Object.entries(RIOTOUS_FIELD_KEYS);

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-red" /> Amazon Export Templates
          </CardTitle>
          <CardDescription>
            Upload any Amazon spreadsheet template to detect its column structure. Then map
            each Amazon column to the corresponding RIOTOUS order field. At export time,
            RIOTOUS generates a file that exactly matches your Amazon template structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Upload new template */}
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Upload className="h-4 w-4 text-brand-red" /> Upload Amazon Template
            </div>
            <p className="text-xs text-muted-foreground">
              Upload the actual Amazon template file (.xlsx, .xls, .csv, or tab-delimited .txt).
              RIOTOUS will detect all column headers from the first row.
              Your template's column names are treated as the source of truth — nothing is hardcoded.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Choose Template File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              {parsedFileName && (
                <span className="text-xs text-muted-foreground">{parsedFileName}</span>
              )}
            </div>
            {parseError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {parseError}
              </div>
            )}

            {uploadStep === "parsed" && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {parsedHeaders.length} columns detected
                  </span>
                  <span className="text-xs text-muted-foreground">({parsedFormat.toUpperCase()})</span>
                </div>

                {/* Preview headers */}
                <div className="flex flex-wrap gap-1.5">
                  {parsedHeaders.map((h) => (
                    <span
                      key={h}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="tmpl-name">Template Name</Label>
                    <Input
                      id="tmpl-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Amazon Shipment Confirmation"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tmpl-purpose">Purpose / Type</Label>
                    <select
                      id="tmpl-purpose"
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={newPurpose}
                      onChange={(e) => setNewPurpose(e.target.value)}
                    >
                      {PURPOSES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-brand-red text-white hover:bg-brand-red/90"
                  disabled={saveMutation.isPending}
                  onClick={handleSaveTemplate}
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  {saveMutation.isPending ? "Saving…" : "Save Template"}
                </Button>
              </div>
            )}
          </div>

          {/* Saved templates */}
          {templatesQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No templates saved yet. Upload an Amazon template above to get started.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Saved Templates ({templates.length})</p>
              {templates.map((tmpl) => {
                const isExpanded = expandedTemplateId === tmpl.id;
                const isActive = activeTemplateId === tmpl.id;
                const mappedCount = Object.values(tmpl.mapping).filter(Boolean).length;

                return (
                  <div
                    key={tmpl.id}
                    className={`rounded-xl border transition-colors ${
                      isActive ? "border-brand-red/40 bg-brand-red/5" : "border-border bg-card"
                    }`}
                  >
                    {/* Template header row */}
                    <div className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{tmpl.name}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            {tmpl.purpose}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
                            .{tmpl.fileFormat}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {tmpl.headers.length} columns ·{" "}
                          {mappedCount} mapped ·{" "}
                          {tmpl.headers.length - mappedCount} unmapped
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className={isActive ? "bg-brand-red text-white hover:bg-brand-red/90" : ""}
                          onClick={() => {
                            setActiveTemplateId(isActive ? null : tmpl.id);
                            setExpandedTemplateId(isActive ? null : tmpl.id);
                          }}
                        >
                          {isActive ? "Close Mapping" : "Edit Mapping"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete template "${tmpl.name}"?`)) {
                              deleteMutation.mutate(tmpl.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Column mapping editor */}
                    {isActive && isExpanded && (
                      <div className="border-t px-4 pb-4 space-y-4">
                        <div className="pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                            Column Mapping — Amazon Column → RIOTOUS Field
                          </p>
                          <p className="text-xs text-muted-foreground mb-4">
                            For each column in your Amazon template, choose which RIOTOUS data field
                            should populate it. Leave unmapped columns blank in the export.
                            Orders with multiple items will generate one row per item.
                          </p>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground w-1/2">
                                    Amazon Column Header
                                  </th>
                                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground w-1/2">
                                    Maps to RIOTOUS Field
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {tmpl.headers.map((header) => {
                                  const currentVal = localMapping[header] ?? "";
                                  return (
                                    <tr key={header} className="border-b border-border/50">
                                      <td className="py-2 pr-4">
                                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                          {header}
                                        </span>
                                      </td>
                                      <td className="py-1.5">
                                        <select
                                          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                          value={currentVal}
                                          onChange={(e) =>
                                            handleMappingChange(header, e.target.value)
                                          }
                                        >
                                          <option value="">— skip this column —</option>
                                          <optgroup label="Order Fields">
                                            {riotousOptions
                                              .filter(([k]) => k.startsWith("order."))
                                              .map(([k, label]) => (
                                                <option key={k} value={k}>{label}</option>
                                              ))}
                                          </optgroup>
                                          <optgroup label="Item Fields (one row per item)">
                                            {riotousOptions
                                              .filter(([k]) => k.startsWith("item."))
                                              .map(([k, label]) => (
                                                <option key={k} value={k}>{label}</option>
                                              ))}
                                          </optgroup>
                                          <optgroup label="Utility">
                                            {riotousOptions
                                              .filter(([k]) => k.startsWith("computed."))
                                              .map(([k, label]) => (
                                                <option key={k} value={k}>{label}</option>
                                              ))}
                                          </optgroup>
                                        </select>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="pt-3 flex items-center gap-3">
                            <Button
                              size="sm"
                              className="bg-brand-red text-white hover:bg-brand-red/90"
                              disabled={!mappingDirty || updateMappingMutation.isPending}
                              onClick={handleSaveMapping}
                            >
                              <Save className="mr-2 h-3.5 w-3.5" />
                              {updateMappingMutation.isPending ? "Saving…" : "Save Mapping"}
                            </Button>
                            {!mappingDirty && mappedCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCheck className="h-3.5 w-3.5" /> Mapping saved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Info box */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">How Amazon Export works</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
              <li>Upload any Amazon template file — column names are read directly from your file, nothing is hardcoded.</li>
              <li>Map each Amazon column to the matching RIOTOUS field using the dropdowns above.</li>
              <li>Orders with multiple products generate <strong>one row per product</strong> in the output file.</li>
              <li>To export: go to <strong>Admin → Orders</strong> and use the <strong>Export ▾</strong> dropdown.</li>
              <li>The exported file will have the exact same column structure as your uploaded Amazon template.</li>
            </ul>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

