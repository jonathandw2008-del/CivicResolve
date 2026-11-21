import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Complaint, ComplaintStatus } from '../../types/complaint';

interface StatusBreakdownChartProps {
  complaints: Complaint[];
}

const STATUS_CONFIG: Record<ComplaintStatus, { short: string; color: string }> = {
  'Reported': { short: 'Reported', color: '#94a3b8' },
  'Acknowledged': { short: 'Acknowl.', color: '#3b82f6' },
  'Under Review': { short: 'Review', color: '#60a5fa' },
  'Assigned': { short: 'Assigned', color: '#8b5cf6' },
  'In Progress': { short: 'Active', color: '#f59e0b' },
  'Resolution Submitted': { short: 'Submitted', color: '#6366f1' },
  'Resolved': { short: 'Resolved', color: '#0d9488' },
};

export const StatusBreakdownChart: React.FC<StatusBreakdownChartProps> = ({ complaints }) => {
  const statuses: ComplaintStatus[] = [
    'Reported',
    'Acknowledged',
    'In Progress',
    'Resolved',
  ];

  const data = statuses.map((status) => {
    const count = complaints.filter((c) => c.status === status).length;
    return {
      status,
      short: STATUS_CONFIG[status].short,
      count,
      color: STATUS_CONFIG[status].color,
    };
  });

  return (
    <div className="bg-[#0D1B2E] p-5 rounded-2xl border border-slate-800 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Complaint Resolution Pipeline</h3>
          <p className="text-xs text-slate-400">Active status progression through civic stages</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1E293B" />
            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} axisLine={{ stroke: '#1E293B' }} />
            <YAxis
              type="category"
              dataKey="short"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#071426] border border-slate-700 text-white p-2.5 rounded-xl text-xs shadow-xl">
                      <p className="font-semibold text-teal-300">{item.status}</p>
                      <p className="mt-1 text-slate-300">
                        Active Issues: <span className="font-bold text-white">{item.count}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
