import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  listStaff,
  getStaffDetails,
  createStaff,
  updateStaff,
  changeStaffRole,
  toggleStaffStatus,
  resetStaffPassword,
  getDefaultRolePermissions,
  type StaffItem,
  type StaffRole,
  type StaffStatus,
} from "@/lib/admin-staff.functions";
import { STAFF_MODULES, STAFF_ACTIONS, type StaffModule, type StaffAction } from "@/lib/admin-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  UserCog,
  Search,
  Plus,
  MoreVertical,
  KeyRound,
  History,
  Edit,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  Mail,
  Phone,
  Calendar,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  component: AdminStaffPage,
  head: () => ({
    meta: [
      { title: "Staff Management · RIOTOUS Admin" },
      { name: "description", content: "Manage administrators, managers, and staff accounts." },
    ],
  }),
});

function AdminStaffPage() {
  const qc = useQueryClient();
  const listStaffFn = useServerFn(listStaff);
  const getStaffDetailsFn = useServerFn(getStaffDetails);
  const createStaffFn = useServerFn(createStaff);
  const updateStaffFn = useServerFn(updateStaff);
  const changeRoleFn = useServerFn(changeStaffRole);
  const toggleStatusFn = useServerFn(toggleStaffStatus);
  const resetPasswordFn = useServerFn(resetStaffPassword);

  // Filter and pagination state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);
  const [resetPwdStaff, setResetPwdStaff] = useState<StaffItem | null>(null);
  const [roleChangeStaff, setRoleChangeStaff] = useState<StaffItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<StaffRole>("Staff");
  const [newPassword, setNewPassword] = useState("");

  // Create form state
  const [createForm, setCreateForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: StaffRole;
    status: StaffStatus;
    password: string;
    permissions: Record<string, string[]>;
  }>({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    status: "Active",
    password: "",
    permissions: getDefaultRolePermissions("Staff"),
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    staffId: string;
    name: string;
    phone: string;
    role: StaffRole;
    status: StaffStatus;
    permissions: Record<string, string[]>;
  }>({
    staffId: "",
    name: "",
    phone: "",
    role: "Staff",
    status: "Active",
    permissions: {},
  });

  // Fetch Staff List Query
  const staffQuery = useQuery({
    queryKey: ["admin", "staff", { search, statusFilter, roleFilter, sortBy, sortOrder, page }],
    queryFn: () =>
      listStaffFn({
        data: {
          search,
          status: statusFilter,
          role: roleFilter,
          sortBy,
          sortOrder,
          page,
          limit: 10,
        },
      }),
  });

  // Fetch Selected Staff Details Query
  const staffDetailsQuery = useQuery({
    queryKey: ["admin", "staff-details", viewStaffId],
    queryFn: () => getStaffDetailsFn({ data: { staffId: viewStaffId! } }),
    enabled: Boolean(viewStaffId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) =>
      createStaffFn({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          role: data.role,
          status: data.status,
          initialPassword: data.password || undefined,
          permissions: data.permissions,
        },
      }),
    onSuccess: () => {
      toast.success("Staff member created successfully!");
      setCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        role: "Staff",
        status: "Active",
        password: "",
        permissions: getDefaultRolePermissions("Staff"),
      });
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create staff member.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof editForm) =>
      updateStaffFn({
        data: {
          staffId: data.staffId,
          name: data.name,
          phone: data.phone || null,
          role: data.role,
          status: data.status,
          permissions: data.permissions,
        },
      }),
    onSuccess: () => {
      toast.success("Staff member updated successfully!");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      if (viewStaffId) {
        qc.invalidateQueries({ queryKey: ["admin", "staff-details", viewStaffId] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update staff member.");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ staffId, newRole }: { staffId: string; newRole: StaffRole }) =>
      changeRoleFn({ data: { staffId, newRole } }),
    onSuccess: (_, vars) => {
      toast.success(`Role updated to ${vars.newRole}`);
      setRoleChangeStaff(null);
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to change role.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status: StaffStatus }) =>
      toggleStatusFn({ data: { staffId, status } }),
    onSuccess: (_, vars) => {
      toast.success(`Staff status changed to ${vars.status}`);
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to change status.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ staffId, password }: { staffId: string; password: string }) =>
      resetPasswordFn({ data: { staffId, newPassword: password } }),
    onSuccess: () => {
      toast.success("Password reset successfully!");
      setResetPwdStaff(null);
      setNewPassword("");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reset password.");
    },
  });

  const summary = staffQuery.data?.summary || {
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    administrators: 0,
    managers: 0,
    staffMembers: 0,
  };

  const staffList = staffQuery.data?.items || [];
  const totalPages = staffQuery.data?.totalPages || 1;

  const handleOpenEdit = (staff: StaffItem) => {
    setEditForm({
      staffId: staff.id,
      name: staff.name,
      phone: staff.phone || "",
      role: staff.role as StaffRole,
      status: staff.status,
      permissions: staff.permissions || getDefaultRolePermissions(staff.role as StaffRole),
    });
    setEditOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Super Admin":
        return <Badge className="bg-purple-600 text-white border-purple-500 font-semibold">Super Admin</Badge>;
      case "Admin":
        return <Badge className="bg-red-600 text-white border-red-500 font-semibold">Admin</Badge>;
      case "Manager":
        return <Badge className="bg-blue-600 text-white border-blue-500 font-semibold">Manager</Badge>;
      default:
        return <Badge variant="secondary" className="font-medium">Staff</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/30">Active</Badge>;
      case "Suspended":
        return <Badge className="bg-rose-600/10 text-rose-500 border border-rose-500/30">Suspended</Badge>;
      default:
        return <Badge className="bg-amber-600/10 text-amber-500 border border-amber-500/30">Inactive</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members, assign granular roles, and enforce security policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "staff"] })}
            disabled={staffQuery.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${staffQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-brand-red text-white hover:bg-brand-red/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Staff</span>
              <Users className="h-4 w-4 text-brand-red" />
            </div>
            <div className="text-2xl font-bold">{summary.totalStaff}</div>
            <span className="text-[11px] text-muted-foreground">Registered accounts</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">{summary.activeStaff}</div>
            <span className="text-[11px] text-muted-foreground">Full portal access</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Inactive</span>
              <UserX className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{summary.inactiveStaff}</div>
            <span className="text-[11px] text-muted-foreground">Suspended / offline</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Admins</span>
              <ShieldCheck className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-500">{summary.administrators}</div>
            <span className="text-[11px] text-muted-foreground">Super & Full Admins</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Managers</span>
              <Shield className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500">{summary.managers}</div>
            <span className="text-[11px] text-muted-foreground">Operations lead</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Staff</span>
              <UserCog className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold">{summary.staffMembers}</div>
            <span className="text-[11px] text-muted-foreground">Support & fulfillment</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, email, phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Staff Name</option>
                <option value="email">Email Address</option>
                <option value="role">Role</option>
                <option value="status">Status</option>
                <option value="last_login">Last Login</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-9 px-2.5 text-xs"
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-red" />
                    Loading staff directory...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No staff members match your filter criteria.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red/10 text-brand-red font-bold text-xs uppercase border border-brand-red/20">
                          {staff.name[0] || "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {staff.name}
                            {staff.email === "princevekariya9898@gmail.com" && (
                              <span title="Primary Store Owner" className="text-[10px] bg-purple-500/20 text-purple-400 px-1 rounded">Owner</span>
                            )}
                          </div>
                          {staff.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {staff.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                      {staff.email}
                    </td>
                    <td className="px-4 py-3.5">
                      {getRoleBadge(staff.role)}
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(staff.status)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {staff.lastLoginAt ? (
                        <span title={new Date(staff.lastLoginAt).toLocaleString()}>
                          {new Date(staff.lastLoginAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="italic opacity-60">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Staff Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setViewStaffId(staff.id)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(staff)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRoleChangeStaff(staff);
                              setSelectedRole(staff.role as StaffRole);
                            }}
                            className="cursor-pointer"
                          >
                            <Shield className="mr-2 h-4 w-4" /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setResetPwdStaff(staff)}
                            className="cursor-pointer"
                          >
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {staff.status === "Active" ? (
                            <DropdownMenuItem
                              onClick={() => toggleStatusMutation.mutate({ staffId: staff.id, status: "Inactive" })}
                              className="cursor-pointer text-amber-500 focus:text-amber-500"
                              disabled={staff.email === "princevekariya9898@gmail.com"}
                            >
                              <UserX className="mr-2 h-4 w-4" /> Deactivate Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => toggleStatusMutation.mutate({ staffId: staff.id, status: "Active" })}
                              className="cursor-pointer text-emerald-500 focus:text-emerald-500"
                            >
                              <UserCheck className="mr-2 h-4 w-4" /> Activate Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => toggleStatusMutation.mutate({ staffId: staff.id, status: "Suspended" })}
                            className="cursor-pointer text-destructive focus:text-destructive"
                            disabled={staff.email === "princevekariya9898@gmail.com" || staff.status === "Suspended"}
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" /> Suspend Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{staffList.length}</span> of{" "}
            <span className="font-semibold text-foreground">{staffQuery.data?.total || 0}</span> staff members
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* CREATE STAFF MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>
              Create a new administrative or staff account with dedicated permissions.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(createForm);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="staff@riotous.store"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Initial Password *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <select
                  value={createForm.role}
                  onChange={(e) => {
                    const role = e.target.value as StaffRole;
                    setCreateForm({
                      ...createForm,
                      role,
                      permissions: getDefaultRolePermissions(role),
                    });
                  }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Staff">Staff (Operations & Order updates)</option>
                  <option value="Manager">Manager (Catalog, Orders, Inventory, Returns)</option>
                  <option value="Admin">Admin (Full Store Administration)</option>
                  <option value="Super Admin">Super Admin (Unrestricted System Access)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as StaffStatus })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Active">Active (Immediate Login Enabled)</option>
                  <option value="Inactive">Inactive (Login Disabled)</option>
                </select>
              </div>
            </div>

            {/* Granular Permissions Editor */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">Role & Permissions Matrix</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      permissions: getDefaultRolePermissions(createForm.role),
                    })
                  }
                >
                  Reset to Role Defaults
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Fine-tune module access or keep the default role permissions matrix.
              </p>

              <div className="max-h-52 overflow-y-auto border rounded-md p-3 space-y-3 bg-muted/20">
                {STAFF_MODULES.map((mod) => {
                  const currentModPerms = createForm.permissions[mod] || [];
                  return (
                    <div key={mod} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium capitalize w-28 text-foreground">{mod}</span>
                      <div className="flex flex-wrap gap-3">
                        {STAFF_ACTIONS.map((act) => {
                          const isChecked = currentModPerms.includes(act) || currentModPerms.includes("manage");
                          return (
                            <label key={act} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const updated = { ...createForm.permissions };
                                  let list = updated[mod] ? [...updated[mod]] : [];
                                  if (e.target.checked) {
                                    if (!list.includes(act)) list.push(act);
                                  } else {
                                    list = list.filter((x) => x !== act && x !== "manage");
                                  }
                                  updated[mod] = list;
                                  setCreateForm({ ...createForm, permissions: updated });
                                }}
                                className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-3.5 w-3.5"
                              />
                              <span className="capitalize text-muted-foreground">{act}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-brand-red text-white hover:bg-brand-red/90"
              >
                {createMutation.isPending ? "Creating..." : "Create Staff Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT STAFF MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff profile information, role assignment, and access privileges.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(editForm);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <select
                  value={editForm.role}
                  onChange={(e) => {
                    const role = e.target.value as StaffRole;
                    setEditForm({
                      ...editForm,
                      role,
                      permissions: getDefaultRolePermissions(role),
                    });
                  }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StaffStatus })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Granular Permissions Matrix */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">Role & Permissions Matrix</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() =>
                    setEditForm({
                      ...editForm,
                      permissions: getDefaultRolePermissions(editForm.role),
                    })
                  }
                >
                  Reset to Role Defaults
                </Button>
              </div>

              <div className="max-h-52 overflow-y-auto border rounded-md p-3 space-y-3 bg-muted/20">
                {STAFF_MODULES.map((mod) => {
                  const currentModPerms = editForm.permissions[mod] || [];
                  return (
                    <div key={mod} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium capitalize w-28 text-foreground">{mod}</span>
                      <div className="flex flex-wrap gap-3">
                        {STAFF_ACTIONS.map((act) => {
                          const isChecked = currentModPerms.includes(act) || currentModPerms.includes("manage");
                          return (
                            <label key={act} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const updated = { ...editForm.permissions };
                                  let list = updated[mod] ? [...updated[mod]] : [];
                                  if (e.target.checked) {
                                    if (!list.includes(act)) list.push(act);
                                  } else {
                                    list = list.filter((x) => x !== act && x !== "manage");
                                  }
                                  updated[mod] = list;
                                  setEditForm({ ...editForm, permissions: updated });
                                }}
                                className="rounded border-zinc-700 text-brand-red focus:ring-brand-red h-3.5 w-3.5"
                              />
                              <span className="capitalize text-muted-foreground">{act}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-brand-red text-white hover:bg-brand-red/90"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS SHEET */}
      <Sheet open={Boolean(viewStaffId)} onOpenChange={(open) => !open && setViewStaffId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Staff Account Details</SheetTitle>
            <SheetDescription>
              Comprehensive profile information, access scopes, and audit trail.
            </SheetDescription>
          </SheetHeader>

          {staffDetailsQuery.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-red" />
              Loading profile details...
            </div>
          ) : staffDetailsQuery.data ? (
            <div className="space-y-6 py-4">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red text-white font-bold text-lg">
                  {staffDetailsQuery.data.staff.name[0]}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base leading-none">{staffDetailsQuery.data.staff.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{staffDetailsQuery.data.staff.email}</p>
                  <div className="flex items-center gap-2 pt-1">
                    {getRoleBadge(staffDetailsQuery.data.staff.role)}
                    {getStatusBadge(staffDetailsQuery.data.staff.status)}
                  </div>
                </div>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-md border bg-card">
                  <span className="text-muted-foreground block mb-1">Phone</span>
                  <span className="font-medium">{staffDetailsQuery.data.staff.phone || "Not provided"}</span>
                </div>
                <div className="p-3 rounded-md border bg-card">
                  <span className="text-muted-foreground block mb-1">Created By</span>
                  <span className="font-medium">{staffDetailsQuery.data.staff.createdBy || "System"}</span>
                </div>
                <div className="p-3 rounded-md border bg-card">
                  <span className="text-muted-foreground block mb-1">Last Login</span>
                  <span className="font-medium">
                    {staffDetailsQuery.data.staff.lastLoginAt
                      ? new Date(staffDetailsQuery.data.staff.lastLoginAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="p-3 rounded-md border bg-card">
                  <span className="text-muted-foreground block mb-1">Account Created</span>
                  <span className="font-medium">
                    {new Date(staffDetailsQuery.data.staff.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Permissions Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Granted Module Permissions
                </h4>
                <div className="border rounded-md divide-y divide-border text-xs">
                  {Object.entries(staffDetailsQuery.data.staff.permissions).map(([mod, perms]) => (
                    <div key={mod} className="p-2.5 flex items-center justify-between">
                      <span className="font-medium capitalize">{mod}</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {(perms as string[]).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] uppercase font-mono">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audit Log Activity */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Recent Activity Trail
                </h4>
                {staffDetailsQuery.data.recentActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 border rounded-md italic">
                    No recent administrative actions recorded for this user.
                  </p>
                ) : (
                  <div className="border rounded-md divide-y divide-border text-xs max-h-56 overflow-y-auto">
                    {staffDetailsQuery.data.recentActivity.map((act) => (
                      <div key={act.id} className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span>{act.action}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="capitalize">{act.module}</span>
                          {act.targetName && <span>• {act.targetName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleOpenEdit(staffDetailsQuery.data!.staff as StaffItem);
                    setViewStaffId(null);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile & Role
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={Boolean(resetPwdStaff)} onOpenChange={(open) => !open && setResetPwdStaff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Staff Password</DialogTitle>
            <DialogDescription>
              Set a new temporary or permanent password for {resetPwdStaff?.name} ({resetPwdStaff?.email}).
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (resetPwdStaff) {
                resetPasswordMutation.mutate({ staffId: resetPwdStaff.id, password: newPassword });
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">New Password *</Label>
              <Input
                id="new-pwd"
                type="password"
                required
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPwdStaff(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                className="bg-brand-red text-white hover:bg-brand-red/90"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHANGE ROLE DIALOG */}
      <Dialog open={Boolean(roleChangeStaff)} onOpenChange={(open) => !open && setRoleChangeStaff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Staff Role</DialogTitle>
            <DialogDescription>
              Modify role and apply default permission presets for {roleChangeStaff?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select New Role</Label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as StaffRole)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Staff">Staff (Order & Return processing)</option>
                <option value="Manager">Manager (Catalog, Orders, Inventory, Returns)</option>
                <option value="Admin">Admin (Store & Customer administration)</option>
                <option value="Super Admin">Super Admin (Unrestricted System Access)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRoleChangeStaff(null)}>
              Cancel
            </Button>
            <Button
              disabled={changeRoleMutation.isPending || selectedRole === roleChangeStaff?.role}
              onClick={() => {
                if (roleChangeStaff) {
                  changeRoleMutation.mutate({ staffId: roleChangeStaff.id, newRole: selectedRole });
                }
              }}
              className="bg-brand-red text-white hover:bg-brand-red/90"
            >
              {changeRoleMutation.isPending ? "Updating..." : "Confirm Role Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
