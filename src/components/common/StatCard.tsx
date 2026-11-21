import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useCountUp } from '../../hooks/useCountUp';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    neutral?: boolean;
  };
  accentColor?: 'teal' | 'navy' | 'amber' | 'rose' | 'blue';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'teal',
  className,
}) => {
  // Support numeric animation when value is a number or purely numeric string
  const isPercent = typeof value === 'string' && value.endsWith('%');
  const rawNum = isPercent ? parseFloat(value) : value;
  const animatedNum = useCountUp(rawNum, 750);
  const displayValue = isPercent ? `${animatedNum}%` : animatedNum;

  const accentStyles = {
    teal: {
      wrapper: 'bg-teal-950/80 text-teal-300 border-teal-800/80 shadow-[0_0_15px_rgba(20,184,166,0.2)]',
      bar: 'from-teal-500 to-emerald-400',
    },
    navy: {
      wrapper: 'bg-[#10243B] text-slate-200 border-slate-700/80 shadow-slate-900/40',
      bar: 'from-blue-600 to-cyan-500',
    },
    amber: {
      wrapper: 'bg-amber-950/80 text-amber-300 border-amber-800/80 shadow-amber-500/10',
      bar: 'from-amber-500 to-orange-400',
    },
    rose: {
      wrapper: 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-rose-500/10',
      bar: 'from-rose-500 to-pink-500',
    },
    blue: {
      wrapper: 'bg-blue-950/80 text-blue-300 border-blue-800/80 shadow-blue-500/10',
      bar: 'from-blue-500 to-cyan-400',
    },
  }[accentColor];

  return (
    <div
      className={cn(
        'bg-[#0D1B2E] rounded-2xl border border-slate-800 p-5 shadow-lg card-hover relative overflow-hidden group',
        className
      )}
    >
      {/* Top subtle decorative accent bar */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-90 transition-opacity group-hover:opacity-100',
          accentStyles.bar
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1 truncate">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {displayValue}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 font-normal line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl border shadow-sm flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
            accentStyles.wrapper
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center text-xs">
          <span
            className={cn(
              'font-semibold mr-1.5 inline-flex items-center',
              trend.neutral
                ? 'text-slate-400'
                : trend.isPositive
                ? 'text-teal-400'
                : 'text-rose-400'
            )}
          >
            {trend.value}
          </span>
          <span className="text-slate-400 text-[11px]">vs last reporting cycle</span>
        </div>
      )}
    </div>
  );
};
