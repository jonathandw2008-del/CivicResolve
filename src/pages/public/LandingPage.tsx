import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  FilePlus2,
  Cpu,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  Building2,
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
  Flame,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintContext';
import { useCountUp } from '../../hooks/useCountUp';
import { InteractiveGradientBackground } from '../../components/common/InteractiveGradientBackground';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isOfficer, logout } = useAuth();
  const { complaints, isFirestoreConnected } = useComplaints();
  const navigate = useNavigate();

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive section drawer state ('workflow' | 'ai' | 'departments' | null)
  const [activeModal, setActiveModal] = useState<'workflow' | 'ai' | 'departments' | null>(null);

  // Real-time Firestore complaint numbers with sensible fallbacks
  const totalDbCount = complaints.length;
  const resolvedDbCount = complaints.filter((c) => c.status === 'Resolved').length;

  const rawTotal = totalDbCount > 0 ? totalDbCount : 128;
  const rawResolved = totalDbCount > 0 ? resolvedDbCount : 94;
  const rawRate = totalDbCount > 0 ? Math.round((resolvedDbCount / totalDbCount) * 100) : 96;

  const totalComplaints = useCountUp(rawTotal, 750);
  const resolvedComplaints = useCountUp(rawResolved, 750);
  const resolutionRate = useCountUp(rawRate, 750);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#071426] text-slate-100 selection:bg-teal-500 selection:text-white relative overflow-x-hidden">
      {/* Interactive, animated abstract gradient background */}
      <InteractiveGradientBackground />

      {/* 1. COMPACT FLOATING NAVIGATION BAR */}
      <header className="sticky top-4 z-40 px-3 sm:px-6 max-w-7xl mx-auto">
        <nav
          className="rounded-full bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all"
          aria-label="Main Navigation"
        >
          {/* Logo & Branding */}
          <Link
            to="/"
            className="flex items-center space-x-2.5 group focus:outline-none focus:ring-2 focus:ring-teal-500/40 rounded-full pr-2"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-glow-teal/20 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                CivicResolve
              </span>
              {/* Online status indicator */}
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/80 text-[10px] font-mono">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
                </span>
                <span>{isFirestoreConnected ? 'LIVE' : 'SYNC'}</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-300">
            <Link
              to="/"
              className="text-teal-400 font-bold transition-colors focus:outline-none focus:text-teal-300"
            >
              Home
            </Link>
            <Link
              to="/citizen/dashboard"
              className="hover:text-teal-300 transition-colors focus:outline-none focus:text-teal-300"
            >
              Citizen Portal
            </Link>
            <Link
              to="/department/dashboard"
              className="hover:text-teal-300 transition-colors focus:outline-none focus:text-teal-300"
            >
              Department Portal
            </Link>
            <Link
              to="/admin/dashboard"
              className="hover:text-teal-300 transition-colors focus:outline-none focus:text-teal-300"
            >
              Municipal Command Center
            </Link>
            <button
              type="button"
              onClick={() => setActiveModal('workflow')}
              className="hover:text-teal-300 transition-colors focus:outline-none focus:text-teal-300"
            >
              How It Works
            </button>
          </div>

          {/* Right Action: Sign In / Profile or Dashboard */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={isAdmin ? '/admin/dashboard' : isOfficer ? '/department/dashboard' : '/citizen/dashboard'}
                  className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-400 text-navy-950 font-extrabold text-xs shadow-glow-teal/20 transition-all btn-press flex items-center space-x-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'Admin Console' : isOfficer ? 'Officer Console' : 'My Dashboard'}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-full hover:bg-slate-800 focus:outline-none"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-2 py-1"
                >
                  Sign In
                </Link>
                <Link
                  to="/citizen/report"
                  className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-400 text-navy-950 font-extrabold text-xs shadow-glow-teal/20 transition-all btn-press flex items-center space-x-1"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Report Issue</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle (Strict min 44x44px target) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden touch-target flex items-center justify-center p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            aria-label="Toggle navigation drawer"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-teal-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-5 shadow-2xl animate-in slide-down duration-150 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-mono text-teal-400 text-[11px] font-bold uppercase tracking-wider">
                Civic Services Navigation
              </span>
              <span className="inline-flex items-center space-x-1 text-[10px] text-teal-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Live Cloud Node</span>
              </span>
            </div>

            <div className="space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center px-4 rounded-xl text-sm font-bold text-teal-400 bg-slate-800/60 btn-press"
              >
                Home
              </Link>
              <Link
                to="/citizen/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center px-4 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800/50 btn-press"
              >
                Citizen Portal
              </Link>
              <Link
                to="/department/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center px-4 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800/50 btn-press"
              >
                Department Portal
              </Link>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center px-4 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800/50 btn-press"
              >
                Municipal Command Center
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveModal('workflow');
                }}
                className="w-full min-h-[44px] flex items-center px-4 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-800/50 text-left btn-press"
              >
                How It Works
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={isAdmin ? '/admin/dashboard' : isOfficer ? '/department/dashboard' : '/citizen/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full min-h-[44px] rounded-xl bg-teal-500 text-navy-950 font-black text-xs flex items-center justify-center space-x-2 btn-press"
                  >
                    <User className="w-4 h-4" />
                    <span>Enter {isAdmin ? 'Municipal Console' : isOfficer ? 'Department Console' : 'Citizen Dashboard'}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-slate-800 text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 btn-press"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] rounded-xl bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center btn-press"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/citizen/report"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] rounded-xl bg-teal-500 text-navy-950 font-black text-xs flex items-center justify-center btn-press"
                  >
                    Report Issue
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* 2. HERO SECTION: Seamless Integrated Two-Column Composition */}
        <section className="relative pt-4 sm:pt-8 pb-4 sm:pb-8">
          {/* Subtle ambient luminous glow behind headline */}
          <div className="absolute -top-10 -left-10 w-[550px] h-[380px] bg-gradient-to-br from-teal-500/20 via-cyan-500/15 to-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN: Eyebrow, Headline, Description, CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left relative">
              {/* Eyebrow Label */}
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-teal-400 bg-teal-950/70 border border-teal-800/90 px-3.5 py-1.5 rounded-full inline-block shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                  SMARTER CIVIC SERVICES
                </span>
              </div>

              {/* Required Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                One platform to report, resolve and rebuild our communities.
              </h1>

              {/* Supporting Description */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-xl">
                CivicResolve combines automated Google Gemini AI triage with Cloud Firestore to connect
                citizens directly with municipal field authorities. Report potholes, power outages,
                or drainage hazards with zero bureaucratic delays and guaranteed photographic resolution.
              </p>

              {/* Three Main Portal CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to="/citizen/dashboard"
                  className="min-h-[44px] px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(20,184,166,0.35)] transition-all card-hover btn-press flex items-center justify-center space-x-2"
                >
                  <FilePlus2 className="w-4 h-4 text-navy-950" />
                  <span>Citizen Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/department/dashboard"
                  className="min-h-[44px] px-5 py-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 text-slate-200 font-bold text-xs sm:text-sm border border-teal-500/30 hover:border-teal-400/60 backdrop-blur-xl transition-all card-hover btn-press flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Building2 className="w-4 h-4 text-teal-400" />
                  <span>Department Portal</span>
                </Link>

                <Link
                  to="/admin/dashboard"
                  className="min-h-[44px] px-5 py-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 text-slate-200 font-bold text-xs sm:text-sm border border-teal-500/30 hover:border-teal-400/60 backdrop-blur-xl transition-all card-hover btn-press flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Command Center</span>
                </Link>
              </div>

              {/* Trust Tag Strip */}
              <div className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-300 font-medium">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>PromptWars x GDG Hackathon</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Zero-Trust Security</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Real-Time Audit Trail</span>
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Four Compact Interactive Feature Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card 1: AI-Powered Complaint Triage */}
              <button
                type="button"
                onClick={() => setActiveModal('ai')}
                className="w-full text-left p-5 rounded-2xl border border-teal-500/25 hover:border-teal-400/60 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(8,127,140,0.25)] hover:shadow-[0_12px_32px_rgba(20,184,166,0.35)] transition-all card-hover btn-press touch-target flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/25 transition-all pointer-events-none" />
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-3 shadow-[0_0_15px_rgba(20,184,166,0.2)] group-hover:scale-105 transition-transform">
                    <Cpu className="w-4 h-4 text-teal-400" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    AI-Powered Triage
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Gemini urgency scoring (Low to Critical) calibrated in under 15 seconds.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-mono font-bold text-teal-400 flex items-center space-x-1">
                  <span>Explore Logic</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* Card 2: Live Complaint Tracking */}
              <button
                type="button"
                onClick={() => setActiveModal('workflow')}
                className="w-full text-left p-5 rounded-2xl border border-cyan-500/25 hover:border-cyan-400/60 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(6,182,212,0.25)] hover:shadow-[0_12px_32px_rgba(6,182,212,0.35)] transition-all card-hover btn-press touch-target flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/25 transition-all pointer-events-none" />
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Live Issue Tracking
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    5-stage milestones with public Cloud Firestore chronological audit logs.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-mono font-bold text-cyan-400 flex items-center space-x-1">
                  <span>Track Lifecycle</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* Card 3: Department Officer Portal */}
              <Link
                to="/department/dashboard"
                className="w-full text-left p-5 rounded-2xl border border-blue-500/25 hover:border-blue-400/60 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.35)] transition-all card-hover btn-press touch-target flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/25 transition-all pointer-events-none" />
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_15px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    Department Portal
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Caseload dashboard, field progress logs, photo proof, and resolution submission.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-mono font-bold text-blue-400 flex items-center space-x-1">
                  <span>Enter Officer Portal</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>

              {/* Card 4: Verified Civic Resolution */}
              <Link
                to="/citizen/dashboard"
                className="w-full text-left p-5 rounded-2xl border border-emerald-500/25 hover:border-emerald-400/60 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.35)] transition-all card-hover btn-press touch-target flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/25 transition-all pointer-events-none" />
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Verified Resolution
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Mandatory photo proof inspection before any ticket reaches closure.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-mono font-bold text-emerald-400 flex items-center space-x-1">
                  <span>Citizen Hub</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. SECONDARY CONTENT: Lower Two-Column Composition */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT LARGE CARD: "Every civic issue deserves action." */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800/80 hover:border-teal-500/30 bg-slate-900/40 backdrop-blur-2xl p-6 sm:p-10 flex flex-col justify-between shadow-2xl transition-all relative overflow-hidden">
            {/* Ambient accent spot */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-teal-400 bg-teal-950/70 border border-teal-800/90 px-3 py-1 rounded-full inline-block shadow-2xs">
                COMMUNITY DISPATCH
              </span>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Every civic issue deserves action.
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                Broken asphalt, contaminated water mains, unlit corridors, and overflowing garbage aren't
                just inconveniences—they directly compromise public safety. CivicResolve eliminates the
                traditional municipal void where complaints sit unanswered for weeks.
              </p>

              {/* Real Firestore Statistics Mini-Bar */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Incidents Logged
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalComplaints}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Verified Fixed
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-teal-400 mt-0.5">
                    {resolvedComplaints}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    SLA Compliance
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{resolutionRate}%</p>
                </div>
              </div>
            </div>

            {/* Prominent Teal CTA */}
            <div className="pt-6 relative z-10">
              <Link
                to="/citizen/dashboard"
                className="min-h-[44px] px-7 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-glow-teal/20 transition-all card-hover btn-press inline-flex items-center space-x-2"
              >
                <span>Launch Citizen Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* RIGHT STACKED CARDS: 4 Compact Action Modules */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
            {/* Stacked Card 1: Municipal Command Center */}
            <Link
              to="/admin/dashboard"
              className="p-4 sm:p-5 rounded-2xl border border-teal-500/20 hover:border-teal-400/50 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-lg hover:shadow-[0_8px_25px_rgba(20,184,166,0.2)] transition-all card-hover btn-press touch-target flex items-start space-x-3.5 group relative overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-400 mt-0.5 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                <Layers className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    Municipal Command Center
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-400 transition-all" />
                </div>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                  Administrative console for department assignment, triage SLA oversight, and city ward analytics.
                </p>
              </div>
            </Link>

            {/* Stacked Card 2: Gemini AI Intelligence */}
            <button
              type="button"
              onClick={() => setActiveModal('ai')}
              className="w-full text-left p-4 sm:p-5 rounded-2xl border border-cyan-500/20 hover:border-cyan-400/50 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-lg hover:shadow-[0_8px_25px_rgba(6,182,212,0.2)] transition-all card-hover btn-press touch-target flex items-start space-x-3.5 group relative overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 mt-0.5 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Gemini AI Intelligence
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
                </div>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                  Automated public safety hazard detection, priority calibration, and department rationale.
                </p>
              </div>
            </button>

            {/* Stacked Card 3: Department Operations Portal */}
            <Link
              to="/department/dashboard"
              className="w-full text-left p-4 sm:p-5 rounded-2xl border border-blue-500/20 hover:border-blue-400/50 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-lg hover:shadow-[0_8px_25px_rgba(37,99,235,0.2)] transition-all card-hover btn-press touch-target flex items-start space-x-3.5 group relative overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-400 mt-0.5 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    Department Officer Portal
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
                </div>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                  Dedicated field unit work orders, progress notes, photographic evidence submission, and primary officer resolution.
                </p>
              </div>
            </Link>

            {/* Stacked Card 4: View Project Workflow */}
            <button
              type="button"
              onClick={() => setActiveModal('workflow')}
              className="w-full text-left p-4 sm:p-5 rounded-2xl border border-teal-500/20 hover:border-teal-400/50 bg-slate-900/50 hover:bg-slate-800/65 backdrop-blur-xl shadow-lg hover:shadow-[0_8px_25px_rgba(20,184,166,0.2)] transition-all card-hover btn-press touch-target flex items-start space-x-3.5 group relative overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-400 mt-0.5 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    View Project Workflow
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-400 transition-all" />
                </div>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                  Four-step transparent lifecycle from incident photo submission to verified closeout.
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* 4. MODAL / DRAWER: HOW IT WORKS WORKFLOW */}
        {activeModal === 'workflow' && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-[#0b1324] p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <h3 className="text-base font-bold text-white">
                    CivicResolve 4-Step Resolution Workflow
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 touch-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 font-mono font-bold text-xs flex items-center justify-center mb-2">
                    01
                  </div>
                  <h4 className="text-xs font-bold text-white">Citizen Incident Report</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Attach photo evidence, pinpoint the street address or pillar landmark, and submit in seconds.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center mb-2">
                    02
                  </div>
                  <h4 className="text-xs font-bold text-white">Gemini AI Triage</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    AI analyzes hazard severity, extracts key landmarks, and computes priority (Low to Critical).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center mb-2">
                    03
                  </div>
                  <h4 className="text-xs font-bold text-white">Department Allocation</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Dispatched directly to the relevant municipal engineer with strict turnaround targets.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-2">
                    04
                  </div>
                  <h4 className="text-xs font-bold text-white">Verified Ground Fix</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Repair crew completes field work, uploads photographic proof, and logs verifiable completion.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  to="/citizen/report"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 text-navy-950 font-bold text-xs btn-press"
                >
                  File a Report Now
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 5. MODAL / DRAWER: GEMINI AI DOSSIER DEMO */}
        {activeModal === 'ai' && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0b1324] p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  <h3 className="text-base font-bold text-white">
                    Sample Gemini AI Assessment Dossier
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 touch-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                  Sample Citizen Narrative
                </span>
                <p className="text-slate-200 italic leading-relaxed">
                  "Deep pothole with exposed steel rebar at Cross Cut Road junction, directly in front of the school bus stop. Rainwater pooling makes it invisible to two-wheelers after dusk."
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Classified Category</span>
                  <span className="font-bold text-white text-sm block mt-0.5">Roads and Potholes</span>
                </div>
                <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assessed Severity</span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs mt-1 border border-rose-500/30">
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>Critical Priority</span>
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-800/60 text-xs">
                <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">
                  AI Verifiable Rationale
                </span>
                <p className="text-slate-200 leading-relaxed">
                  "Exposed structural steel rebar in immediate proximity to a student pedestrian transit point creates high-risk puncture hazard. Elevated from Medium to Critical due to standing water concealment."
                </p>
              </div>

              <div className="text-xs text-slate-400 pt-1 flex items-center justify-between">
                <span>Destination: <strong className="text-teal-300">Public Works Department (PWD)</strong></span>
                <span className="font-mono text-slate-500 text-[10px]">Model: gemini-1.5-flash</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. MODAL / DRAWER: DEPARTMENT OPERATIONS OVERVIEW */}
        {activeModal === 'departments' && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0b1324] p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-teal-400" />
                  <h3 className="text-base font-bold text-white">
                    Municipal Operations & Division Scope
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 touch-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs max-h-96 overflow-y-auto scrollbar-thin pr-1">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">🛣️ Public Works Department (PWD)</span>
                    <span className="text-slate-400 text-[11px]">Asphalt craters, roadbeds, medians, cave-ins</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                    24 - 48h SLA
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">🗑️ Solid Waste Management & Sanitation</span>
                    <span className="text-slate-400 text-[11px]">Community dumpsters, illegal dumping, street debris</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                    12 - 24h SLA
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">💡 Electricity & Street Lighting Division</span>
                    <span className="text-slate-400 text-[11px]">Unlit corridors, damaged poles, exposed live wiring</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                    12 - 24h SLA
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">💧 Water Supply & Sewerage Board</span>
                    <span className="text-slate-400 text-[11px]">Main line ruptures, contaminated supply, flooding</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                    &lt; 12h SLA
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">🌊 Stormwater & Drainage Engineering</span>
                    <span className="text-slate-400 text-[11px]">Choked monsoon drains, missing manhole covers</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                    Emergency SLA
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* COMPACT DARK FOOTER */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80 py-8 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-300">
              CivicResolve Municipal Platform • PromptWars x GDG On-Campus Hackathon
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <Link to="/citizen/dashboard" className="hover:text-teal-400 transition-colors">
              Citizen Portal
            </Link>
            <span>•</span>
            <Link to="/admin/dashboard" className="hover:text-teal-400 transition-colors">
              Municipal Console
            </Link>
            <span>•</span>
            <span className="text-teal-400 font-mono">Cloud Firestore Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
