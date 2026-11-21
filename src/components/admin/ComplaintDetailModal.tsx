import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Complaint, ComplaintHistoryDocument, StatusHistoryEntry } from '../../types/complaint';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { StatusTimeline } from '../common/StatusTimeline';
import { formatDate } from '../../utils/formatters';
import {
  MapPin,
  User,
  Calendar,
  Sparkles,
  Building2,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatusClick: (complaint: Complaint) => void;
  onAssignDeptClick: (complaint: Complaint) => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onUpdateStatusClick,
  onAssignDeptClick,
}) => {
  const { getComplaintHistory, verifyComplaintResolution } = useComplaints();
  const [historyDocs, setHistoryDocs] = useState<ComplaintHistoryDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Verification review states
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (complaint?.id && isOpen) {
      setHistoryLoading(true);
      setShowRejectForm(false);
      setRejectionReason('');
      setVerificationError(null);
      getComplaintHistory(complaint.id)
        .then((res) => setHistoryDocs(res))
        .catch(() => setHistoryDocs([]))
        .finally(() => setHistoryLoading(false));
    } else {
      setHistoryDocs([]);
    }
  }, [complaint?.id, isOpen, getComplaintHistory]);

  if (!complaint) return null;

  const handleApproveResolution = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      await verifyComplaintResolution(complaint.id, true);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setVerificationError(e.message || 'Failed to approve resolution.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setVerificationError('Please provide a specific reason for rejection / rework.');
      return;
    }
    if (isVerifying) return;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      await verifyComplaintResolution(complaint.id, false, rejectionReason.trim());
      setShowRejectForm(false);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setVerificationError(e.message || 'Failed to reject resolution.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Combine Firestore subcollection history or complaint.statusHistory
  const combinedHistory: StatusHistoryEntry[] =
    historyDocs.length > 0
      ? historyDocs.map((h) => ({
          status: h.newStatus,
          timestamp:
            typeof h.timestamp?.toDate === 'function'
              ? h.timestamp.toDate().toISOString()
              : typeof h.timestamp === 'string'
              ? h.timestamp
              : new Date().toISOString(),
          note: h.remarks,
          updatedBy: h.updatedBy,
        }))
      : complaint.statusHistory;

  const isAwaitingVerification = complaint.status === 'Resolution Submitted';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complaint Record: ${complaint.id}`}
      description="Administrative dossier, field officer assignments, and civic resolution verification."
      maxWidth="2xl"
    >
      <div className="space-y-5 text-left max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
        {/* Top Header info */}
        <div className="p-4 sm:p-5 bg-[#071426] rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400">
              Category: <span className="text-white font-bold">{complaint.category}</span>
            </span>
            <div className="flex items-center space-x-2">
              <PriorityBadge priority={complaint.priority} size="sm" />
              <StatusBadge status={complaint.status} size="sm" />
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white">{complaint.title}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate text-slate-300">{complaint.location}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-300">{complaint.userName || 'Citizen'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-300">{formatDate(complaint.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 1. ADMIN VERIFICATION BANNER & CONTROLS */}
        {isAwaitingVerification && (
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Field Resolution Submitted – Verification Required</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Action Required
              </span>
            </div>

            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {verificationError}
              </div>
            )}

            {complaint.resolution && (
              <div className="p-4 rounded-xl bg-[#071426] border border-amber-500/30 text-xs space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Resolution Summary:
                  </span>
                  <p className="text-white font-semibold">{complaint.resolution.summary}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Actions Taken by Field Crew:
                  </span>
                  <p className="text-slate-300 whitespace-pre-wrap">{complaint.resolution.actionsTaken}</p>
                </div>
                {complaint.resolution.evidenceUrl && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Field Resolution Evidence Photo:
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-700 max-h-52">
                      <img
                        src={complaint.resolution.evidenceUrl}
                        alt="Resolution proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between">
                  <span>
                    Submitted by: <strong className="text-teal-300">{complaint.resolution.submittedByName}</strong>
                  </span>
                  <span>{formatDate(complaint.resolution.submittedAt)}</span>
                </div>
              </div>
            )}

            {/* Approval / Rejection Controls */}
            {!showRejectForm ? (
              <div className="pt-1 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 btn-press"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Reject & Request Rework</span>
                </button>
                <button
                  type="button"
                  onClick={handleApproveResolution}
                  disabled={isVerifying}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-extrabold shadow-md transition-all flex items-center space-x-1.5 btn-press"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isVerifying ? 'Approving...' : 'Approve & Mark Resolved'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleRejectResolution} className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
                  <label className="block text-xs font-bold text-rose-200 mb-1">
                    Specific Reason for Rejection / Rework Request:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Photographic evidence does not show complete resurfacing of adjacent pavement cracks."
                    className="w-full p-2.5 rounded-lg bg-[#071426] border border-rose-500/40 text-xs text-white placeholder-slate-500 focus-ring"
                    required
                  />
                  <div className="mt-2.5 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isVerifying ? 'Sending...' : 'Confirm Rejection'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 2. RESOLVED / REJECTED STATUS INFO */}
        {complaint.status === 'Resolved' && complaint.resolution?.approvedBy && (
          <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/30 text-xs flex items-center space-x-2.5 text-teal-300">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>
              Verified and closed by <strong>{complaint.resolution.approvedBy}</strong>
              {complaint.resolution.approvedAt && ` on ${formatDate(complaint.resolution.approvedAt)}`}.
            </span>
          </div>
        )}

        {complaint.resolution?.rejectionReason && (
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Prior Rework Request by {complaint.resolution.rejectedBy || 'Administrator'}:</span>
            </div>
            <p className="text-slate-300 italic">{complaint.resolution.rejectionReason}</p>
          </div>
        )}

        {/* 3. OFFICER ASSIGNMENT DOSSIER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#071426] border border-slate-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-400 font-bold">
              <Building2 className="w-4 h-4" />
              <span>Department & Officer Assignments</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAssignDeptClick(complaint);
              }}
              className="text-[11px] font-bold text-teal-400 hover:text-teal-300 underline"
            >
              Reassign Officers
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-[#10243B]/60 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Division</span>
              <span className="font-bold text-white text-sm block mt-0.5">
                {complaint.assignedDepartment || 'Pending Assignment'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#10243B]/60 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Lead Officer</span>
              {complaint.primaryOfficerName ? (
                <div>
                  <span className="font-bold text-teal-300 text-sm block mt-0.5">
                    {complaint.primaryOfficerName}
                  </span>
                  <span className="text-[10px] text-slate-400">{complaint.primaryOfficerEmail}</span>
                </div>
              ) : (
                <span className="text-slate-400 italic text-xs block mt-0.5">Not assigned yet</span>
              )}
            </div>
          </div>

          {complaint.supportingOfficers && complaint.supportingOfficers.length > 0 && (
            <div className="p-3 rounded-xl bg-[#10243B]/40 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 font-semibold mb-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Supporting Field Officers ({complaint.supportingOfficers.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {complaint.supportingOfficers.map((o) => (
                  <span
                    key={o.uid}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[11px]"
                  >
                    {o.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Citizen Narrative */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Citizen Narrative
          </h4>
          <p className="text-xs sm:text-sm text-slate-200 bg-[#071426] p-4 rounded-2xl border border-slate-800 whitespace-pre-wrap leading-relaxed">
            {complaint.description}
          </p>
        </div>

        {/* 5. AI Triage Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-teal-300 mb-1.5">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>
              {complaint.aiAnalysis?.isFallback
                ? 'Administrative Triage (Standard Fallback)'
                : 'AI Urgency & Triage Assessment'}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            <strong className="text-white">Urgency Justification:</strong> {complaint.urgencyReason}
          </p>
          <div className="mt-3 pt-2.5 border-t border-teal-500/20 flex flex-wrap justify-between gap-2 text-slate-300">
            <span>
              Recommended: <strong className="text-teal-300">{complaint.recommendedDepartment}</strong>
            </span>
            <span>
              Assigned: <strong className="text-white">{complaint.assignedDepartment}</strong>
            </span>
          </div>
        </div>

        {/* 6. Citizen Photo evidence if any */}
        {complaint.imageUrl && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Citizen Photo Evidence
            </h4>
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#071426] max-h-60">
              <img
                src={complaint.imageUrl}
                alt="Complaint evidence"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* 7. Quick Incident Actions */}
        <div className="p-4 bg-[#071426] rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400 font-medium">Quick Incident Actions:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onAssignDeptClick(complaint);
              }}
              className="px-3.5 py-2 bg-[#10243B] hover:bg-[#162A45] text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 btn-press"
            >
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Assign / Reassign</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onUpdateStatusClick(complaint);
              }}
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5 btn-press"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Update Status</span>
            </button>
          </div>
        </div>

        {/* 8. Timeline Log */}
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Real-Time Audit Trail
          </h4>
          {historyLoading ? (
            <p className="text-xs text-slate-400">Loading audit history...</p>
          ) : (
            <StatusTimeline
              history={combinedHistory}
              currentStatus={complaint.status}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
