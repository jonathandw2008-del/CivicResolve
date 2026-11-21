import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  BarChart3,
  Shield,
  Layers,
  RotateCcw,
  UserCheck,
  Building,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useComplaints } from '../../context/ComplaintContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, isOfficer, logout } = useAuth();
  const { resetSampleData } = useComplaints();
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrentlyInAdmin = location.pathname.startsWith('/admin');
  const isCurrentlyInDepartment = location.pathname.startsWith('/department');

  const citizenNavItems: NavItem[] = [
    { name: 'Citizen Dashboard', to: '/citizen/dashboard', icon: LayoutDashboard },
    { name: 'Report an Issue', to: '/citizen/report', icon: FilePlus2, highlight: true },
    { name: 'My Complaints', to: '/citizen/complaints', icon: FileText },
  ];

  const departmentNavItems: NavItem[] = [
    { name: 'Officer Dashboard', to: '/department/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Complaints', to: '/department/complaints', icon: Layers },
    { name: 'Department Team', to: '/department/team', icon: UserCheck },
  ];

  const adminNavItems: NavItem[] = [
    { name: 'Command Center', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Complaint Desk', to: '/admin/complaints', icon: Layers },
    { name: 'Departments & Officers', to: '/admin/departments', icon: Building },
    { name: 'City Analytics', to: '/admin/analytics', icon: BarChart3 },
  ];

  const navItems = isCurrentlyInDepartment
    ? departmentNavItems
    : isCurrentlyInAdmin
    ? adminNavItems
    : citizenNavItems;

  const handlePortalSwitch = (target: 'citizen' | 'admin' | 'department') => {
    if (target === 'citizen') {
      navigate('/citizen/dashboard');
    } else if (target === 'department') {
      navigate('/department/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/70 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#071426] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 shadow-2xl',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center border-b border-slate-800/80 bg-[#0D1B2E]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
              <Shield className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">CivicResolve</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {isAdmin ? 'ADMIN' : isOfficer ? 'OFFICER' : 'CITIZEN'}
                </span>
              </div>
              <p className="text-[10px] text-teal-400/80 font-medium tracking-wide">Report. Resolve. Rebuild.</p>
            </div>
          </div>
        </div>

        {/* Portal Switcher Banner */}
        <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-[#0D1B2E] border border-slate-800 text-xs shadow-inner">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Console
            </span>
            <span className="text-[10px] bg-teal-950 text-teal-300 font-mono px-2 py-0.5 rounded-full border border-teal-800/80">
              {isCurrentlyInDepartment ? 'Department' : isCurrentlyInAdmin ? 'Municipal' : 'Citizen'}
            </span>
          </div>
          <div className={`grid ${isAdmin || isOfficer ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 bg-[#071426] rounded-lg border border-slate-800`}>
            <button
              type="button"
              onClick={() => handlePortalSwitch('citizen')}
              className={cn(
                'py-1.5 px-1.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all text-center btn-press',
                !isCurrentlyInAdmin && !isCurrentlyInDepartment
                  ? 'bg-teal-500 text-navy-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Citizen
            </button>
            {(isOfficer || isAdmin) && (
              <button
                type="button"
                onClick={() => handlePortalSwitch('department')}
                className={cn(
                  'py-1.5 px-1.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all text-center btn-press',
                  isCurrentlyInDepartment
                    ? 'bg-teal-500 text-navy-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Officer
              </button>
            )}
            <button
              type="button"
              onClick={() => handlePortalSwitch('admin')}
              className={cn(
                'py-1.5 px-1.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all text-center btn-press',
                isCurrentlyInAdmin
                  ? 'bg-teal-500 text-navy-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isCurrentlyInDepartment ? 'DEPARTMENT OPERATIONS' : isCurrentlyInAdmin ? 'MUNICIPAL OPERATIONS' : 'CITIZEN SERVICES'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group touch-target',
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 border-l-4 border-teal-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80',
                    item.highlight && !isActive && 'text-teal-400 font-bold'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.highlight && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Area with Reset Sample Data and User Card */}
        <div className="p-3 border-t border-slate-800 bg-navy-950/90 space-y-2">
          <button
            onClick={() => {
              if (confirm('Reset complaints to default civic demonstration dataset?')) {
                resetSampleData();
              }
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl border border-slate-800 transition-colors btn-press"
            title="Reload initial seed records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Records</span>
          </button>

          <div className="pt-2 flex items-center justify-between px-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 flex-shrink-0 text-xs font-bold shadow-2xs">
                {isAdmin ? <Building className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.name || user?.email || 'User'}</p>
                <p className="text-[10px] text-teal-400 truncate font-mono">
                  {isAdmin ? 'Custom Claim: Admin' : 'Citizen'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-lg touch-target flex items-center justify-center"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
