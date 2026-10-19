import { useState } from "react";
import {
  ShieldCheck,
  Users,
  UserCheck,
  Briefcase,
  Megaphone,
  UserX,
  Server,
  Database,
  History,
  Search,
  Filter,
  UserPlus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import api, { parseError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  useApi,
  Spinner,
  ErrorState,
  StatCard,
  Alert,
  Field,
} from "../components/ui";
import { ROLE_LABEL, ROLE_BADGE_STYLE, num, shortDate } from "../utils/format";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [msg, setMsg] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "creator",
    bio: "",
  });
  const [createBusy, setCreateBusy] = useState(false);

  const overview = useApi("/api/admin/overview");
  const usersApi = useApi("/api/admin/users", {
    search: search || undefined,
    role: roleFilter || undefined,
    is_active: statusFilter === "" ? undefined : statusFilter === "true",
  });
  const systemApi = useApi("/api/admin/system");

  const reloadAll = () => {
    overview.reload();
    usersApi.reload();
    systemApi.reload();
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === user.id) {
      setMsg({ kind: "error", text: "Administrators cannot change their own role." });
      return;
    }
    setMsg(null);
    try {
      await api.patch(`/api/admin/users/${targetUser.id}`, { role: newRole });
      setMsg({ kind: "success", text: `Updated role for ${targetUser.email} to ${ROLE_LABEL[newRole]}.` });
      reloadAll();
    } catch (e) {
      setMsg({ kind: "error", text: parseError(e).message });
    }
  };

  const handleStatusToggle = async (targetUser) => {
    if (targetUser.id === user.id) {
      setMsg({ kind: "error", text: "Administrators cannot deactivate their own account." });
      return;
    }
    setMsg(null);
    try {
      await api.patch(`/api/admin/users/${targetUser.id}`, { is_active: !targetUser.is_active });
      setMsg({
        kind: "success",
        text: `Account for ${targetUser.email} is now ${!targetUser.is_active ? "Active" : "Deactivated"}.`,
      });
      reloadAll();
    } catch (e) {
      setMsg({ kind: "error", text: parseError(e).message });
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      setMsg({ kind: "error", text: "Administrators cannot delete their own account." });
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user "${targetUser.full_name}" (${targetUser.email})?`)) {
      return;
    }
    setMsg(null);
    try {
      await api.delete(`/api/admin/users/${targetUser.id}`);
      setMsg({ kind: "success", text: `User ${targetUser.email} deleted.` });
      reloadAll();
    } catch (e) {
      setMsg({ kind: "error", text: parseError(e).message });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.full_name || !createForm.email || !createForm.password) return;
    setCreateBusy(true);
    try {
      await api.post("/api/admin/users", createForm);
      setMsg({ kind: "success", text: `Created new user ${createForm.email} as ${ROLE_LABEL[createForm.role]}.` });
      setShowCreateModal(false);
      setCreateForm({ full_name: "", email: "", password: "", role: "creator", bio: "" });
      reloadAll();
    } catch (err) {
      setMsg({ kind: "error", text: parseError(err).message });
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Administrator Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-900/30 bg-gradient-to-r from-ink-950 via-amber-950/70 to-ink-950 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Platform Governance Console
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                System Healthy
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              Administrator Console 🛡️
            </h1>
            <p className="mt-1 max-w-xl text-sm text-amber-200/80">
              Manage user accounts, assign roles, inspect audit trails, and oversee system data and performance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 font-display text-sm font-bold text-ink-950 shadow-md transition hover:bg-signal-dark hover:text-white"
            >
              <UserPlus className="h-4 w-4" /> Provision User
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <Alert kind={msg.kind} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      {overview.loading && !overview.data ? (
        <Spinner label="Loading Administrator metrics..." />
      ) : overview.error ? (
        <ErrorState message={overview.error} onRetry={reloadAll} />
      ) : (
        <>
          {/* User Account Breakdown Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              label="Total Users"
              value={num(overview.data?.cards?.total_users)}
              icon={Users}
              hint="Registered accounts"
            />
            <StatCard
              label="Creators"
              value={num(overview.data?.cards?.creator_users)}
              icon={UserCheck}
              hint="Content creators"
            />
            <StatCard
              label="Agencies"
              value={num(overview.data?.cards?.agency_users)}
              icon={Briefcase}
              hint="Talent managers"
            />
            <StatCard
              label="Marketing"
              value={num(overview.data?.cards?.marketing_users)}
              icon={Megaphone}
              hint="Brand teams"
            />
            <StatCard
              label="Admins"
              value={num(overview.data?.cards?.admin_users)}
              icon={ShieldCheck}
              hint="System administrators"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Active Accounts"
              value={num(overview.data?.cards?.active_users)}
              icon={CheckCircle2}
              hint="Authorized access"
            />
            <StatCard
              label="Inactive Accounts"
              value={num(overview.data?.cards?.inactive_users)}
              icon={UserX}
              hint="Deactivated accounts"
            />
            <StatCard
              label="Total Content Records"
              value={num(overview.data?.cards?.total_content)}
              icon={Database}
              hint="Stored in database"
            />
            <StatCard
              label="Campaign Records"
              value={num(overview.data?.cards?.total_campaigns)}
              icon={Server}
              hint="Across all roles"
            />
          </div>

          {/* User Management Section */}
          <div id="users" className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-950">User Account Management</h2>
                <p className="text-xs text-ink-500">
                  Search, filter, update roles, or manage active status with backend enforcement
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    className="input pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  aria-label="Filter by role"
                  className="input w-auto"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="creator">Creator</option>
                  <option value="agency">Agency</option>
                  <option value="marketing">Marketing Team</option>
                  <option value="admin">Administrator</option>
                </select>

                <select
                  aria-label="Filter by status"
                  className="input w-auto"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {usersApi.loading && !usersApi.data ? (
              <Spinner label="Loading users..." />
            ) : usersApi.error ? (
              <ErrorState message={usersApi.error} onRetry={usersApi.reload} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs font-semibold uppercase text-ink-400">
                      <th className="py-3 pr-3">User</th>
                      <th className="pr-3">Email</th>
                      <th className="pr-3">Role</th>
                      <th className="pr-3 text-center">Status</th>
                      <th className="pr-3">Registered</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {(usersApi.data || []).map((u) => {
                      const isSelf = u.id === user.id;
                      return (
                        <tr key={u.id} className="transition hover:bg-ink-50/60">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 font-display text-xs font-bold text-ink-800">
                                {u.full_name.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <span className="font-bold text-ink-950">{u.full_name}</span>
                                {isSelf && (
                                  <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="pr-3 text-ink-600 font-mono text-xs">{u.email}</td>
                          <td className="pr-3">
                            <select
                              aria-label={`Role for ${u.email}`}
                              className="input w-auto py-1 text-xs font-semibold"
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                            >
                              <option value="creator">Creator</option>
                              <option value="agency">Agency</option>
                              <option value="marketing">Marketing Team</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>
                          <td className="pr-3 text-center">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleStatusToggle(u)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                                u.is_active
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-coral/10 text-coral hover:bg-coral/20"
                              } ${isSelf ? "opacity-70 cursor-not-allowed" : ""}`}
                              title={isSelf ? "Cannot deactivate yourself" : "Click to toggle status"}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-600" : "bg-coral"}`} />
                              {u.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="pr-3 text-xs text-ink-400">{shortDate(u.created_at)}</td>
                          <td className="text-right">
                            <button
                              disabled={isSelf}
                              onClick={() => handleDeleteUser(u)}
                              className={`p-1.5 transition ${
                                isSelf ? "cursor-not-allowed opacity-30 text-ink-300" : "text-ink-400 hover:text-coral"
                              }`}
                              title={isSelf ? "Cannot delete own admin account" : "Delete user"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System Diagnostics & Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Overview Panel */}
            <div id="system" className="card space-y-3">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                <h2 className="font-display text-base font-bold text-ink-950">System Diagnostics</h2>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  Operational
                </span>
              </div>

              {systemApi.data ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between rounded-lg border border-ink-100 p-2.5">
                    <span className="text-ink-500">Database Engine:</span>
                    <span className="font-bold text-ink-900 uppercase">{systemApi.data.database?.dialect}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border border-ink-100 p-2.5">
                    <span className="text-ink-500">Database Location:</span>
                    <span className="font-mono text-ink-900">{systemApi.data.database?.url}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {Object.entries(systemApi.data.tables || {}).map(([tbl, count]) => (
                      <div key={tbl} className="rounded-lg bg-ink-50 p-2.5">
                        <span className="text-[11px] text-ink-400 uppercase">{tbl}</span>
                        <p className="font-display text-base font-extrabold text-ink-950">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-500">Checking system diagnostics...</p>
              )}
            </div>

            {/* Audit & Activities Feed */}
            <div id="activities" className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-ink-950">System Audit Trail</h2>
                <span className="text-xs text-ink-400">Live platform activities</span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {(!overview.data?.recent_activities || overview.data.recent_activities.length === 0) ? (
                  <p className="text-xs text-ink-500">No activity recorded yet.</p>
                ) : (
                  (overview.data.recent_activities || []).map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-ink-50 p-2 text-xs">
                      <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-amber-100 text-amber-800">
                        <History className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-900">{a.detail || a.action}</p>
                        <p className="text-[10px] text-ink-400">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <h2 className="font-display text-lg font-bold text-ink-950">Provision New User</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-400 hover:text-ink-950"
              >
                ✕
              </button>
            </div>

            <Field label="Full Name">
              <input
                className="input"
                required
                placeholder="e.g. John Doe"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                className="input"
                required
                placeholder="e.g. user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </Field>

            <Field label="Role">
              <select
                className="input"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                <option value="creator">Creator</option>
                <option value="agency">Agency</option>
                <option value="marketing">Marketing Team</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>

            <Field label="Initial Password (min 8 chars, 1 letter, 1 number)">
              <input
                type="password"
                className="input"
                required
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" disabled={createBusy}>
                {createBusy ? "Creating..." : "Provision User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
