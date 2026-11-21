import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ArrowRightLeft, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  subtitle,
}) => {
  const { user, isAdmin, isOfficer, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrentlyInAdmin = location.pathname.startsWith('/admin');
  const isCurrentlyInDepartment = location.pathname.startsWith('/department');

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handlePortalSwitch = () => {
    if (isCurrentlyInDepartment) {
      navigate('/citizen/dashboard');
    } else if (isCurrentlyInAdmin) {
      if (isOfficer) {
        navigate('/department/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } else {
      if (isOfficer) {
        navigate('/department/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0D1B2E]/90 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shadow-2xl backdrop-blur-md">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus-ring touch-target flex items-center justify-center"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          {title && (
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 hidden sm:block font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Quick portal switcher, notifications, profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Portal Switcher Button */}
        <button
          onClick={handlePortalSwitch}
          className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#10243B] text-slate-200 hover:text-teal-300 hover:bg-[#162A45] border border-slate-700/80 transition-all btn-press shadow-sm"
          title="Switch Active Console"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {isCurrentlyInDepartment
              ? 'Citizen Services'
              : isCurrentlyInAdmin
              ? isOfficer
                ? 'Department Portal'
                : 'Citizen Services'
              : isOfficer
              ? 'Officer Portal'
              : 'Command Center'}
          </span>
        </button>

        {/* Notification Center */}
        <NotificationCenter />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors focus-ring touch-target"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-teal-500 shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#10243B] text-teal-300 font-bold text-xs flex items-center justify-center border-2 border-teal-500 shadow-2xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
            )}
            <div className="hidden md:block text-left text-xs">
              <span className="block font-bold text-white leading-tight truncate max-w-[130px]">
                {user?.name || user?.email || 'Citizen'}
              </span>
              <span className="block text-[10px] text-teal-400 font-semibold">
                {isAdmin ? 'Administrator' : isOfficer ? 'Department Officer' : 'Citizen Account'}
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0D1B2E] rounded-2xl shadow-2xl border border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-xs font-bold text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                {user?.departmentName && (
                  <p className="text-[10px] text-teal-300 font-medium mt-0.5 truncate">{user.departmentName}</p>
                )}
                <div className="mt-2 flex items-center space-x-1.5">
                  <span
                    className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isAdmin
                        ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                        : isOfficer
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
                        : 'bg-teal-950/80 text-teal-300 border-teal-800/80'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{isAdmin ? 'Admin Console' : isOfficer ? 'Department Officer' : 'Verified Citizen'}</span>
                  </span>
                </div>
              </div>

              {/* Portal Switch Links */}
              <div className="py-1 border-b border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/citizen/dashboard');
                  }}
                  className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
                >
                  Citizen Portal
                </button>
                {(isOfficer || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/department/dashboard');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
                  >
                    Department Operations Portal
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/admin/dashboard');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
                  >
                    Municipal Command Center
                  </button>
                )}
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
