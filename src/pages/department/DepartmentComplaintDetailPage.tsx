import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  Sparkles,
  UserCheck,
  Send,
  FileText,
  AlertOctagon,
  Image as ImageIcon,
  Clock,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { StatusTimeline } from '../../components/common/StatusTimeline';
import { formatDate } from '../../utils/formatters';
import { Complaint, ComplaintHistoryDocument, StatusHistoryEntry } from '../../types/complaint';
import { isSafeImageUrl } from '../../utils/security';
import { Modal } from '../../components/common/Modal';
import { firestoreComplaintService } from '../../services/firestoreComplaintService';

export const DepartmentComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const {
    getComplaint,
    getComplaintHistory,
    acceptComplaintAssignment,
    submitComplaintWorkNote,
    submitComplaintResolution,
  } = useComplaints();

  const [historyDocs, setHistoryDocs] = useState<ComplaintHistoryDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);

  // Form states
  const [workNote, setWorkNote] = useState('');
  const [noteEvidenceUrl, setNoteEvidenceUrl] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionActions, setResolutionActions] = useState('');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [directComplaint, setDirectComplaint] = useState<Complaint | null>(null);
  const [fetchingDirect, setFetchingDirect] = useState(false);

  const contextComplaint = id ? getComplaint(id) : undefined;
  const complaint = contextComplaint || directComplaint;

  useEffect(() => {
    if (id && !contextComplaint && !directComplaint && !fetchingDirect) {
      setFetchingDirect(true);
      firestoreComplaintService
        .getComplaintById(id)
        .then((res) => {
          if (res) setDirectComplaint(res);
        })
        .finally(() => {
          setFetchingDirect(false);
        });
    }
  }, [id, contextComplaint, directComplaint, fetchingDirect]);

  const loadHistory = async (targetId: string) => {
    setHistoryLoading(true);
    try {
      const res = await getComplaintHistory(targetId);
      setHistoryDocs(res);
    } catch (err) {
      console.warn('Failed to fetch complaint history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadHistory(id);
    }
  }, [id, getComplaintHistory]);

  if (!complaint) {
    return (
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center max-w-md mx-auto my-8 shadow-card">
        <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Complaint Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">
          Complaint "{id}" was not found or is not allocated to your department unit.
        </p>
        <button
          onClick={() => navigate('/department/complaints')}
          className="mt-5 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-bold transition-colors btn-press"
        >
          Return to Department Caseload
        </button>
      </div>
    );
  }

  const isPrimaryOfficer = Boolean(
    complaint.primaryOfficerId === user?.uid || complaint.primaryOfficerUid === user?.uid
  );
  const isSupportingOfficer = Boolean(
    complaint.supportingOfficerIds?.includes(user?.uid || '') ||
    complaint.supportingOfficerUids?.includes(user?.uid || '')
  );
  const canAccept = (complaint.status === 'Assigned') && (isPrimaryOfficer || isSupportingOfficer || isAdmin);
  const canAddNote = (isPrimaryOfficer || isSupportingOfficer || isAdmin) && complaint.status !== 'Resolved';
  const canSubmitResolution = (isPrimaryOfficer || isAdmin) && complaint.status === 'In Progress';

  const handleAccept = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await acceptComplaintAssignment(id);
      await loadHistory(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept assignment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWorkNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || actionLoading || !workNote.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await submitComplaintWorkNote(id, workNote.trim(), noteEvidenceUrl.trim() || undefined);
      setWorkNote('');
      setNoteEvidenceUrl('');
      setIsNoteModalOpen(false);
      await loadHistory(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add work note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || actionLoading || !resolutionSummary.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await submitComplaintResolution(
        id,
        resolutionSummary.trim(),
        resolutionActions.trim() || 'Field repair completed per municipal standards.',
        resolutionEvidenceUrl.trim() || undefined
      );
      setResolutionSummary('');
      setResolutionActions('');
      setResolutionEvidenceUrl('');
      setIsResolutionModalOpen(false);
      await loadHistory(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit resolution');
    } finally {
      setActionLoading(false);
    }
  };

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
          evidenceUrl: h.evidenceUrl,
        }))
      : complaint.statusHistory;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Back button */}
      <div>
        <Link
          to="/department/complaints"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Assigned Caseload</span>
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-white">Action Denied</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
        </div>
      )}

      {/* Main Dossier Card */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        {/* Header Bar */}
        <div className="p-6 sm:p-8 border-b border-slate-800 bg-[#071426]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs sm:text-sm font-bold px-3 py-1 bg-[#10243B] text-teal-300 border border-teal-500/30 rounded-xl">
                {complaint.id || complaint.complaintId}
              </span>
              <span className="text-xs font-bold text-slate-300 bg-[#10243B] px-2.5 py-1 rounded-lg border border-slate-700">
                {complaint.category}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
            {complaint.title}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-200">{complaint.location}</span>
            </div>
            {complaint.ward && (
              <div className="flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-slate-300">{complaint.ward}</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300">Reported on {formatDate(complaint.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Officer Assignment Banner */}
          <div className="p-4 rounded-2xl bg-[#071426] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Officer Assignment Roster
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-xl bg-teal-950/60 text-teal-300 border border-teal-500/40 font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Primary Officer: {complaint.primaryOfficerName || 'Not designated'}</span>
                  {isPrimaryOfficer && <span className="text-[10px] bg-teal-500 text-navy-950 px-1.5 py-0.2 rounded font-black">YOU</span>}
                </span>

                {complaint.supportingOfficers && complaint.supportingOfficers.length > 0 && (
                  <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-xl bg-[#10243B] text-slate-300 border border-slate-700 font-medium">
                    <span>Supporting: {complaint.supportingOfficers.map((o) => o.name).join(', ')}</span>
                    {isSupportingOfficer && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-bold">YOU</span>}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {canAccept && (
                <button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-black transition-all btn-press shadow-glow-teal/20"
                >
                  {actionLoading ? 'Accepting...' : 'Accept & Begin Work'}
                </button>
              )}

              {canAddNote && (
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="px-3.5 py-2 bg-[#10243B] hover:bg-[#162A45] text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors btn-press flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Add Note & Evidence</span>
                </button>
              )}

              {canSubmitResolution && (
                <button
                  onClick={() => setIsResolutionModalOpen(true)}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-black transition-all btn-press shadow-glow-teal/20 flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Resolution</span>
                </button>
              )}
            </div>
          </div>

          {/* Supporting Officer Resolution Restriction Notice */}
          {isSupportingOfficer && !isPrimaryOfficer && complaint.status === 'In Progress' && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Supporting Officer Guidance:</span> You can contribute progress notes and photographic evidence. In accordance with municipal protocol, only Primary Officer <strong>{complaint.primaryOfficerName}</strong> may submit the final ticket resolution.
              </div>
            </div>
          )}

          {/* Resolution Awaiting Verification Alert */}
          {complaint.status === 'Resolution Submitted' && (
            <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-purple-300 font-extrabold text-sm">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Resolution Submitted — Awaiting Municipal Admin Verification</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                The resolution dossier has been transmitted to city administrators for review and closure.
              </p>
              {complaint.resolution && (
                <div className="mt-3 p-3 bg-[#071426] rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                  <p><strong>Summary:</strong> {complaint.resolution.summary}</p>
                  <p><strong>Actions Taken:</strong> {complaint.resolution.actionsTaken}</p>
                  {complaint.resolution.evidenceUrl && isSafeImageUrl(complaint.resolution.evidenceUrl) && (
                    <div className="mt-2">
                      <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Resolution Evidence Photo:</p>
                      <img
                        src={complaint.resolution.evidenceUrl}
                        alt="Resolution evidence"
                        className="max-h-48 rounded-lg border border-slate-800 object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Citizen Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Citizen Narrative
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#071426] p-4 rounded-2xl border border-slate-800 whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* AI Triage & Urgency Assessment */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 to-blue-950/30 border border-teal-500/30 shadow-2xs">
            <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs tracking-wide uppercase mb-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>CivicResolve AI Triage Assessment</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">AI Computed Priority:</span>
                <span className="font-extrabold text-white text-sm mt-0.5 block">
                  {complaint.priority} Priority
                </span>
                <p className="text-slate-300 mt-1 leading-normal font-medium">
                  {complaint.urgencyReason}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block">Recommended Department:</span>
                <span className="font-bold text-teal-300 mt-1 block">
                  {complaint.recommendedDepartment}
                </span>
                <span className="text-slate-400 block mt-2">Allocated Division:</span>
                <span className="font-bold text-white block">
                  {complaint.assignedDepartment}
                </span>
              </div>
            </div>
          </div>

          {/* Citizen Photographic Evidence */}
          {Boolean(isSafeImageUrl(complaint.imageUrl || complaint.imageURL)) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>Citizen Photographic Evidence</span>
              </h4>
              <div className="rounded-2xl overflow-hidden border border-slate-800 max-w-lg bg-[#071426] shadow-sm">
                <img
                  src={complaint.imageUrl || complaint.imageURL || ''}
                  alt={`Civic issue ${complaint.id}`}
                  className="w-full max-h-80 object-cover"
                />
              </div>
            </div>
          )}

          {/* Status and Work Notes Timeline */}
          <div className="pt-6 border-t border-slate-800">
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
      </div>

      {/* Add Work Note & Evidence Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Record Field Progress Note"
        description="Contribute field inspection observations, repair milestones, or upload progress evidence."
      >
        <form onSubmit={handleAddWorkNote} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Work Note / Inspection Remarks
            </label>
            <textarea
              rows={3}
              required
              value={workNote}
              onChange={(e) => setWorkNote(e.target.value)}
              placeholder="e.g. Ground inspection completed; repair materials requisitioned; asphalt patching underway."
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Field Photo Evidence URL (Optional)
            </label>
            <input
              type="url"
              value={noteEvidenceUrl}
              onChange={(e) => setNoteEvidenceUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Supports secure photographic evidence links (Unsplash, HTTPS image host).
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#10243B] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !workNote.trim()}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-extrabold rounded-xl transition-all btn-press shadow-glow-teal/20"
            >
              {actionLoading ? 'Saving...' : 'Record Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Submit Final Resolution Modal (Primary Officer Only) */}
      <Modal
        isOpen={isResolutionModalOpen}
        onClose={() => setIsResolutionModalOpen(false)}
        title="Submit Incident Resolution"
        description="Formal resolution dossier to be verified and accepted by Municipal Administration."
      >
        <form onSubmit={handleSubmitResolution} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Resolution Summary
            </label>
            <textarea
              rows={3}
              required
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="e.g. Road crater patched and steamrolled; traffic safety restored per PWD specifications."
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Field Execution Actions
            </label>
            <input
              type="text"
              value={resolutionActions}
              onChange={(e) => setResolutionActions(e.target.value)}
              placeholder="e.g. Dispatched squad 4; deployed 2.5 tons cold mix asphalt; quality tested."
              className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Post-Repair Photographic Evidence URL
            </label>
            <input
              type="url"
              value={resolutionEvidenceUrl}
              onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsResolutionModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#10243B] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !resolutionSummary.trim()}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-extrabold rounded-xl transition-all btn-press shadow-glow-teal/20"
            >
              {actionLoading ? 'Transmitting...' : 'Transmit Resolution to Admin'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
