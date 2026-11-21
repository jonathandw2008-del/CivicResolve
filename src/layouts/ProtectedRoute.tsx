import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { ShieldAlert, RefreshCw, ArrowLeft, Terminal, Copy, Check, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading, isAuthenticated, isAdmin, isOfficer, refreshUserClaims, logout } = useAuth();
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Verifying Firebase security claims...</p>
        </div>
      </div>
    );
  }

  // Requirement 5: Unauthenticated users must not access protected citizen routes.
  // Preserve requested route in state.from
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Requirement 6: Restrict admin routes to users with trusted Firebase custom claims.
  // Deny admin access by default if custom claims are not present.
  if (requiredRole === 'admin' && !isAdmin) {
    const cliCommand = `node scripts/set-admin-claim.mjs ${user.email}`;

    const handleCopy = () => {
      navigator.clipboard.writeText(cliCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleRefresh = async () => {
      setRefreshing(true);
      try {
        await refreshUserClaims();
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#071426] flex items-center justify-center p-4 sm:p-6 text-white">
        <div className="w-full max-w-xl bg-[#0D1B2E] rounded-3xl border border-rose-500/30 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                Security Policy Enforcement
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Admin Access Denied: Custom Claim Required
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                You are authenticated as <strong className="text-white">{user.email}</strong>, but your Firebase token does not contain a verified administrator custom claim.
              </p>
            </div>
          </div>

          {/* Security Architecture Notice */}
          <div className="bg-[#071426] p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-white">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Zero-Trust Admin Access Standard</span>
            </div>
            <p className="leading-relaxed">
              In accordance with CivicResolve municipal security guidelines, administrative privileges cannot be granted client-side, during citizen registration, or via user-editable profile records.
            </p>
            <p className="leading-relaxed text-slate-400">
              Admin roles must be cryptographically issued via <strong>Firebase Admin SDK Custom Claims</strong> (<code className="bg-[#10243B] text-teal-300 px-1 py-0.5 rounded text-[11px] font-mono border border-slate-700">{`{ role: "admin" }`}</code>).
            </p>
          </div>

          {/* How to Provision Administrator */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-teal-400" />
              <span>How to Provision Admin for this Account</span>
            </h4>
            <p className="text-xs text-slate-400">
              Run the included administrative provisioning script using the Firebase Admin SDK:
            </p>
            <div className="bg-[#071426] text-slate-200 p-3 rounded-xl font-mono text-xs flex items-center justify-between border border-slate-800">
              <span className="truncate mr-2">{cliCommand}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-teal-400 hover:text-teal-300 p-1.5 rounded hover:bg-[#10243B] transition-colors"
                title="Copy Command"
              >
                {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Target UID: <code className="font-mono text-slate-300">{user.uid}</code>
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/citizen/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Citizen Portal</span>
            </Link>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => logout()}
                className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Recheck Token Claims</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Requirement 1 & 4: Restrict department routes to users with verified Officer role or Admin role
  if (requiredRole === 'officer' && !isOfficer && !isAdmin) {
    const cliCommand = `node scripts/set-officer-claim.mjs ${user.email} roads-bridges`;

    const handleCopy = () => {
      navigator.clipboard.writeText(cliCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleRefresh = async () => {
      setRefreshing(true);
      try {
        await refreshUserClaims();
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#071426] flex items-center justify-center p-4 sm:p-6 text-white">
        <div className="w-full max-w-xl bg-[#0D1B2E] rounded-3xl border border-amber-500/30 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                Department Portal Authorization
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Department Officer Access Required
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                You are authenticated as <strong className="text-white">{user.email}</strong>, but your account is not currently assigned to a municipal department.
              </p>
            </div>
          </div>

          {/* Policy Notice */}
          <div className="bg-[#071426] p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-white">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Officer Role Verification</span>
            </div>
            <p className="leading-relaxed">
              To safeguard civic infrastructure data, Department Portal access is restricted to verified municipal officers. An administrator can assign you to a department via the <strong>Municipal Admin Command Center</strong>.
            </p>
            <p className="leading-relaxed text-slate-400">
              Alternatively, server administrators can provision your account using the Firebase Admin SDK script.
            </p>
          </div>

          {/* Provisioning Command */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-teal-400" />
              <span>Administrator Provisioning Command</span>
            </h4>
            <div className="bg-[#071426] text-slate-200 p-3 rounded-xl font-mono text-xs flex items-center justify-between border border-slate-800">
              <span className="truncate mr-2">{cliCommand}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-teal-400 hover:text-teal-300 p-1.5 rounded hover:bg-[#10243B] transition-colors"
                title="Copy Command"
              >
                {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/citizen/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Citizen Portal</span>
            </Link>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => logout()}
                className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Verify Token Claims</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
