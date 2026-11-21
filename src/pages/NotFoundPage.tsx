import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#071426] flex items-center justify-center p-6 text-center text-white">
      <div className="max-w-md bg-[#0D1B2E] p-8 rounded-3xl border border-slate-800 shadow-card space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">404 - Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The civic portal route you requested does not exist or has been relocated.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-teal-500 text-navy-950 text-xs font-bold rounded-xl hover:bg-teal-400 transition-colors btn-press"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to CivicResolve</span>
        </Link>
      </div>
    </div>
  );
};
