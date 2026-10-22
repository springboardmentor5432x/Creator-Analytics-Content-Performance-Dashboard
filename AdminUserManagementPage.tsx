import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Users, 
  Search, 
  UserPlus, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Edit2, 
  Key, 
  FileText, 
  Lock, 
  Eye, 
  ShieldAlert, 
  Check, 
  X,
  Palette,
  Building,
  Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/api';
import { User, UserRole, UserStatus, AdminStats, AuditLog } from '../../types/auth';

interface AdminUserManagementPageProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigate: (page: string) => void;
}

export const AdminUserManagementPage: React.FC<AdminUserManagementPageProps> = ({ 
  onShowToast, 
  onNavigate 
}) => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit' | 'settings'>('users');

  const [showAddModal, setShowAddModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<UserRole[]>(['creator']);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    sessionTimeoutMinutes: 1440,
    allowPublicRegistration: true,
    requireTwoFactor: false,
    maintenanceMode: false
  });

  // New user form state
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: 'DefaultPass123!',
    role: 'creator' as UserRole,
    status: 'active' as UserStatus
  });

  const fetchUsersAndStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminService.getUsers(selectedRole, selectedStatus, searchQuery),
        adminService.getStats()
      ]);

      if (usersRes.users) {
        setUsers(usersRes.users);
      }
      if (statsRes.stats) {
        setStats(statsRes.stats);
        setAuditLogs(statsRes.audit_logs || []);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to fetch user directory', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRole, selectedStatus, searchQuery, onShowToast]);

  useEffect(() => {
    fetchUsersAndStats();
  }, [fetchUsersAndStats]);

  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      onShowToast('Name and email are required.', 'error');
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await adminService.createUser(newUserForm);
      if (res.success) {
        onShowToast(`User ${newUserForm.name} created successfully!`, 'success');
        setShowAddModal(false);
        setNewUserForm({
          name: '',
          email: '',
          password: 'DefaultPass123!',
          role: 'creator',
          status: 'active'
        });
        fetchUsersAndStats();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEditModal = (targetUser: User) => {
    setUserToEdit(targetUser);
    const roles = (targetUser.roles && targetUser.roles.length) 
      ? targetUser.roles.slice(0, 2) 
      : [targetUser.role];
    setEditingRoles(roles);
  };

  // Handle update user role, roles or status
  const handleUpdateUser = async (userId: number | string, updates: { role?: UserRole; roles?: UserRole[]; status?: UserStatus; name?: string }) => {
    setIsActionLoading(true);
    try {
      const res = await adminService.updateUser(userId, updates);
      if (res.success) {
        onShowToast(`User permissions updated successfully!`, 'success');
        setUserToEdit(null);
        fetchUsersAndStats();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Update failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsActionLoading(true);
    try {
      const res = await adminService.deleteUser(userToDelete.id);
      if (res.success) {
        onShowToast(`User ${userToDelete.name} has been deleted.`, 'success');
        setUserToDelete(null);
        fetchUsersAndStats();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Deletion failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Quick toggle status (active <=> suspended)
  const handleToggleStatus = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      onShowToast('You cannot suspend your own administrative account.', 'error');
      return;
    }
    const newStatus: UserStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    handleUpdateUser(targetUser.id, { status: newStatus });
  };

  // Handle Admin Password Reset for any user
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword) return;
    setIsActionLoading(true);
    try {
      const res = await adminService.resetUserPassword(userToResetPassword.id, newResetPassword.trim() || undefined);
      if (res.success) {
        onShowToast(`Password reset successfully for ${userToResetPassword.name}!`, 'success');
        setUserToResetPassword(null);
        setNewResetPassword('');
        fetchUsersAndStats();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Password reset failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<typeof platformSettings>) => {
    try {
      const res = await adminService.updateSettings(updates);
      if (res.success) {
        setPlatformSettings(res.settings);
        onShowToast('Platform settings saved successfully!', 'success');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Settings update failed', 'error');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Administrator</span>;
      case 'creator':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Creator</span>;
      case 'agency':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">Agency</span>;
      case 'marketing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Marketing Team</span>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Active</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Suspended</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Add User Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
              Module 1: User Management
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Administrator User Management Portal
          </h1>
          <p className="text-xs text-slate-500">
            RBAC authorization, account lifecycle control, JWT identity governance &amp; audit logging
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchUsersAndStats}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh user directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats?.total_users ?? users.length}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Live in DB</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Creators</div>
          <div className="text-xl font-black text-blue-600 mt-1">{stats?.roles.creator ?? users.filter(u => u.role === 'creator').length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Media kits active</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Agencies</div>
          <div className="text-xl font-black text-indigo-600 mt-1">{stats?.roles.agency ?? users.filter(u => u.role === 'agency').length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Rosters enabled</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Marketing</div>
          <div className="text-xl font-black text-sky-600 mt-1">{stats?.roles.marketing ?? users.filter(u => u.role === 'marketing').length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Brands &amp; buyers</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admins</div>
          <div className="text-xl font-black text-purple-600 mt-1">{stats?.roles.admin ?? users.filter(u => u.role === 'admin').length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Full access</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suspended</div>
          <div className="text-xl font-black text-rose-600 mt-1">{stats?.suspended_users ?? users.filter(u => u.status === 'suspended').length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Access blocked</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'permissions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Role Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Security Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Platform Settings</span>
        </button>
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3.5 my-auto pointer-events-none" />
              <input
                type="text"
                placeholder="Search user by name or email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Role filter */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Role:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Roles</option>
                  <option value="creator">Creator</option>
                  <option value="agency">Agency</option>
                  <option value="marketing">Marketing</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="pending">Pending Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-5">User &amp; Email</th>
                  <th className="py-3.5">Assigned Role</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5">Joined Date</th>
                  <th className="py-3.5">Last Login</th>
                  <th className="py-3.5 text-right pr-5">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      <span>Loading authenticated users directory...</span>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((targetUser) => {
                    const isSelf = targetUser.id === currentUser?.id;
                    return (
                      <tr key={targetUser.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* User Identity */}
                        <td className="py-3.5 pl-5">
                          <div className="flex items-center space-x-3">
                            <img
                              src={targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.email}`}
                              alt={targetUser.name}
                              className="w-9 h-9 rounded-xl border border-slate-200 object-cover bg-slate-100"
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900">{targetUser.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">{targetUser.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Roles */}
                        <td className="py-3.5">
                          <div className="flex flex-wrap gap-1 items-center">
                            {((targetUser.roles && targetUser.roles.length) ? targetUser.roles.slice(0, 2) : [targetUser.role]).map((r) => (
                              <React.Fragment key={r}>
                                {getRoleBadge(r)}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5">
                          {getStatusBadge(targetUser.status)}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                          {targetUser.created_at ? new Date(targetUser.created_at).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Last Login */}
                        <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                          {targetUser.last_login ? new Date(targetUser.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-5 text-right">
                          <div className="inline-flex items-center space-x-1">
                            {/* Toggle active / suspended */}
                            <button
                              onClick={() => handleToggleStatus(targetUser)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                targetUser.status === 'active'
                                  ? 'border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              } disabled:opacity-30 disabled:pointer-events-none`}
                              title={targetUser.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                            >
                              {targetUser.status === 'active' ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Edit Role / Details */}
                            <button
                              onClick={() => openEditModal(targetUser)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Edit User Roles & Status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setUserToResetPassword(targetUser);
                                setNewResetPassword(`ResetPass${Math.floor(100 + Math.random() * 900)}!`);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                              title="Reset User Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            <button
                              onClick={() => setUserToDelete(targetUser)}
                              disabled={isSelf}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Role Permissions Matrix */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC) Matrix</h3>
            <p className="text-xs text-slate-500">
              Backend token claims and endpoint security rules for Module 1
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 pl-2">System Permission / Capability</th>
                  <th className="py-3 text-center text-blue-600 font-extrabold">Creator</th>
                  <th className="py-3 text-center text-indigo-600 font-extrabold">Agency</th>
                  <th className="py-3 text-center text-sky-600 font-extrabold">Marketing Team</th>
                  <th className="py-3 text-center text-purple-600 font-extrabold">Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 pl-2 font-medium">View Own Content Analytics &amp; Reach</td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 pl-2 font-medium">Edit Own Creator Profile &amp; Media Kit Rates</td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 pl-2 font-medium">Search &amp; Browse Creator Directory</td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 pl-2 font-medium">Create &amp; Manage Brand Campaigns</td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 pl-2 font-medium">User CRUD &amp; Directory Management (/api/admin/users)</td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 pl-2 font-medium">Suspend / Reactivate User Accounts</td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 pl-2 font-medium">Inspect Security Audit Logs &amp; IP Addresses</td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><X className="w-4 h-4 text-rose-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Security &amp; Action Audit Logs</h3>
              <p className="text-xs text-slate-500">Live immutable logs recorded by the backend API</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">{auditLogs.length} events logged</span>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {log.action}
                    </span>
                    <span className="text-slate-800 font-medium">{log.details}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Recent'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Platform Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Platform Security &amp; Access Settings</h3>
            <p className="text-xs text-slate-500">Configure global authentication controls, session lifetimes &amp; registration</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Session Expiration</h4>
                  <p className="text-[11px] text-slate-500">JWT token lifetime before re-authentication</p>
                </div>
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {platformSettings.sessionTimeoutMinutes} mins (24h)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Public User Registration</h4>
                <p className="text-[11px] text-slate-500">Allow users to register accounts from the landing portal</p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSettings({ allowPublicRegistration: !platformSettings.allowPublicRegistration })}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  platformSettings.allowPublicRegistration ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs"></span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Require Two-Factor Auth (2FA)</h4>
                <p className="text-[11px] text-slate-500">Enforce OTP verification codes on every role login</p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSettings({ requireTwoFactor: !platformSettings.requireTwoFactor })}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  platformSettings.requireTwoFactor ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs"></span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Maintenance Mode</h4>
                <p className="text-[11px] text-slate-500">Restrict access to system administrators only</p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSettings({ maintenanceMode: !platformSettings.maintenanceMode })}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  platformSettings.maintenanceMode ? 'bg-rose-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs"></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add New User Account</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Hayes"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="jordan@creatoriq.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  >
                    <option value="creator">Creator</option>
                    <option value="agency">Agency</option>
                    <option value="marketing">Marketing</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newUserForm.status}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, status: e.target.value as UserStatus }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {isActionLoading ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User Roles / Status (Max 2 Roles Enforced) */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Modify User Roles &amp; Status</h3>
                <p className="text-[11px] text-slate-500">Authorized roles (maximum 2 per account)</p>
              </div>
              <button onClick={() => setUserToEdit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Editing account for:</p>
                <p className="text-sm font-bold text-slate-900">{userToEdit.name}</p>
                <p className="text-xs font-mono text-purple-700">{userToEdit.email}</p>
              </div>

              {/* Multi-role selection checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Authorized Workspaces &amp; Roles:
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    editingRoles.length === 2 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {editingRoles.length}/2 Roles Selected
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'creator' as UserRole, title: 'Creator', desc: 'Content analytics, audience reach, media kit' },
                    { id: 'agency' as UserRole, title: 'Agency Team', desc: 'Talent roster, creator discovery, campaigns' },
                    { id: 'marketing' as UserRole, title: 'Marketing Team', desc: 'Brand campaigns, creator outreach, ROI performance' },
                    { id: 'admin' as UserRole, title: 'Administrator', desc: 'User directory, platform controls, audit logs' }
                  ].map((roleItem) => {
                    const isSelected = editingRoles.includes(roleItem.id);
                    const isSelfAdmin = userToEdit.id === currentUser?.id && roleItem.id === 'admin';

                    const toggleRole = () => {
                      if (isSelected) {
                        if (isSelfAdmin) {
                          onShowToast('You cannot revoke your own administrator status.', 'error');
                          return;
                        }
                        if (editingRoles.length === 1) {
                          onShowToast('A user account must have at least one authorized role.', 'error');
                          return;
                        }
                        setEditingRoles(prev => prev.filter(r => r !== roleItem.id));
                      } else {
                        if (editingRoles.length >= 2) {
                          onShowToast('A user account can have a maximum of two authorized roles.', 'error');
                          return;
                        }
                        setEditingRoles(prev => [...prev, roleItem.id]);
                      }
                    };

                    return (
                      <div
                        key={roleItem.id}
                        onClick={toggleRole}
                        className={`p-2.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-purple-300 bg-purple-50/70 shadow-2xs' 
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={toggleRole}
                          disabled={isSelfAdmin && isSelected}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{roleItem.title}</span>
                            {isSelected && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">
                                Authorized
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{roleItem.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                <select
                  value={userToEdit.status}
                  onChange={(e) => setUserToEdit({ ...userToEdit, status: e.target.value as UserStatus })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="active">Active (Full access)</option>
                  <option value="pending">Pending Verification</option>
                  <option value="suspended">Suspended (Access blocked)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editingRoles.length === 0 || editingRoles.length > 2}
                  onClick={() => handleUpdateUser(userToEdit.id, { 
                    roles: editingRoles, 
                    role: editingRoles[0], 
                    status: userToEdit.status 
                  })}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  Apply Role Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirm Deletion */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Confirm Permanent Deletion</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to permanently delete user <strong className="text-slate-900">{userToDelete.name}</strong> ({userToDelete.email})? This action cannot be undone.
            </p>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Reset User Password */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Reset User Password</h3>
              </div>
              <button onClick={() => setUserToResetPassword(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Resetting credentials for:</p>
                <p className="text-sm font-bold text-slate-900">{userToResetPassword.name}</p>
                <p className="text-xs font-mono text-purple-700">{userToResetPassword.email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Independent Password</label>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="e.g. NewSecret123!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter a new password or use the auto-generated secure token above.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToResetPassword(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {isActionLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
