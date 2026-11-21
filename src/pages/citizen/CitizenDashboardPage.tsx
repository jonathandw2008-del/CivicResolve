import React from 'react';
import { Link } from 'react-router-dom';
import {
  FilePlus2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { ComplaintCard } from '../../components/citizen/ComplaintCard';
import { StatusBreakdownChart } from '../../components/charts/StatusBreakdownChart';

export const CitizenDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { userComplaints, loading, error, isFirestoreConnected } = useComplaints();

  const total = userComplaints.length;
  const pending = userComplaints.filter(
    (c) => c.status === 'Reported' || c.status === 'Under Review'
  ).length;
  const inProgress = userComplaints.filter(
    (c) => c.status === 'Assigned' || c.status === 'In Progress'
  ).length;
  const resolved = userComplaints.filter((c) => c.status === 'Resolved').length;

  const recentComplaints = userComplaints.slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome & Prompt CTA Banner */}
      <div className="bg-gradient-to-r from-[#071426] via-[#10243B] to-[#0D1B2E] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-premium relative overflow-hidden">
        {/* Decorative mesh glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-teal-500/15 via-teal-500/5 to-transparent pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Citizen Action Hub</span>
            </span>
            {isFirestoreConnected && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/80 text-teal-300 border border-teal-700/60 text-[11px] font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                <Database className="w-3 h-3 text-teal-400" />
                <span>Cloud Firestore Live</span>
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Welcome back, {user?.name || 'Citizen'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2.5 leading-relaxed font-normal">
            Spot a damaged street, overflow, broken light or hazardous drain? Report directly to your municipal administration with automated AI prioritization and end-to-end status tracking.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/citizen/report"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-glow-teal/20 shadow-md transition-all btn-press card-hover"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Report an Issue Now</span>
            </Link>
            <Link
              to="/citizen/complaints"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#10243B] hover:bg-[#162A45] text-white font-bold text-xs sm:text-sm border border-slate-700 transition-all btn-press"
            >
              <FileText className="w-4 h-4" />
              <span>View All My Complaints ({total})</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Firestore Sync Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Complaints"
          value={loading ? '...' : total}
          subtitle="All submitted issues"
          icon={FileText}
          accentColor="navy"
        />
        <StatCard
          title="Pending Review"
          value={loading ? '...' : pending}
          subtitle="Awaiting administrative review"
          icon={Clock}
          accentColor="blue"
        />
        <StatCard
          title="In Progress"
          value={loading ? '...' : inProgress}
          subtitle="Field action underway"
          icon={AlertTriangle}
          accentColor="amber"
        />
        <StatCard
          title="Resolved Issues"
          value={loading ? '...' : resolved}
          subtitle="Verified resolutions"
          icon={CheckCircle2}
          accentColor="teal"
        />
      </div>

      {/* Pipeline Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Complaints */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Recent Complaints</h3>
              <p className="text-xs text-slate-400 font-medium">Latest civic reports and real-time status</p>
            </div>
            <Link
              to="/citizen/complaints"
              className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1 group"
            >
              <span>See all ({total})</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-[#0D1B2E] rounded-2xl border border-slate-800 p-12 text-center shadow-card">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-medium">Loading your civic records from Cloud Firestore...</p>
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-8 sm:p-12 text-center shadow-card">
              <div className="w-16 h-16 rounded-3xl bg-[#10243B] border border-slate-700 text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FilePlus2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-white">No complaints submitted yet</h4>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Spot a civic disruption in your neighborhood? Submit a photo and description to initiate municipal action.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Popular:</span>
                <span className="px-2.5 py-1 rounded-full bg-[#10243B] text-slate-300 border border-slate-700/60 text-xs font-medium">Potholes</span>
                <span className="px-2.5 py-1 rounded-full bg-[#10243B] text-slate-300 border border-slate-700/60 text-xs font-medium">Broken Streetlight</span>
                <span className="px-2.5 py-1 rounded-full bg-[#10243B] text-slate-300 border border-slate-700/60 text-xs font-medium">Drain Overflow</span>
              </div>

              <div className="mt-6">
                <Link
                  to="/citizen/report"
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold text-xs shadow-md transition-all btn-press"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Report Your First Civic Issue</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentComplaints.map((c) => (
                <ComplaintCard key={c.id} complaint={c} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 col: Resolution Pipeline */}
        <div>
          <StatusBreakdownChart complaints={userComplaints} />
        </div>
      </div>
    </div>
  );
};
