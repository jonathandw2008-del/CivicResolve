import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Building2,
  RefreshCw,
  Eye,
  AlertCircle,
  FileQuestion,
  X,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../../types/complaint';
import { PriorityBadge, StatusBadge, DepartmentBadge } from '../../components/common/Badge';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, COMPLAINT_PRIORITIES, CIVIC_DEPARTMENTS } from '../../config/constants';
import { formatDate } from '../../utils/formatters';
import { StatusUpdateModal } from '../../components/admin/StatusUpdateModal';
import { AssignDepartmentModal } from '../../components/admin/AssignDepartmentModal';
import { ComplaintDetailModal } from '../../components/admin/ComplaintDetailModal';

export const AdminComplaintsPage: React.FC = () => {
  const { complaints, refreshComplaints, loading, error } = useComplaints();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [detailModalComplaint, setDetailModalComplaint] = useState<Complaint | null>(null);
  const [statusModalComplaint, setStatusModalComplaint] = useState<Complaint | null>(null);
  const [assignModalComplaint, setAssignModalComplaint] = useState<Complaint | null>(null);

  // Filtered and Sorted list
  const filteredAndSorted = useMemo(() => {
    let list = complaints.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.userName && c.userName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      const matchDept = departmentFilter === 'all' || c.assignedDepartment === departmentFilter;

      return matchSearch && matchCategory && matchStatus && matchPriority && matchDept;
    });

    list.sort((a, b) => {
      if (sortBy === 'date') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      if (sortBy === 'priority') {
        const rank: Record<ComplaintPriority, number> = {
          Critical: 4,
          High: 3,
          Medium: 2,
          Low: 1,
        };
        const rA = rank[a.priority];
        const rB = rank[b.priority];
        return sortOrder === 'desc' ? rB - rA : rA - rB;
      }
      if (sortBy === 'status') {
        const rank: Record<ComplaintStatus, number> = {
          Reported: 1,
          Acknowledged: 2,
          'Under Review': 2,
          Assigned: 2,
          'In Progress': 3,
          'Resolution Submitted': 3,
          Resolved: 4,
        };
        const rA = rank[a.status] || 0;
        const rB = rank[b.status] || 0;
        return sortOrder === 'desc' ? rB - rA : rA - rB;
      }
      return 0;
    });

    return list;
  }, [
    complaints,
    searchTerm,
    categoryFilter,
    statusFilter,
    priorityFilter,
    departmentFilter,
    sortBy,
    sortOrder,
  ]);

  const toggleSort = (column: 'date' | 'priority' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDepartmentFilter('all');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    departmentFilter !== 'all';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Municipal Complaint Registry
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete administrative complaint inventory, triage status controls, and inter-departmental delegation.
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

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Cloud Firestore Sync Notice</p>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
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

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Statuses</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Departments</option>
              {CIVIC_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Count and Reset Button */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>
            Showing <strong className="text-white">{filteredAndSorted.length}</strong> of{' '}
            <strong className="text-white">{complaints.length}</strong> total records
          </span>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Card Layout (< lg viewports) */}
      <div className="block lg:hidden space-y-4">
        {loading ? (
          <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center shadow-card">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs font-semibold text-slate-400">Synchronizing live municipal records...</span>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-8 text-center shadow-card">
            <p className="text-sm font-bold text-white">No complaints found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters to view all records.</p>
          </div>
        ) : (
          filteredAndSorted.map((c) => (
            <div
              key={c.id}
              className="bg-[#0D1B2E] rounded-2xl border border-slate-800 p-5 shadow-card space-y-3"
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

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Location</span>
                  <span className="font-medium text-slate-300 truncate block">{c.location}</span>
                </div>
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Department</span>
                  <span className="font-medium text-slate-300 truncate block">{c.assignedDepartment}</span>
                </div>
              </div>

              {/* Action Buttons for Mobile */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setDetailModalComplaint(c)}
                  className="flex-1 py-2 px-3 bg-[#10243B] hover:bg-[#162A45] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1 touch-target border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Dossier</span>
                </button>
                <button
                  onClick={() => setAssignModalComplaint(c)}
                  className="flex-1 py-2 px-3 bg-[#10243B] hover:bg-[#162A45] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1 touch-target border border-slate-700"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </button>
                <button
                  onClick={() => setStatusModalComplaint(c)}
                  className="flex-1 py-2 px-3 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-black shadow-2xs transition-colors flex items-center justify-center touch-target"
                >
                  <span>Update</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Admin Complaints Desktop Table (lg+ viewports) */}
      <div className="hidden lg:block bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071426] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Complaint ID</th>
                <th className="px-5 py-3.5">Title & Description</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Location</th>
                <th
                  onClick={() => toggleSort('priority')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-[#10243B] transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-5 py-3.5">Assigned Department</th>
                <th
                  onClick={() => toggleSort('status')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-[#10243B] transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-[#10243B] transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Reported</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Synchronizing live municipal records from Cloud Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#10243B] text-slate-400 flex items-center justify-center mb-1 border border-slate-700">
                        <FileQuestion className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-white">No complaints found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {hasActiveFilters
                          ? 'No civic issues match your current filter selection. Try resetting filters.'
                          : 'No civic complaints have been recorded in Cloud Firestore yet.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="mt-2 px-4 py-2 bg-[#10243B] hover:bg-[#162A45] text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          Clear Active Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((c) => (
                  <tr key={c.id} className="hover:bg-[#10243B]/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-white whitespace-nowrap">
                      {c.id}
                    </td>

                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="font-bold text-white line-clamp-1">{c.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {c.description}
                      </p>
                    </td>

                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                      {c.category}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 max-w-[150px] truncate">
                      {c.location}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>

                    <td className="px-5 py-3.5">
                      <DepartmentBadge department={c.assignedDepartment} />
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {formatDate(c.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setDetailModalComplaint(c)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-[#10243B] rounded-lg transition-colors"
                        title="View Full Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setAssignModalComplaint(c)}
                        className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-[#10243B] rounded-lg transition-colors"
                        title="Assign Department"
                      >
                        <Building2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setStatusModalComplaint(c)}
                        className="px-3 py-1 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 rounded-lg text-xs font-bold transition-colors btn-press"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ComplaintDetailModal
        complaint={detailModalComplaint}
        isOpen={Boolean(detailModalComplaint)}
        onClose={() => setDetailModalComplaint(null)}
        onUpdateStatusClick={(c) => setStatusModalComplaint(c)}
        onAssignDeptClick={(c) => setAssignModalComplaint(c)}
      />

      <StatusUpdateModal
        complaint={statusModalComplaint}
        isOpen={Boolean(statusModalComplaint)}
        onClose={() => setStatusModalComplaint(null)}
      />

      <AssignDepartmentModal
        complaint={assignModalComplaint}
        isOpen={Boolean(assignModalComplaint)}
        onClose={() => setAssignModalComplaint(null)}
      />
    </div>
  );
};
