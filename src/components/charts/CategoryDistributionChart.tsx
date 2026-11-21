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
import { Complaint } from '../../types/complaint';
import { COMPLAINT_CATEGORIES } from '../../config/constants';

interface CategoryDistributionChartProps {
  complaints: Complaint[];
}

const CATEGORY_COLORS = [
  '#0d9488', // teal-600
  '#0284c7', // sky-600
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#64748b', // slate-500
];

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  complaints,
}) => {
  const data = COMPLAINT_CATEGORIES.map((category, idx) => {
    const count = complaints.filter((c) => c.category === category).length;
    // Short label for neat chart presentation
    const shortLabel =
      category === 'Roads and potholes'
        ? 'Roads'
        : category === 'Garbage and sanitation'
        ? 'Sanitation'
        : category === 'Water supply and leakage'
        ? 'Water'
        : category === 'Streetlights and electricity'
        ? 'Lighting'
        : category === 'Drainage and sewage'
        ? 'Drainage'
        : category === 'Public infrastructure'
        ? 'Infra'
        : 'Other';

    return {
      fullName: category,
      name: shortLabel,
      count,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    };
  });

  return (
    <div className="bg-[#0D1B2E] p-5 rounded-2xl border border-slate-800 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Complaints by Category</h3>
          <p className="text-xs text-slate-400">Distribution across municipal civic sectors</p>
        </div>
        <span className="text-xs font-mono font-semibold bg-[#10243B] text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-lg">
          {complaints.length} Total
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              allowDecimals={false}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#071426] border border-slate-700 text-white p-2.5 rounded-xl shadow-xl text-xs">
                      <p className="font-semibold text-teal-300">{item.fullName}</p>
                      <p className="mt-1 text-slate-300">
                        Complaints: <span className="font-bold text-white">{item.count}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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
