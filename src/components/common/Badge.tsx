import React from 'react';
import { ComplaintPriority, ComplaintStatus } from '../../types/complaint';
import { getPriorityBadgeColor, getStatusBadgeColor } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  className?: string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className,
  size = 'md',
}) => {
  const styles = getPriorityBadgeColor(priority);
  const isUrgent = priority === 'Critical' || priority === 'High';

  const darkPriorityStyles = {
    Critical: 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    High: 'bg-orange-950/80 text-orange-300 border-orange-800/80 shadow-[0_0_12px_rgba(249,115,22,0.2)]',
    Medium: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    Low: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  }[priority] || 'bg-slate-900 text-slate-300 border-slate-700';

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border shadow-2xs transition-all',
        darkPriorityStyles,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs sm:text-sm',
        className
      )}
    >
      <span className="relative flex h-2 w-2 mr-1.5 flex-shrink-0">
        {isUrgent && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              styles.dot
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', styles.dot)} />
      </span>
      {priority}
    </span>
  );
};

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = 'md',
}) => {
  const styles = getStatusBadgeColor(status);
  const isInMotion = status === 'In Progress' || status === 'Under Review' || status === 'Resolution Submitted';

  const darkStatusStyles = {
    Reported: 'bg-slate-800/90 text-slate-300 border-slate-700',
    Acknowledged: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
    'Under Review': 'bg-blue-950/80 text-blue-300 border-blue-800/80',
    Assigned: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
    'In Progress': 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    'Resolution Submitted': 'bg-purple-950/80 text-purple-300 border-purple-800/80 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    Resolved: 'bg-teal-950/80 text-teal-300 border-teal-800/80 shadow-[0_0_12px_rgba(20,184,166,0.25)]',
    Rejected: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
  }[status] || 'bg-slate-900 text-slate-300 border-slate-700';

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border shadow-2xs transition-all',
        darkStatusStyles,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs sm:text-sm',
        className
      )}
    >
      <span className="relative flex h-2 w-2 mr-1.5 flex-shrink-0">
        {isInMotion && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              styles.dot
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', styles.dot)} />
      </span>
      {status}
    </span>
  );
};

interface DepartmentBadgeProps {
  department: string;
  className?: string;
}

export const DepartmentBadge: React.FC<DepartmentBadgeProps> = ({ department, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#10243B] text-teal-300 border border-slate-700/80 shadow-2xs truncate max-w-xs',
        className
      )}
      title={department}
    >
      {department}
    </span>
  );
};
