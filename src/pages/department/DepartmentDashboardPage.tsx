import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
  Flame,
  Send,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { formatRelativeTime } from '../../utils/formatters';
import { SmartRoutePlanner } from '../../components/maps/SmartRoutePlanner';

export const DepartmentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { officerComplaints, loading } = useComplaints();

  const total = officerComplaints.length;
  const pendingAcceptance = officerComplaints.filter((c) => c.status === 'Assigned').length;
  const inProgress = officerComplaints.filter((c) => c.status === 'In Progress').length;
  const resolutionSubmitted = officerComplaints.filter(
    (c) => c.status === 'Resolution Submitted'
  ).length;
  const resolved = officerComplaints.filter((c) => c.status === 'Resolved').length;

  const primaryCount = officerComplaints.filter(
    (c) => c.primaryOfficerId === user?.uid || c.primaryOfficerUid === user?.uid
  ).length;
  const supportingCount = officerComplaints.filter(
    (c) => c.supportingOfficerIds?.includes(user?.uid || '') || c.supportingOfficerUids?.includes(user?.uid || '')
  ).length;

  const criticalIssues = officerComplaints.filter(
    (c) => c.priority === 'Critical' && c.status !== 'Resolved'
  );

  const recentAssigned = officerComplaints.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Officer Command Banner */}
      <div className="bg-gradient-to-r from-[#071426] via-[#10243B] to-[#0D1B2E] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-premium relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-teal-500/15 via-teal-500/5 to-transparent pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Department Operations Command</span>
            </span>
            {user?.departmentName && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#10243B] text-teal-300 border border-teal-700/60 text-[11px] font-mono">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>{user.departmentName}</span>
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Officer {user?.name || 'Department Member'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2.5 leading-relaxed font-normal">
            Manage your assigned municipal caseload, record field inspection progress notes, upload repair evidence, and submit verified incident resolutions.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/department/complaints"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-glow-teal/20 shadow-md transition-all btn-press card-hover"
            >
              <FileText className="w-4 h-4" />
              <span>View Assigned Caseload ({total})</span>
            </Link>
            <Link
              to="/department/team"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#10243B] hover:bg-[#162A45] text-white font-bold text-xs sm:text-sm border border-slate-700 transition-all btn-press"
            >
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>Department Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Attention Banner */}
      {criticalIssues.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-3 shadow-card">
          <Flame className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="font-extrabold text-sm text-white">
              Critical Urgency Action Required ({criticalIssues.length})
            </p>
            <p className="mt-0.5 text-rose-300 leading-relaxed">
              You have {criticalIssues.length} active critical civic hazard{criticalIssues.length > 1 ? 's' : ''} assigned to your division requiring prompt 4-hour SLA field response.
            </p>
          </div>
          <Link
            to="/department/complaints"
            className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors"
          >
            Review Urgent
          </Link>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Assigned Issues"
          value={loading ? '...' : total}
          subtitle="Total assigned cases"
          icon={FileText}
          accentColor="navy"
        />
        <StatCard
          title="Pending Accept"
          value={loading ? '...' : pendingAcceptance}
          subtitle="New assignments"
          icon={Clock}
          accentColor="blue"
        />
        <StatCard
          title="Field Active"
          value={loading ? '...' : inProgress}
          subtitle="Work in progress"
          icon={AlertTriangle}
          accentColor="amber"
        />
        <StatCard
          title="Resolution Sub."
          value={loading ? '...' : resolutionSubmitted}
          subtitle="Awaiting admin check"
          icon={Send}
          accentColor="blue"
        />
        <StatCard
          title="Resolved"
          value={loading ? '...' : resolved}
          subtitle="Closed & verified"
          icon={CheckCircle2}
          accentColor="teal"
        />
        <StatCard
          title="Primary Officer"
          value={loading ? '...' : primaryCount}
          subtitle={`+ ${supportingCount} supporting`}
          icon={UserCheck}
          accentColor="teal"
        />
      </div>

      {/* Officer Smart Route Planner */}
      <SmartRoutePlanner
        officerComplaints={officerComplaints}
        officerName={user?.name}
        departmentName={user?.departmentName}
      />

      {/* Recent Assigned Feed Table */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Active Officer Caseload
            </h3>
            <p className="text-xs text-slate-400">Civic issues assigned to your unit in Cloud Firestore</p>
          </div>
          <Link
            to="/department/complaints"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1 group"
          >
            <span>View All ({total})</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Your Role</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Synchronizing officer caseload...</span>
                  </td>
                </tr>
              ) : recentAssigned.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-white">No complaints currently assigned</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      When the municipal administration delegates civic complaints to you or your department, they will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                recentAssigned.map((c) => {
                  const isPrimary = c.primaryOfficerId === user?.uid || c.primaryOfficerUid === user?.uid;
                  return (
                    <tr key={c.id} className="hover:bg-[#10243B]/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-white">
                        {c.id}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs font-semibold text-slate-200 truncate">
                        {c.title}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {c.category}
                      </td>
                      <td className="px-5 py-3.5">
                        {isPrimary ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-700/80">
                            Primary Officer
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10243B] text-slate-300 border border-slate-700">
                            Supporting
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <PriorityBadge priority={c.priority} size="sm" />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatRelativeTime(c.updatedAt || c.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/department/complaints/${c.id}`}
                          className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-bold transition-colors btn-press"
                        >
                          Dossier
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
