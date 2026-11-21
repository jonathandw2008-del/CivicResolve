import React, { useState, useMemo } from 'react';
import { Search, Plus, FileQuestion, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useComplaints } from '../../context/ComplaintContext';
import { ComplaintCard } from '../../components/citizen/ComplaintCard';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, COMPLAINT_PRIORITIES } from '../../config/constants';

export const MyComplaintsPage: React.FC = () => {
  const { userComplaints, loading } = useComplaints();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const filteredComplaints = useMemo(() => {
    return userComplaints.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || c.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' || c.status === selectedStatus;

      const matchesPriority =
        selectedPriority === 'all' || c.priority === selectedPriority;

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });
  }, [userComplaints, searchTerm, selectedCategory, selectedStatus, selectedPriority]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Submitted Complaints
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time status updates and department allocations for your civic reports.
          </p>
        </div>

        <Link
          to="/citizen/report"
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-md transition-all btn-press self-start sm:self-auto touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#0D1B2E] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Categories</option>
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Statuses</option>
              {COMPLAINT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              <option value="all">All Priorities</option>
              {COMPLAINT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority} Priority
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary and Clear Trigger */}
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <span className="text-slate-400 font-medium">
            Showing <strong className="text-white">{filteredComplaints.length}</strong> of{' '}
            <strong className="text-white">{userComplaints.length}</strong> complaints
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center shadow-card">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading your complaints from Cloud Firestore...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center shadow-card">
          <div className="w-16 h-16 rounded-3xl bg-[#10243B] text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <FileQuestion className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No complaints found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No complaints match your active filter criteria. Try resetting the filters.'
              : 'You have not submitted any complaints yet.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-[#10243B] hover:bg-[#162A45] text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Clear All Filters
            </button>
          ) : (
            <Link
              to="/citizen/report"
              className="mt-4 inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-bold shadow-sm transition-all btn-press"
            >
              <Plus className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComplaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
};
