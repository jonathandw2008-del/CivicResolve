import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Complaint } from '../../types/complaint';
import { CIVIC_DEPARTMENTS } from '../../config/constants';

interface DepartmentWorkloadChartProps {
  complaints: Complaint[];
}

export const DepartmentWorkloadChart: React.FC<DepartmentWorkloadChartProps> = ({
  complaints,
}) => {
  const data = CIVIC_DEPARTMENTS.map((dept) => {
    const deptComplaints = complaints.filter(
      (c) => c.assignedDepartment === dept || c.recommendedDepartment === dept
    );
    const inProgress = deptComplaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length;
    const resolved = deptComplaints.filter((c) => c.status === 'Resolved').length;
    const pending = deptComplaints.filter((c) => c.status === 'Reported' || c.status === 'Under Review').length;

    // Short name for legibility
    const shortName = dept.split('(')[1]?.replace(')', '') || dept.split(' ')[0];

    return {
      department: dept,
      shortName,
      inProgress,
      resolved,
      pending,
      total: deptComplaints.length,
    };
  });

  return (
    <div className="bg-[#0D1B2E] p-5 rounded-2xl border border-slate-800 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Department Workload Distribution</h3>
          <p className="text-xs text-slate-400">Assigned civic caseload by department</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
            <XAxis
              dataKey="shortName"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
            />
            <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={{ stroke: '#1E293B' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#071426] border border-slate-700 text-white p-3 rounded-xl text-xs shadow-xl space-y-1">
                      <p className="font-semibold text-teal-300">{item.department}</p>
                      <p className="text-slate-300">Pending Review: <span className="font-bold text-white">{item.pending}</span></p>
                      <p className="text-slate-300">Active / In Progress: <span className="font-bold text-amber-300">{item.inProgress}</span></p>
                      <p className="text-slate-300">Resolved: <span className="font-bold text-teal-400">{item.resolved}</span></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
            />
            <Bar dataKey="pending" name="Pending Review" stackId="a" fill="#334155" radius={[0, 0, 0, 0]} />
            <Bar dataKey="inProgress" name="Active / In Progress" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#13B8A6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
