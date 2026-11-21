import React from 'react';
import { StatusHistoryEntry, ComplaintStatus } from '../../types/complaint';
import { formatDate } from '../../utils/formatters';
import { CheckCircle2, Clock, Wrench, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: ComplaintStatus;
}

const ALL_STEPS: { status: ComplaintStatus; label: string; icon: React.ElementType }[] = [
  { status: 'Reported', label: 'Reported', icon: FileText },
  { status: 'Acknowledged', label: 'Triage / Assigned', icon: Clock },
  { status: 'In Progress', label: 'In Progress', icon: Wrench },
  { status: 'Resolved', label: 'Resolved', icon: CheckCircle2 },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  history,
  currentStatus,
}) => {
  const statusRank: Record<ComplaintStatus, number> = {
    'Reported': 0,
    'Acknowledged': 1,
    'Under Review': 1,
    'Assigned': 1,
    'In Progress': 2,
    'Resolution Submitted': 2,
    'Resolved': 3,
  };

  const currentRank = statusRank[currentStatus] ?? 0;

  return (
    <div className="space-y-6">
      {/* Visual Step Progress Bar */}
      <div className="bg-[#0D1B2E] p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-5">
          Lifecycle Progression
        </h4>
        <div className="relative">
          {/* Background Track Line */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-slate-800 -z-0 hidden sm:block" />
          {/* Active Colored Track Line */}
          <div
            className="absolute top-4 left-6 h-1 bg-teal-500 -z-0 transition-all duration-500 hidden sm:block shadow-[0_0_10px_rgba(20,184,166,0.5)]"
            style={{
              width: `${(currentRank / (ALL_STEPS.length - 1)) * 100}%`,
              maxWidth: 'calc(100% - 3rem)',
            }}
          />

          <div className="grid grid-cols-4 gap-2 relative z-10">
            {ALL_STEPS.map((step, idx) => {
              const isCompleted = idx < currentRank;
              const isCurrent = idx === currentRank;
              const Icon = step.icon;

              return (
                <div key={step.status} className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                      isCurrent
                        ? 'bg-teal-500 border-teal-400 text-navy-950 font-bold shadow-[0_0_20px_rgba(20,184,166,0.5)] ring-4 ring-teal-500/20 scale-105'
                        : isCompleted
                        ? 'bg-[#10243B] border-teal-500/40 text-teal-300 shadow-sm'
                        : 'bg-[#071426] border-slate-700 text-slate-500'
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span
                    className={cn(
                      'mt-2.5 text-[10px] sm:text-xs leading-tight font-semibold',
                      isCurrent
                        ? 'text-teal-400'
                        : isCompleted
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Chronological History Log */}
      <div className="flow-root">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
          Municipal Audit Log & Ground Notes
        </h4>
        <ul className="-mb-8">
          {history.map((entry, index) => {
            const isLast = index === history.length - 1;

            return (
              <li key={`${entry.status}-${index}`}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3 items-start">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-teal-950 border border-teal-800 flex items-center justify-center ring-4 ring-[#071426] text-teal-400 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {entry.status}
                          <span className="text-xs text-slate-400 font-normal ml-2">
                            by <strong className="text-slate-200">{entry.updatedBy}</strong>
                          </span>
                        </p>
                        {entry.note && (
                          <p className="mt-1.5 text-xs sm:text-sm text-slate-200 bg-[#10243B] p-3 rounded-xl border border-slate-800 shadow-md leading-relaxed">
                            {entry.note}
                          </p>
                        )}
                      </div>
                      <div className="text-xs whitespace-nowrap text-slate-400 font-mono sm:text-right">
                        {formatDate(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
