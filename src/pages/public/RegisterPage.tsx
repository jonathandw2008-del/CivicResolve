import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowRight, AlertCircle, Lock, Eye, EyeOff, CheckCircle2, ChevronDown } from 'lucide-react';
import { CIVIC_WARDS } from '../../config/constants';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ward, setWard] = useState(CIVIC_WARDS[4] || 'Ward 14 - Central Zone');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prevent authenticated users from returning to register
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/citizen/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await register(name.trim(), email.trim(), password, ward);
      navigate('/citizen/dashboard', { replace: true });
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to complete citizen registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleSubmitting(true);
    setError('');

    try {
      await loginWithGoogle();
      navigate('/citizen/dashboard', { replace: true });
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Google sign-up encountered an error.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in duration-200 grid grid-cols-1 lg:grid-cols-12 my-4">
      {/* Civic Authority Brand Panel (Visible on lg screens) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#071426] via-[#10243B] to-[#0D1B2E] p-8 text-white flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 mb-6 shadow-glow-teal/20">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <h3 className="text-2xl font-black tracking-tight leading-tight">
            Citizen Action Hub
          </h3>
          <p className="text-xs text-teal-400 font-semibold mt-1">
            Official Municipal Registration
          </p>

          <p className="text-xs text-slate-300 mt-4 leading-relaxed">
            Create your authenticated citizen identity to report infrastructure breakdowns, receive official municipal status updates, and verify community resolutions.
          </p>

          <div className="mt-8 space-y-3.5 text-xs">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Ward-Specific Issue Routing</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Direct Department Dispatch Feedback</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Photo Evidence Verification</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Encrypted Resident Profile</span>
          <span className="font-mono text-teal-400">users/{'{uid}'}</span>
        </div>
      </div>

      {/* Main Registration Form */}
      <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#0D1B2E]">
        <div className="mb-6">
          <div className="lg:hidden w-12 h-12 rounded-2xl bg-[#10243B] border border-teal-500/30 text-teal-400 flex items-center justify-center mb-4 shadow-md">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Create Citizen Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Join your civic community to report, track, and resolve neighborhood infrastructure issues.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/60 text-rose-200 border border-rose-800/80 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Google Sign-Up Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={submitting || googleSubmitting || authLoading}
          className="w-full py-3 px-4 rounded-xl border border-slate-700 hover:border-teal-500/50 bg-[#10243B] hover:bg-[#162A45] text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-3 shadow-md btn-press disabled:opacity-60 touch-target"
        >
          {googleSubmitting ? (
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Sign up with Google</span>
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0D1B2E] px-3 text-slate-400 font-bold tracking-wider text-[10px]">
              Or register with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-[#F8FAFC] placeholder-slate-500 hover:border-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@example.com"
              required
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-[#F8FAFC] placeholder-slate-500 hover:border-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Residential Municipal Ward / Zone
            </label>
            <div className="relative">
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-[#F8FAFC] hover:border-slate-600 transition-colors appearance-none"
              >
                {CIVIC_WARDS.map((w) => (
                  <option key={w} value={w} className="bg-[#0D1B2E] text-white">
                    {w}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-[#F8FAFC] placeholder-slate-500 hover:border-slate-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-[#F8FAFC] placeholder-slate-500 hover:border-slate-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#10243B]/60 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <Lock className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Trust Security:</strong> All registrations are provisioned strictly as resident Citizens. Administrative roles require verified custom claims.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || googleSubmitting || authLoading}
            className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 text-navy-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center space-x-2 btn-press touch-target"
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                <span>Creating citizen profile...</span>
              </div>
            ) : (
              <>
                <span>Complete Citizen Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-teal-400 hover:text-teal-300 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
