import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, LayoutDashboard, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Landing page renders its own dedicated dark tech interface with floating navigation
  if (location.pathname === '/') {
    return <Outlet />;
  }

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#071426] text-[#F8FAFC] flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Public Frosted Header */}
      <header className="sticky top-0 z-30 h-16 bg-[#0D1B2E]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between shadow-2xl">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)] group-hover:scale-105 transition-transform duration-200">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <span className="font-extrabold text-white text-lg tracking-tight block leading-tight">
              CivicResolve
            </span>
            <span className="text-[10px] text-teal-400 font-semibold tracking-wide hidden sm:block">
              Report. Resolve. Rebuild.
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3 sm:space-x-4 text-xs font-semibold">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center space-x-2 text-slate-400 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span>
                  Signed in as <strong className="text-slate-200">{user?.name || user?.email}</strong>
                </span>
              </div>
              <Link
                to={isAdmin ? '/admin/dashboard' : '/citizen/dashboard'}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all btn-press touch-target"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-1.5 p-2 rounded-lg hover:bg-slate-800/60 touch-target"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-2 text-slate-300 hover:text-white transition-colors touch-target flex items-center"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all btn-press touch-target flex items-center"
              >
                Create Citizen Account
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-teal-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="py-6 px-4 text-center text-xs text-slate-400 border-t border-slate-800/80 bg-[#0D1B2E]/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>CivicResolve Municipal Platform • PromptWars x GDG On-Campus Hackathon</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>End-to-End Encrypted</span>
            <span>•</span>
            <span>Cloud Firestore Sync</span>
            <span>•</span>
            <span>Gemini AI Triage</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
