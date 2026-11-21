import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Complaint } from '../../types/complaint';
import { Department, DepartmentOfficer } from '../../types/department';
import { CIVIC_DEPARTMENTS } from '../../config/constants';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { departmentService } from '../../services/departmentService';
import { Sparkles, Check, Building2, User, Users, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AssignDepartmentModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignDepartmentModal: React.FC<AssignDepartmentModalProps> = ({
  complaint,
  isOpen,
  onClose,
}) => {
  const { assignComplaintDepartment, assignOfficers } = useComplaints();
  const { user } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptName, setSelectedDeptName] = useState<string>(
    complaint?.recommendedDepartment || complaint?.assignedDepartment || CIVIC_DEPARTMENTS[0]
  );
  const [primaryOfficerUid, setPrimaryOfficerUid] = useState<string>('');
  const [supportingOfficerUids, setSupportingOfficerUids] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to departments & officers
  useEffect(() => {
    const unsub = departmentService.subscribeDepartments((deptList) => {
      setDepartments(deptList);
    });
    return () => unsub();
  }, []);

  // When complaint changes or modal opens, initialize state
  useEffect(() => {
    if (complaint && isOpen) {
      const initialDept = complaint.recommendedDepartment || complaint.assignedDepartment || CIVIC_DEPARTMENTS[0];
      setSelectedDeptName(initialDept);
      setPrimaryOfficerUid(complaint.primaryOfficerId || '');
      setSupportingOfficerUids(complaint.supportingOfficerIds || []);
      setNote('');
      setError(null);
    }
  }, [complaint, isOpen]);

  // Find active department object and its officers
  const activeDept = departments.find(
    (d) => d.name.toLowerCase() === selectedDeptName.toLowerCase() || d.id === selectedDeptName
  );
  const departmentOfficers: DepartmentOfficer[] = activeDept?.officers || [];

  // When active department changes, adjust selected primary officer if not in department
  useEffect(() => {
    if (departmentOfficers.length > 0) {
      const exists = departmentOfficers.some((o) => o.uid === primaryOfficerUid);
      if (!exists && !complaint?.primaryOfficerId) {
        setPrimaryOfficerUid(departmentOfficers[0].uid);
      }
    } else {
      setPrimaryOfficerUid('');
      setSupportingOfficerUids([]);
    }
  }, [selectedDeptName, departmentOfficers, primaryOfficerUid, complaint?.primaryOfficerId]);

  if (!complaint) return null;

  const handleToggleSupportingOfficer = (uid: string) => {
    if (supportingOfficerUids.includes(uid)) {
      setSupportingOfficerUids(supportingOfficerUids.filter((id) => id !== uid));
    } else {
      setSupportingOfficerUids([...supportingOfficerUids, uid]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const isReassignment = Boolean(complaint.assignedDepartment && complaint.assignedDepartment !== 'Pending Assignment');
      const assignedByName = user?.name ? `${user.name} (Admin)` : 'Municipal Administrator';

      if (primaryOfficerUid) {
        const primaryOfficerObj = departmentOfficers.find((o) => o.uid === primaryOfficerUid);
        if (!primaryOfficerObj) {
          throw new Error('Selected primary officer is not valid for this department.');
        }

        const supportingOfficerObjs = departmentOfficers
          .filter((o) => supportingOfficerUids.includes(o.uid) && o.uid !== primaryOfficerUid)
          .map((o) => ({
            uid: o.uid,
            name: o.name || o.fullName || o.email,
            email: o.email,
          }));

        await assignOfficers(complaint.id, {
          department: activeDept ? activeDept.name : selectedDeptName,
          departmentId: activeDept?.id,
          primaryOfficer: {
            uid: primaryOfficerObj.uid,
            name: primaryOfficerObj.name || primaryOfficerObj.fullName || primaryOfficerObj.email,
            email: primaryOfficerObj.email,
          },
          supportingOfficers: supportingOfficerObjs,
          remarks: note.trim() || (isReassignment ? `Reassigned to ${selectedDeptName}` : `Assigned to ${selectedDeptName}`),
          assignedBy: assignedByName,
        });
      } else {
        // Fallback if department has no registered officers yet
        await assignComplaintDepartment(complaint.id, selectedDeptName, note);
      }

      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to assign department in Cloud Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRecommended = complaint.recommendedDepartment && selectedDeptName === complaint.recommendedDepartment;
  const isCurrentlyAssigned = Boolean(complaint.assignedDepartment && complaint.assignedDepartment !== 'Pending Assignment');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isCurrentlyAssigned ? 'Reassign' : 'Assign'} Department & Officers: ${complaint.id}`}
      description="Route this civic complaint to the designated municipal division and assign field officers."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Assignment History / Status */}
        {isCurrentlyAssigned && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
            <span className="font-bold text-amber-300 block mb-1">Current Assignment Status:</span>
            <div className="text-slate-300 space-y-0.5 text-[11px]">
              <p>
                Division: <strong className="text-white">{complaint.assignedDepartment}</strong>
              </p>
              {complaint.primaryOfficerName && (
                <p>
                  Primary Officer: <strong className="text-teal-300">{complaint.primaryOfficerName}</strong> ({complaint.primaryOfficerEmail})
                </p>
              )}
              {complaint.supportingOfficers && complaint.supportingOfficers.length > 0 && (
                <p>
                  Supporting Officers: <span className="text-slate-200">{complaint.supportingOfficers.map((o) => o.name).join(', ')}</span>
                </p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-amber-400 font-medium">
              * Reassigning will record a formal audit entry and notify the new primary officer.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Complaint Summary
          </label>
          <p className="text-xs font-semibold text-slate-200 bg-[#071426] p-3 rounded-xl border border-slate-700">
            {complaint.title}
          </p>
        </div>

        {/* AI Recommendation Banner with 1-click select */}
        <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-teal-200 block">AI Recommended Department:</span>
              <span className="text-teal-300 font-extrabold text-sm">{complaint.recommendedDepartment}</span>
            </div>
          </div>
          {complaint.recommendedDepartment && !isRecommended && (
            <button
              type="button"
              onClick={() => setSelectedDeptName(complaint.recommendedDepartment)}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-black shadow-2xs transition-colors whitespace-nowrap btn-press self-start sm:self-auto"
            >
              Match Recommended
            </button>
          )}
          {isRecommended && (
            <span className="inline-flex items-center space-x-1 text-teal-300 font-bold text-xs bg-teal-900/50 border border-teal-500/40 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5" />
              <span>Matched</span>
            </span>
          )}
        </div>

        {/* Department Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Designated Division
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <select
              value={selectedDeptName}
              onChange={(e) => setSelectedDeptName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white"
            >
              {departments.length > 0
                ? departments.map((dept) => (
                    <option key={dept.id} value={dept.name} className="bg-[#071426] text-white">
                      {dept.name} ({dept.code})
                    </option>
                  ))
                : CIVIC_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-[#071426] text-white">
                      {dept}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Primary Officer Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span>Primary Lead Officer (Required for Officer Portal)</span>
            </span>
            <span className="text-[10px] text-teal-400 font-normal">Exactly 1 Officer</span>
          </label>

          {departmentOfficers.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl p-2 bg-[#071426] border border-slate-700 scrollbar-thin">
              {departmentOfficers.map((officer) => {
                const isSelected = primaryOfficerUid === officer.uid;
                return (
                  <label
                    key={officer.uid}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-950/60 border-teal-500/50 text-white shadow-2xs'
                        : 'bg-[#10243B]/40 border-slate-800 text-slate-300 hover:bg-[#10243B]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <input
                        type="radio"
                        name="primaryOfficer"
                        checked={isSelected}
                        onChange={() => {
                          setPrimaryOfficerUid(officer.uid);
                          // Ensure primary officer is removed from supporting list
                          setSupportingOfficerUids(supportingOfficerUids.filter((id) => id !== officer.uid));
                        }}
                        className="text-teal-500 focus:ring-teal-400 bg-slate-900 border-slate-700"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-white truncate">{officer.name || officer.fullName || officer.email}</p>
                        <p className="text-[10px] text-slate-400 truncate">{officer.email}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 flex-shrink-0">
                        Primary Lead
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <p className="text-slate-300 font-medium">No officers registered under this division yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                You can still assign the department division, or enroll officers in{' '}
                <Link to="/admin/departments" onClick={onClose} className="text-teal-400 underline font-bold">
                  Admin Departments
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        {/* Supporting Officers (Optional Multi-Select) */}
        {departmentOfficers.length > 1 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Supporting Officers (Optional)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Can log work notes & evidence</span>
            </label>
            <div className="space-y-2 max-h-36 overflow-y-auto rounded-xl p-2 bg-[#071426] border border-slate-700 scrollbar-thin">
              {departmentOfficers
                .filter((o) => o.uid !== primaryOfficerUid)
                .map((officer) => {
                  const isChecked = supportingOfficerUids.includes(officer.uid);
                  return (
                    <label
                      key={officer.uid}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-blue-950/40 border-blue-500/40 text-white'
                          : 'bg-[#10243B]/30 border-slate-800 text-slate-300 hover:bg-[#10243B]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSupportingOfficer(officer.uid)}
                          className="text-teal-500 rounded focus:ring-teal-400 bg-slate-900 border-slate-700"
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">{officer.name || officer.fullName || officer.email}</p>
                          <p className="text-[10px] text-slate-400 truncate">{officer.email}</p>
                        </div>
                      </div>
                      {isChecked && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                          Supporting
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>
          </div>
        )}

        {/* Administrative Note */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Administrative Dispatch / Reassignment Note
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Assigned to Officer Ramanathan for immediate pothole inspection and patch resurfacing."
            className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
          />
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#10243B] rounded-xl transition-colors touch-target"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-navy-950 text-xs font-extrabold rounded-xl shadow-sm transition-all btn-press touch-target"
          >
            {isSubmitting
              ? 'Dispatching...'
              : isCurrentlyAssigned
              ? 'Confirm Reassignment'
              : 'Dispatch to Department'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
