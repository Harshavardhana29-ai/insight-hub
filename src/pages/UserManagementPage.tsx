import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, Filter, Trash2, Pencil, Users, Shield,
  ShieldCheck, UserCog, X, Loader2, ChevronDown,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  useUsers, useAdmins, useCreateUser, useUpdateUser, useDeleteUser,
} from "@/hooks/use-users";
import { useAuth } from "@/contexts/AuthContext";
import type { UserResponse, UserCreatePayload, UserUpdatePayload } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { boschBlue, boschGreen, boschPurple, boschGray, boschRed } from "@/lib/bosch-colors";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  super_admin: { label: "Super Admin", color: boschPurple[50], bg: boschPurple[95], icon: ShieldCheck },
  admin: { label: "Admin", color: boschBlue[50], bg: boschBlue[95], icon: Shield },
  assistant: { label: "Assistant", color: boschGreen[50], bg: boschGreen[95], icon: UserCog },
  user: { label: "Unassigned", color: boschGray[50], bg: boschGray[95], icon: Users },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const { toast } = useToast();

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";

  const { data: usersData, isLoading } = useUsers({
    search: searchQuery || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const deleteMutation = useDeleteUser();
  const users = usersData?.items ?? [];

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      toast({ title: "Cannot delete yourself", variant: "destructive" });
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "User removed" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to delete", variant: "destructive" });
    }
  };

  const statCounts = {
    total: usersData?.total ?? 0,
    admins: users.filter(u => u.role === "admin").length,
    assistants: users.filter(u => u.role === "assistant").length,
    unassigned: users.filter(u => u.role === "user").length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search users by name or NTID…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="assistant">Assistant</option>
                <option value="user">Unassigned</option>
              </select>
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            style={{ backgroundColor: boschBlue[50] }}
          >
            <Plus className="w-4 h-4" />
            {isSuperAdmin ? "Add User" : "Add Assistant"}
          </button>
        </div>

        {/* Stats */}
        {isSuperAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: statCounts.total, color: boschBlue[50], bg: boschBlue[95], icon: Users },
              { label: "Admins", value: statCounts.admins, color: boschBlue[50], bg: boschBlue[95], icon: Shield },
              { label: "Assistants", value: statCounts.assistants, color: boschGreen[50], bg: boschGreen[95], icon: UserCog },
              { label: "Unassigned", value: statCounts.unassigned, color: boschGray[50], bg: boschGray[95], icon: Users },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                className="bg-card border border-border rounded-md p-4 border-l-4"
                style={{ borderLeftColor: stat.color }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: stat.bg, color: stat.color }}
                  >
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground leading-tight">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: boschBlue[50] }}>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3.5 uppercase tracking-wide">User</th>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3.5 uppercase tracking-wide">NTID</th>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3.5 uppercase tracking-wide">Role</th>
                  {isSuperAdmin && (
                    <th className="text-left text-xs font-semibold text-white px-5 py-3.5 uppercase tracking-wide">Assigned To</th>
                  )}
                  <th className="text-left text-xs font-semibold text-white px-5 py-3.5 uppercase tracking-wide">Status</th>
                  <th className="text-right text-xs font-semibold text-white px-5 py-3.5 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-5 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading users…</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-5 py-12 text-center">
                      <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No users found</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: ROLE_CONFIG[u.role]?.color || boschGray[50] }}
                          >
                            {u.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">{u.display_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{u.ntid || "—"}</td>
                      <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                      {isSuperAdmin && (
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {u.role === "assistant" && u.admin_id
                            ? users.find(a => a.id === u.admin_id)?.display_name || "—"
                            : "—"}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: u.is_active ? boschGreen[95] : boschRed[95],
                            color: u.is_active ? boschGreen[50] : boschRed[50],
                          }}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                                style={{ ["--tw-ring-color" as any]: boschBlue[50] }}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  disabled={deleteMutation.isPending}
                                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {usersData && (
            <Pagination
              page={page}
              totalPages={Math.ceil(usersData.total / PAGE_SIZE) || 1}
              total={usersData.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isSuperAdmin ? "Add User" : "Add Assistant"}</DialogTitle>
          </DialogHeader>
          <CreateUserForm
            isSuperAdmin={!!isSuperAdmin}
            onClose={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <EditUserForm
              user={editingUser}
              isSuperAdmin={!!isSuperAdmin}
              onClose={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


function CreateUserForm({ isSuperAdmin, onClose }: { isSuperAdmin: boolean; onClose: () => void }) {
  const [ntid, setNtid] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "assistant">(isSuperAdmin ? "admin" : "assistant");
  const [adminId, setAdminId] = useState<string>("");
  const { toast } = useToast();

  const createMutation = useCreateUser();
  const { data: admins } = useAdmins();

  const handleSubmit = async () => {
    if (!ntid.trim() || !displayName.trim()) {
      toast({ title: "NTID and Display Name are required", variant: "destructive" });
      return;
    }

    const payload: UserCreatePayload = {
      ntid: ntid.trim().toLowerCase(),
      display_name: displayName.trim(),
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      role,
      admin_id: role === "assistant" && adminId ? adminId : undefined,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast({ title: `User created successfully` });
      onClose();
    } catch (err: any) {
      toast({ title: err.message || "Failed to create user", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div>
        <label className="text-sm font-medium text-foreground">NTID</label>
        <input
          type="text"
          value={ntid}
          onChange={(e) => setNtid(e.target.value)}
          placeholder="e.g. ahc7kor"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring font-mono"
        />
        <p className="text-[11px] text-muted-foreground mt-1">Bosch NT-ID of the user (case-insensitive)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">First Name</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Last Name</label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Full name"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {isSuperAdmin && (
        <div>
          <label className="text-sm font-medium text-foreground">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "assistant")}
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="admin">Admin</option>
            <option value="assistant">Assistant</option>
          </select>
        </div>
      )}
      {role === "assistant" && isSuperAdmin && (
        <div>
          <label className="text-sm font-medium text-foreground">Assign to Admin</label>
          <select
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select an admin…</option>
            {(admins ?? []).map(a => (
              <option key={a.id} value={a.id}>{a.display_name} ({a.ntid || a.email})</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="px-5 py-2.5 text-sm rounded-xl text-white hover:opacity-90 transition-all font-semibold shadow-sm disabled:opacity-50"
          style={{ backgroundColor: boschBlue[50] }}
        >
          {createMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating…</span>
          ) : isSuperAdmin ? "Create User" : "Add Assistant"}
        </button>
      </div>
    </div>
  );
}


function EditUserForm({ user, isSuperAdmin, onClose }: { user: UserResponse; isSuperAdmin: boolean; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [role, setRole] = useState(user.role);
  const [adminId, setAdminId] = useState(user.admin_id || "");
  const [isActive, setIsActive] = useState(user.is_active);
  const { toast } = useToast();

  const updateMutation = useUpdateUser();
  const { data: admins } = useAdmins();

  const handleSubmit = async () => {
    const payload: UserUpdatePayload = {
      display_name: displayName.trim(),
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
    };

    if (isSuperAdmin) {
      payload.role = role;
      payload.is_active = isActive;
      payload.admin_id = role === "assistant" && adminId ? adminId : null;
    }

    try {
      await updateMutation.mutateAsync({ id: user.id, data: payload });
      toast({ title: "User updated" });
      onClose();
    } catch (err: any) {
      toast({ title: err.message || "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">First Name</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Last Name</label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Display Name</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      {isSuperAdmin && (
        <>
          <div>
            <label className="text-sm font-medium text-foreground">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="assistant">Assistant</option>
              <option value="user">Unassigned</option>
            </select>
          </div>
          {role === "assistant" && (
            <div>
              <label className="text-sm font-medium text-foreground">Assign to Admin</label>
              <select value={adminId} onChange={(e) => setAdminId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select an admin…</option>
                {(admins ?? []).map(a => (
                  <option key={a.id} value={a.id}>{a.display_name} ({a.ntid || a.email})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">Active</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? "" : "bg-muted"}`}
              style={{ backgroundColor: isActive ? boschGreen[50] : undefined }}
            >
              <span className={`absolute top-0.5 ${isActive ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full shadow transition-all`} />
            </button>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="px-5 py-2.5 text-sm rounded-xl text-white hover:opacity-90 transition-all font-semibold shadow-sm disabled:opacity-50"
          style={{ backgroundColor: boschBlue[50] }}
        >
          {updateMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
          ) : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
