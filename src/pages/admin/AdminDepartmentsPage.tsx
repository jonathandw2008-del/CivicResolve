import React, { useState, useEffect } from 'react';
import {
  Building2,
  UserPlus,
  Trash2,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import { departmentService } from '../../services/departmentService';
import { searchRegisteredUsers } from '../../services/userService';
import { Department, DepartmentOfficer } from '../../types/department';
import { UserDocument } from '../../types/user';
import { Modal } from '../../components/common/Modal';

export const AdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Add officer modal
  const [isAddOfficerModalOpen, setIsAddOfficerModalOpen] = useState(false);
  const [targetDeptForOfficer, setTargetDeptForOfficer] = useState<Department | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserDocument[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<UserDocument | null>(null);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create department modal
  const [isCreateDeptModalOpen, setIsCreateDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await departmentService.getAllDepartments();
      setDepartments(data);
    } catch (err: any) {
      console.warn('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Search users for officer assignment
  useEffect(() => {
    if (!userSearchTerm.trim() || userSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchRegisteredUsers(userSearchTerm);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  const handleOpenAddOfficer = (dept: Department) => {
    setTargetDeptForOfficer(dept);
    setUserSearchTerm('');
    setSearchResults([]);
    setSelectedUserToAdd(null);
    setFeedback(null);
    setIsAddOfficerModalOpen(true);
  };

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeptForOfficer || !selectedUserToAdd || assigning) return;

    setAssigning(true);
    setFeedback(null);
    try {
      await departmentService.addOfficerToDepartment(
        targetDeptForOfficer.id,
        targetDeptForOfficer.name,
        {
          uid: selectedUserToAdd.uid,
          name: selectedUserToAdd.fullName,
          email: selectedUserToAdd.email,
        }
      );
      setFeedback({
        type: 'success',
        message: `Successfully assigned ${selectedUserToAdd.fullName} to ${targetDeptForOfficer.name}.`,
      });
      await fetchDepartments();
      setTimeout(() => {
        setIsAddOfficerModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to assign officer.' });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveOfficer = async (deptId: string, officer: DepartmentOfficer) => {
    if (!confirm(`Are you sure you want to remove ${officer.name} from this department?`)) return;
    try {
      await departmentService.removeOfficerFromDepartment(deptId, officer.uid);
      await fetchDepartments();
    } catch (err: any) {
      alert(`Could not remove officer: ${err.message || err}`);
    }
  };

  const handleToggleOfficerActive = async (officerUid: string, currentActive: boolean) => {
    try {
      await departmentService.toggleOfficerActive(officerUid, !currentActive);
      setDepartments((prev) =>
        prev.map((d) => ({
          ...d,
          officers: d.officers?.map((o) =>
            o.uid === officerUid ? { ...o, active: !currentActive } : o
          ),
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle officer status.');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim() || creatingDept) return;

    setCreatingDept(true);
    try {
      await departmentService.createDepartment({
        id: deptCode.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        description: deptDescription.trim(),
      });
      setDeptName('');
      setDeptCode('');
      setDeptDescription('');
      setIsCreateDeptModalOpen(false);
      await fetchDepartments();
    } catch (err: any) {
      alert(`Failed to create department: ${err.message || err}`);
    } finally {
      setCreatingDept(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Municipal Department & Officer Administration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage city divisions, configure departments and assign registered personnel to engineering field units.
          </p>
        </div>

        <button
          onClick={() => setIsCreateDeptModalOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-md transition-all btn-press self-start sm:self-auto touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>Create Department</span>
        </button>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Synchronizing municipal departments from Cloud Firestore...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No departments found</h3>
          <p className="text-xs text-slate-400 mt-1">Initialize default civic departments or create a new division.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-6 shadow-card space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {dept.code}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{dept.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{dept.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddOfficer(dept)}
                  className="px-3 py-1.5 bg-[#10243B] hover:bg-[#162A45] text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 whitespace-nowrap btn-press flex-shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 text-teal-400" />
                  <span>Add Officer</span>
                </button>
              </div>

              {/* Officers Section */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Assigned Field Officers ({dept.officers?.length || 0})
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Dept ID: {dept.id}
                  </span>
                </div>

                {(!dept.officers || dept.officers.length === 0) ? (
                  <div className="p-4 bg-[#071426] rounded-2xl border border-slate-800 text-center">
                    <p className="text-xs text-slate-400">No officers assigned yet.</p>
                    <button
                      onClick={() => handleOpenAddOfficer(dept)}
                      className="mt-2 text-xs text-teal-400 hover:text-teal-300 font-bold underline"
                    >
                      Assign an authenticated registered user
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dept.officers.map((off) => (
                      <div
                        key={off.uid}
                        className="p-3 bg-[#071426] rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {off.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{off.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{off.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleOfficerActive(off.uid, off.active)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                              off.active
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                                : 'bg-amber-950/70 text-amber-300 border-amber-500/40 hover:bg-amber-900/80'
                            }`}
                            title={off.active ? 'Click to deactivate officer access' : 'Click to activate officer access'}
                          >
                            {off.active ? 'Active' : 'Deactivated'}
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-[#10243B] border border-slate-700/60 hidden sm:inline-block">
                            UID: {off.uid.substring(0, 6)}...
                          </span>
                          <button
                            onClick={() => handleRemoveOfficer(dept.id, off)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remove from Department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Officer Modal (Real Registered User Search) */}
      <Modal
        isOpen={isAddOfficerModalOpen}
        onClose={() => setIsAddOfficerModalOpen(false)}
        title={`Assign Officer: ${targetDeptForOfficer?.name}`}
        description="Search real registered users in Cloud Firestore to assign them as a verified Department Officer."
      >
        <form onSubmit={handleAssignOfficer} className="space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-teal-950/60 text-teal-300 border border-teal-500/40'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Search Registered Users (Name, Email or UID)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Type registered citizen email e.g. officer@city.gov..."
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Note: Officers must be registered accounts in CivicResolve. Fake or unregistered accounts cannot be assigned.
            </p>
          </div>

          {/* User Results List */}
          {searching ? (
            <p className="text-xs text-slate-400">Searching user accounts in Cloud Firestore...</p>
          ) : searchResults.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[#071426] rounded-xl border border-slate-800">
              {searchResults.map((u) => {
                const isSelected = selectedUserToAdd?.uid === u.uid;
                return (
                  <button
                    type="button"
                    key={u.uid}
                    onClick={() => setSelectedUserToAdd(u)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-teal-950/60 border-teal-500/60 text-white'
                        : 'bg-[#10243B]/60 border-slate-800 text-slate-300 hover:bg-[#10243B]'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="font-bold text-white truncate">{u.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : userSearchTerm.length >= 2 ? (
            <p className="text-xs text-slate-400">No registered users matched "{userSearchTerm}".</p>
          ) : null}

          {selectedUserToAdd && (
            <div className="p-3 bg-teal-950/40 rounded-xl border border-teal-500/30 text-xs">
              <span className="font-bold text-teal-300 block">Selected User for Officer Assignment:</span>
              <p className="text-white font-semibold mt-0.5">{selectedUserToAdd.fullName} ({selectedUserToAdd.email})</p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddOfficerModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#10243B] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || !selectedUserToAdd}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-navy-950 text-xs font-extrabold rounded-xl transition-all btn-press shadow-glow-teal/20"
            >
              {assigning ? 'Assigning...' : 'Confirm Officer Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Department Modal */}
      <Modal
        isOpen={isCreateDeptModalOpen}
        onClose={() => setIsCreateDeptModalOpen(false)}
        title="Create Municipal Department"
        description="Establish a new municipal administrative division or engineering unit."
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Department Name
            </label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Urban Parks & Forestry Management"
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Department Acronym / Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              placeholder="e.g. UPFM"
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white uppercase placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Mission / Civic Scope Description
            </label>
            <textarea
              rows={3}
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
              placeholder="Scope of civic responsibilities and jurisdiction..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsCreateDeptModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#10243B] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingDept || !deptName.trim() || !deptCode.trim()}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-extrabold rounded-xl transition-all btn-press shadow-glow-teal/20"
            >
              {creatingDept ? 'Creating...' : 'Create Division'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
