import React, { useState, useMemo } from 'react';
import { Search, Eye, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from '../../config/constants';
import { formatDate } from '../../utils/formatters';

export const DepartmentComplaintsPage: React.FC = () => {
  const { user } = useAuth();
  const { officerComplaints, loading, refreshComplaints } = useComplaints();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'primary' | 'supporting'>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo(() => {
    return officerComplaints.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;

      let matchRole = true;
      if (roleFilter === 'primary') {
        matchRole = c.primaryOfficerId === user?.uid || c.primaryOfficerUid === user?.uid;
      } else if (roleFilter === 'supporting') {
        matchRole = Boolean(
          c.supportingOfficerIds?.includes(user?.uid || '') ||
          c.supportingOfficerUids?.includes(user?.uid || '')
        );
      }

      return matchSearch && matchStatus && matchPriority && matchCategory && matchRole;
    });
  }, [officerComplaints, searchTerm, statusFilter, roleFilter, priorityFilter, categoryFilter, user?.uid]);

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'all' ||
    roleFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Assigned Department Caseload
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complaints allocated to your division for inspection, field execution and resolution.
          </p>
        </div>

        <button
          onClick={() => refreshComplaints()}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#10243B] hover:bg-[#162A45] text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 shadow-2xs transition-all btn-press self-start sm:self-auto touch-target"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0D1B2E] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, keyword..."
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Lifecycle Statuses</option>
              <option value="Assigned">Assigned (New)</option>
              <option value="In Progress">In Progress (Field Active)</option>
              <option value="Resolution Submitted">Resolution Submitted</option>
              <option value="Resolved">Resolved & Closed</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Officer Roles</option>
              <option value="primary">Primary Officer Only</option>
              <option value="supporting">Supporting Officer Only</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Priorities</option>
              {COMPLAINT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p} Priority
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Categories</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary and Clear Trigger */}
        <div className="flex items-center justify-between text-xs pt-1 px-1 border-t border-slate-800/80">
          <span className="text-slate-400 font-medium">
            Showing <strong className="text-white">{filtered.length}</strong> of{' '}
            <strong className="text-white">{officerComplaints.length}</strong> assigned tickets
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Complaint ID</th>
                <th className="px-5 py-3.5">Title & Description</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Officer Assignment</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Reported</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                    <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading department complaints...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                    <p className="text-sm font-bold text-white">No complaints match criteria</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'Try clearing active filters to see all assigned records.'
                        : 'No complaints have been assigned to your department account yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-3 px-4 py-1.5 bg-[#10243B] hover:bg-[#162A45] text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isPrimary = c.primaryOfficerId === user?.uid || c.primaryOfficerUid === user?.uid;
                  return (
                    <tr key={c.id} className="hover:bg-[#10243B]/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-white whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="font-bold text-white line-clamp-1">{c.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.description}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                        {c.category}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 max-w-[140px] truncate">
                        {c.location}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isPrimary ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-700/80">
                            Primary Officer
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10243B] text-slate-300 border border-slate-700">
                            Supporting
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <PriorityBadge priority={c.priority} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/department/complaints/${c.id}`}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-colors btn-press"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Dossier</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout (< lg) */}
      <div className="block lg:hidden space-y-3">
        {loading ? (
          <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-8 text-center text-slate-400">
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading caseload...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-8 text-center text-slate-400">
            <p className="text-sm font-bold text-white">No complaints match criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters to view all assigned records.</p>
          </div>
        ) : (
          filtered.map((c) => {
            const isPrimary = c.primaryOfficerId === user?.uid || c.primaryOfficerUid === user?.uid;
            return (
              <div
                key={c.id}
                className="bg-[#0D1B2E] rounded-2xl border border-slate-800 p-4 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#10243B] text-teal-300 border border-teal-500/30">
                    {c.id}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <PriorityBadge priority={c.priority} size="sm" />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{c.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{c.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400">
                  <span className="truncate max-w-[180px]">{c.location}</span>
                  {isPrimary ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-700/80">
                      Primary Officer
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10243B] text-slate-300 border border-slate-700">
                      Supporting
                    </span>
                  )}
                </div>

                <Link
                  to={`/department/complaints/${c.id}`}
                  className="w-full py-2.5 px-3 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-black transition-colors flex items-center justify-center space-x-1.5 btn-press"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Incident Dossier</span>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
