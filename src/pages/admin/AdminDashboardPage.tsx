import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Percent,
  Layers,
  ArrowRight,
  Users,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Search,
  Copy,
  Check,
  History,
  RefreshCw,
  Building2,
  User,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { CategoryDistributionChart } from '../../components/charts/CategoryDistributionChart';
import { PriorityPieChart } from '../../components/charts/PriorityPieChart';
import { StatusBreakdownChart } from '../../components/charts/StatusBreakdownChart';
import { DepartmentWorkloadChart } from '../../components/charts/DepartmentWorkloadChart';
import { CivicComplaintsMap } from '../../components/maps/CivicComplaintsMap';
import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { formatRelativeTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { UserDocument } from '../../types/user';
import {
  getAllRegisteredUsers,
  promoteUserToAdmin,
  revokeAdminPrivileges,
  getAdminAuditLogs,
  AdminAuditLogEntry,
} from '../../services/userService';

export const AdminDashboardPage: React.FC = () => {
  const { complaints, loading, error } = useComplaints();
  const { user: currentUser } = useAuth();

  // Multi-Admin Management State
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'officer' | 'citizen'>('all');
  const [adminTab, setAdminTab] = useState<'users' | 'audit'>('users');
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Role Change Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetUser: UserDocument | null;
    action: 'promote' | 'revoke';
    processing: boolean;
    error: string | null;
  }>({
    isOpen: false,
    targetUser: null,
    action: 'promote',
    processing: false,
    error: null,
  });

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllRegisteredUsers();
      setUsers(data);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getAdminAuditLogs();
      setAuditLogs(logs);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const openConfirmModal = (targetUser: UserDocument, action: 'promote' | 'revoke') => {
    setConfirmModal({
      isOpen: true,
      targetUser,
      action,
      processing: false,
      error: null,
    });
  };

  const closeConfirmModal = () => {
    if (confirmModal.processing) return;
    setConfirmModal({
      isOpen: false,
      targetUser: null,
      action: 'promote',
      processing: false,
      error: null,
    });
  };

  const handleExecuteRoleChange = async () => {
    if (!confirmModal.targetUser || confirmModal.processing) return;
    setConfirmModal((prev) => ({ ...prev, processing: true, error: null }));

    try {
      if (confirmModal.action === 'promote') {
        await promoteUserToAdmin(confirmModal.targetUser.uid, confirmModal.targetUser.email);
      } else {
        await revokeAdminPrivileges(confirmModal.targetUser.uid, confirmModal.targetUser.email);
      }

      await loadUsers();
      if (adminTab === 'audit') {
        await loadAuditLogs();
      }

      setConfirmModal({
        isOpen: false,
        targetUser: null,
        action: 'promote',
        processing: false,
        error: null,
      });
    } catch (err: any) {
      setConfirmModal((prev) => ({
        ...prev,
        processing: false,
        error: err.message || 'Operation failed. Please try again.',
      }));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !userSearchTerm.trim() ||
        (u.fullName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.uid || '').toLowerCase().includes(userSearchTerm.toLowerCase());

      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearchTerm, userRoleFilter]);

  const total = complaints.length;
  const pendingAssignments = complaints.filter(
    (c) => !c.assignedDepartment || c.assignedDepartment === 'Pending Assignment' || !c.primaryOfficerId
  ).length;
  const highPriority = complaints.filter(
    (c) => c.priority === 'Critical' || c.priority === 'High'
  ).length;
  const inProgress = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Assigned'
  ).length;
  const resolutionSubmitted = complaints.filter(
    (c) => c.status === 'Resolution Submitted'
  ).length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const recentSubmissions = complaints.slice(0, 5);

  // Compute Officer Workload dynamically from complaint records
  const officerWorkloadMap = complaints.reduce((acc, c) => {
    if (c.primaryOfficerName) {
      const key = c.primaryOfficerName;
      if (!acc[key]) {
        acc[key] = {
          name: c.primaryOfficerName,
          email: c.primaryOfficerEmail || '',
          department: c.assignedDepartment || 'General',
          totalAssigned: 0,
          inProgress: 0,
          resolutionSubmitted: 0,
          resolved: 0,
        };
      }
      acc[key].totalAssigned += 1;
      if (c.status === 'In Progress') acc[key].inProgress += 1;
      if (c.status === 'Resolution Submitted') acc[key].resolutionSubmitted += 1;
      if (c.status === 'Resolved') acc[key].resolved += 1;
    }
    return acc;
  }, {} as Record<string, { name: string; email: string; department: string; totalAssigned: number; inProgress: number; resolutionSubmitted: number; resolved: number }>);

  const officerWorkloadList = Object.values(officerWorkloadMap);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Cloud Firestore Sync Notice</p>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Top Command Banner */}
      <div className="bg-gradient-to-r from-[#071426] via-[#10243B] to-[#0D1B2E] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/30 uppercase tracking-wider">
              City Administration Headquarters
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Live Municipal Dispatch & Sensor Feed
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Municipal Command Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Real-time complaint ingestion, automated Gemini-ready priority triage, department allocation, and resolution monitoring across city wards.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 flex-shrink-0">
          <Link
            to="/admin/complaints"
            className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-glow-teal/20 shadow-md transition-all flex items-center space-x-2 btn-press"
          >
            <Layers className="w-4 h-4" />
            <span>Manage All Complaints</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Issues"
          value={loading ? '...' : total}
          icon={FileText}
          accentColor="navy"
          subtitle="All logged records"
        />
        <StatCard
          title="Pending Assign"
          value={loading ? '...' : pendingAssignments}
          icon={Clock}
          accentColor="blue"
          subtitle="Awaiting officer dispatch"
        />
        <StatCard
          title="High / Critical"
          value={loading ? '...' : highPriority}
          icon={AlertCircle}
          accentColor="rose"
          subtitle="Urgent public risk"
        />
        <StatCard
          title="In Progress"
          value={loading ? '...' : inProgress}
          icon={Layers}
          accentColor="amber"
          subtitle="Field squads active"
        />
        <StatCard
          title="Awaiting Review"
          value={loading ? '...' : resolutionSubmitted}
          icon={CheckCircle2}
          accentColor="teal"
          subtitle="Submitted resolutions"
        />
        <StatCard
          title="Closure Rate"
          value={loading ? '...' : `${resolutionRate}%`}
          icon={Percent}
          accentColor="teal"
          subtitle="Overall SLA rate"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDistributionChart complaints={complaints} />
        <PriorityPieChart complaints={complaints} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusBreakdownChart complaints={complaints} />
        <DepartmentWorkloadChart complaints={complaints} />
      </div>

      {/* Geospatial Incident Command Map */}
      <CivicComplaintsMap complaints={complaints} />

      {/* Field Officer Workload & Operations Overview */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>Field Officer Caseload & Operations Overview</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live workload distribution and resolution metrics across municipal officers
            </p>
          </div>
          <Link
            to="/admin/departments"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1 group self-start sm:self-auto"
          >
            <span>Manage Divisions & Officers</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Officer Name</th>
                <th className="px-5 py-3">Department Division</th>
                <th className="px-5 py-3">Total Assigned</th>
                <th className="px-5 py-3">Active In-Progress</th>
                <th className="px-5 py-3">Awaiting Verification</th>
                <th className="px-5 py-3">Verified Closed</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {officerWorkloadList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    <p className="font-semibold text-white">No field officers assigned to active complaints yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use the complaint registry to dispatch cases to designated division officers.
                    </p>
                  </td>
                </tr>
              ) : (
                officerWorkloadList.map((off) => (
                  <tr key={off.name} className="hover:bg-[#10243B]/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white">
                      <div>
                        <span>{off.name}</span>
                        {off.email && <span className="block text-[10px] text-slate-400 font-normal">{off.email}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-medium">
                      {off.department}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-white">
                      {off.totalAssigned}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-amber-300 font-bold">
                      {off.inProgress}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-indigo-300 font-bold">
                      {off.resolutionSubmitted > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-bold">
                          {off.resolutionSubmitted} Awaiting
                        </span>
                      ) : (
                        <span>0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-teal-300 font-bold">
                      {off.resolved}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-700/60">
                        Operational
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Submissions Quick Table */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Live Ingestion Feed
            </h3>
            <p className="text-xs text-slate-400">Most recently registered civic incidents</p>
          </div>
          <Link
            to="/admin/complaints"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1 group"
          >
            <span>View Full Registry</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Issue Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No complaints registered in the system yet.
                  </td>
                </tr>
              ) : (
                recentSubmissions.map((c) => (
                  <tr key={c.id} className="hover:bg-[#10243B]/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-white">
                      {c.id}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-200 max-w-xs truncate">
                      {c.title}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {c.category}
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono whitespace-nowrap">
                      {formatRelativeTime(c.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION: MULTI-ADMIN ACCESS GOVERNANCE & USER MANAGEMENT */}
      {/* ========================================================= */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        {/* Header with Tab switcher */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Municipal Administration & Access Governance
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage verified administrator permissions, promote trusted personnel, and audit security events.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-xl bg-[#071426] border border-slate-800 flex items-center space-x-1">
              <button
                onClick={() => setAdminTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  adminTab === 'users'
                    ? 'bg-teal-500 text-navy-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Registered Directory ({users.length})
              </button>
              <button
                onClick={() => {
                  setAdminTab('audit');
                  loadAuditLogs();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  adminTab === 'audit'
                    ? 'bg-teal-500 text-navy-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Security Audit Log</span>
              </button>
            </div>

            <button
              onClick={() => {
                loadUsers();
                if (adminTab === 'audit') loadAuditLogs();
              }}
              title="Refresh Directory"
              className="p-2 rounded-xl bg-[#10243B] hover:bg-[#162A45] text-slate-300 border border-slate-700 transition-colors btn-press"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers || loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Users Directory */}
        {adminTab === 'users' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Search and Role Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Filter by name, email, or UID..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-[#071426] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 font-medium">Filter:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-[#071426] text-slate-200 text-xs rounded-xl border border-slate-700 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  <option value="all">All Roles ({users.length})</option>
                  <option value="admin">Administrators ({users.filter((u) => u.role === 'admin').length})</option>
                  <option value="officer">Department Officers ({users.filter((u) => u.role === 'officer').length})</option>
                  <option value="citizen">Citizens ({users.filter((u) => u.role !== 'admin' && u.role !== 'officer').length})</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Account Details</th>
                    <th className="px-5 py-3">UID</th>
                    <th className="px-5 py-3">Ward / Jurisdiction</th>
                    <th className="px-5 py-3">Current Role</th>
                    <th className="px-5 py-3 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 text-teal-400 animate-spin mx-auto mb-2" />
                        <p>Synchronizing registered accounts...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No registered users found matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = currentUser?.uid === u.uid;
                      const isAdminRole = u.role === 'admin';
                      const isOfficerRole = u.role === 'officer';

                      return (
                        <tr key={u.uid} className="hover:bg-[#10243B]/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs flex-shrink-0">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <span>{(u.fullName || u.email || 'U')[0].toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate flex items-center space-x-1.5">
                                  <span>{u.fullName || 'Registered User'}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => handleCopyUid(u.uid)}
                              title="Click to copy UID"
                              className="inline-flex items-center space-x-1.5 font-mono text-[11px] text-slate-400 hover:text-teal-300 bg-[#071426] px-2 py-1 rounded-lg border border-slate-800 transition-colors group"
                            >
                              <span>{u.uid.slice(0, 10)}...</span>
                              {copiedUid === u.uid ? (
                                <Check className="w-3 h-3 text-teal-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-500 group-hover:text-teal-400" />
                              )}
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-slate-300">
                            <div>
                              <span>{u.ward || 'Central Municipal Ward'}</span>
                              {u.departmentName && (
                                <span className="block text-[10px] text-teal-400 font-medium">
                                  {u.departmentName}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            {isAdminRole ? (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Administrator</span>
                              </span>
                            ) : isOfficerRole ? (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-950/80 text-teal-300 border border-teal-500/40">
                                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                                <span>Department Officer</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>Citizen</span>
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            {isAdminRole ? (
                              isSelf ? (
                                <span className="text-[11px] text-slate-500 italic px-2 py-1">
                                  Current Session
                                </span>
                              ) : (
                                <button
                                  onClick={() => openConfirmModal(u, 'revoke')}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all btn-press"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Revoke Admin</span>
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => openConfirmModal(u, 'promote')}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-black shadow-xs transition-all btn-press"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Promote to Admin</span>
                              </button>
                            )}
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

        {/* Tab 2: Security Audit Log */}
        {adminTab === 'audit' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Immutable Administrative Access Trail</h4>
                <p className="text-xs text-slate-400">Cryptographic audit records of role elevations and revocations.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Last 50 Events</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Actor (Admin)</th>
                    <th className="px-5 py-3">Target User</th>
                    <th className="px-5 py-3">Transition</th>
                    <th className="px-5 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 text-teal-400 animate-spin mx-auto mb-2" />
                        <p>Loading security audit logs...</p>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No administrative access modifications recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-[#10243B]/60 transition-colors">
                        <td className="px-5 py-3.5">
                          {log.action === 'PROMOTE_ADMIN' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40 font-mono">
                              PROMOTE_ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40 font-mono">
                              REVOKE_ADMIN
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-slate-200">
                          <div>
                            <span className="font-semibold text-white">{log.actorEmail || 'Admin'}</span>
                            <span className="block font-mono text-[10px] text-slate-500">{log.actorUid}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-200">
                          <div>
                            <span className="font-semibold text-white">{log.targetName || log.targetEmail}</span>
                            {log.targetEmail && <span className="block text-[11px] text-slate-400">{log.targetEmail}</span>}
                            <span className="block font-mono text-[10px] text-slate-500">{log.targetUid}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-slate-300">
                          <span className="capitalize">{log.previousRole}</span>
                          <span className="text-teal-400 mx-1.5">→</span>
                          <span className="capitalize font-bold text-white">{log.newRole}</span>
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(log.timestamp)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        title={confirmModal.action === 'promote' ? 'Confirm Administrator Promotion' : 'Confirm Administrator Revocation'}
        description="Verify security authority before updating cryptographic account privileges."
        maxWidth="md"
      >
        <div className="space-y-4 text-left">
          {confirmModal.error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{confirmModal.error}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#071426] border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <ShieldAlert className={`w-4 h-4 ${confirmModal.action === 'promote' ? 'text-teal-400' : 'text-amber-400'}`} />
              <span>Target Account Summary</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <p>Name: <strong className="text-white">{confirmModal.targetUser?.fullName || 'User'}</strong></p>
              <p>Email: <strong className="text-white">{confirmModal.targetUser?.email}</strong></p>
              <p>UID: <code className="text-teal-300 font-mono text-[11px]">{confirmModal.targetUser?.uid}</code></p>
              <p>Current Role: <span className="capitalize font-bold text-white">{confirmModal.targetUser?.role || 'Citizen'}</span></p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {confirmModal.action === 'promote'
              ? 'Promoting this user will grant them full administrative oversight over all municipal departments, civic complaint registries, and role assignments.'
              : 'Revoking administrator privileges will restrict this user from accessing the Municipal Admin Command Center. If assigned to a department, officer privileges will remain intact.'}
          </p>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={closeConfirmModal}
              disabled={confirmModal.processing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteRoleChange}
              disabled={confirmModal.processing}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all btn-press ${
                confirmModal.action === 'promote'
                  ? 'bg-teal-500 hover:bg-teal-400 text-navy-950 shadow-md'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md'
              }`}
            >
              {confirmModal.processing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {confirmModal.action === 'promote' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span>{confirmModal.action === 'promote' ? 'Confirm Promotion' : 'Confirm Revocation'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
