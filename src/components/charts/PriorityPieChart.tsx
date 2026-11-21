import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Complaint, ComplaintPriority } from '../../types/complaint';

interface PriorityPieChartProps {
  complaints: Complaint[];
}

const PRIORITY_META: Record<ComplaintPriority, { label: string; color: string }> = {
  Critical: { label: 'Critical (Immediate)', color: '#f43f5e' }, // rose-500
  High: { label: 'High Priority', color: '#f97316' },     // orange-500
  Medium: { label: 'Medium Priority', color: '#f59e0b' },   // amber-500
  Low: { label: 'Low (Scheduled)', color: '#10b981' },     // emerald-500
};

export const PriorityPieChart: React.FC<PriorityPieChartProps> = ({ complaints }) => {
  const priorities: ComplaintPriority[] = ['Critical', 'High', 'Medium', 'Low'];

  const data = priorities.map((p) => {
    const count = complaints.filter((c) => c.priority === p).length;
    return {
      name: p,
      fullName: PRIORITY_META[p].label,
      value: count,
      color: PRIORITY_META[p].color,
    };
  });

  return (
    <div className="bg-[#0D1B2E] p-5 rounded-2xl border border-slate-800 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Priority Triage Breakdown</h3>
          <p className="text-xs text-slate-400">AI-computed urgency levels</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#071426] border border-slate-700 text-white p-2.5 rounded-xl shadow-xl text-xs">
                      <p className="font-semibold" style={{ color: item.color }}>
                        {item.fullName}
                      </p>
                      <p className="mt-1 text-slate-300">
                        Count: <span className="font-bold text-white">{item.value}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
