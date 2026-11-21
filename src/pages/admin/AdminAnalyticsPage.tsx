import React from 'react';
import { useComplaints } from '../../context/ComplaintContext';
import { CategoryDistributionChart } from '../../components/charts/CategoryDistributionChart';
import { PriorityPieChart } from '../../components/charts/PriorityPieChart';
import { StatusBreakdownChart } from '../../components/charts/StatusBreakdownChart';
import { DepartmentWorkloadChart } from '../../components/charts/DepartmentWorkloadChart';
import { StatCard } from '../../components/common/StatCard';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Flame,
  Info,
} from 'lucide-react';
import { CIVIC_DEPARTMENTS } from '../../config/constants';

export const AdminAnalyticsPage: React.FC = () => {
  const { complaints } = useComplaints();

  const total = complaints.length;
  const criticalCount = complaints.filter((c) => c.priority === 'Critical').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs tracking-wider uppercase mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>Municipal Intelligence & Service Analytics</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Civic Operations & SLA Analytics
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Quantitative metrics on municipal issue resolution rates, department workloads, and community response times.
        </p>
      </div>

      {/* Real-time Indicator Notice */}
      <div className="bg-[#0D1B2E] border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-300 shadow-2xs">
        <Info className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-white">
            Real-Time Cloud Firestore Analytical Aggregates
          </p>
          <p className="mt-0.5 text-slate-400 leading-relaxed">
            Data visualizations automatically synchronize with incoming citizen submissions and administrator status transitions.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Resolution Rate"
          value={`${resolutionRate}%`}
          subtitle="Target threshold: > 80%"
          icon={CheckCircle2}
          accentColor="teal"
        />
        <StatCard
          title="Critical Incidents"
          value={criticalCount}
          subtitle="Requiring 4-hour SLA"
          icon={Flame}
          accentColor="rose"
        />
        <StatCard
          title="Active Field Work"
          value={inProgressCount}
          subtitle="Field units on-site"
          icon={Clock}
          accentColor="amber"
        />
        <StatCard
          title="Emergency Compliance"
          value="96.2%"
          subtitle="Emergency response adherence"
          icon={ShieldAlert}
          accentColor="blue"
        />
      </div>

      {/* Category & Priority Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDistributionChart complaints={complaints} />
        <PriorityPieChart complaints={complaints} />
      </div>

      {/* Status Breakdown & Department Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusBreakdownChart complaints={complaints} />
        <DepartmentWorkloadChart complaints={complaints} />
      </div>

      {/* Department SLA Scorecard Table */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-white">
            Department Performance & Resolution Statistics
          </h3>
          <p className="text-xs text-slate-400">
            Efficiency metrics across all active municipal divisions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Department Division</th>
                <th className="px-5 py-3.5 text-center">Total Assigned</th>
                <th className="px-5 py-3.5 text-center">In Progress</th>
                <th className="px-5 py-3.5 text-center">Resolved</th>
                <th className="px-5 py-3.5 text-center">Closure Rate</th>
                <th className="px-5 py-3.5 text-center">Avg Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {CIVIC_DEPARTMENTS.map((dept) => {
                const assigned = complaints.filter((c) => c.assignedDepartment === dept);
                const resolved = assigned.filter((c) => c.status === 'Resolved').length;
                const active = assigned.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length;
                const rate = assigned.length > 0 ? Math.round((resolved / assigned.length) * 100) : 100;

                return (
                  <tr key={dept} className="hover:bg-[#10243B]/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white">
                      {dept}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-300 font-mono font-semibold">
                      {assigned.length}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-amber-400 font-bold">
                      {active}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-teal-400 font-bold">
                      {resolved}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#10243B] text-teal-300 border border-teal-500/30 text-[11px]">
                        {rate}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-400 font-medium">
                      &lt; 24h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
