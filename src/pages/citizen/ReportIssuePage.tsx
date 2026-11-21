import React from 'react';
import { ComplaintForm } from '../../components/citizen/ComplaintForm';
import { CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

export const ReportIssuePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Report a Civic Issue
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Submit details and photos of community problems. Our AI will classify the severity and immediately assign it to the responsible municipal department.
        </p>
      </div>

      {/* Helpful reporting guidelines banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0D1B2E] p-4 rounded-2xl border border-slate-800 shadow-card card-hover flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-teal-950/40 text-teal-400 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">Clear Landmarks</p>
            <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
              Mention street names, pillar numbers or nearby shops.
            </p>
          </div>
        </div>

        <div className="bg-[#0D1B2E] p-4 rounded-2xl border border-slate-800 shadow-card card-hover flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-amber-950/40 text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">Safety Hazards</p>
            <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
              Highlight live wires, open manholes or deep road craters.
            </p>
          </div>
        </div>

        <div className="bg-[#0D1B2E] p-4 rounded-2xl border border-slate-800 shadow-card card-hover flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400 flex-shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">AI Priority Detection</p>
            <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
              Automated triage assigns urgency from Low to Critical.
            </p>
          </div>
        </div>
      </div>

      {/* Submission Form */}
      <ComplaintForm />
    </div>
  );
};
