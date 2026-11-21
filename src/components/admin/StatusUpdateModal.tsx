import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Complaint, ComplaintStatus } from '../../types/complaint';
import { COMPLAINT_STATUSES } from '../../config/constants';
import { useComplaints } from '../../context/ComplaintContext';

interface StatusUpdateModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  complaint,
  isOpen,
  onClose,
}) => {
  const { updateComplaintStatus } = useComplaints();
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    complaint?.status || 'In Progress'
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if complaint changes
  React.useEffect(() => {
    if (complaint) {
      setSelectedStatus(complaint.status);
      setNote('');
      setError(null);
    }
  }, [complaint]);

  if (!complaint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateComplaintStatus(complaint.id, selectedStatus, note);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update status in Cloud Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Status: ${complaint.id}`}
      description="Update incident lifecycle stage and record municipal field verification notes."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
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

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Target Lifecycle Milestone
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPLAINT_STATUSES.map((status) => {
              const isSelected = selectedStatus === status;
              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    isSelected
                      ? 'bg-teal-500 text-navy-950 border-teal-500 font-extrabold shadow-sm'
                      : 'bg-[#071426] text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-[#10243B]'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Field Verification Note / Ground Remarks
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Field inspection conducted; repair crew dispatched; issue resolved."
            className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white placeholder-slate-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This note will be permanently logged in the public transparency timeline.
          </p>
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
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 text-navy-950 text-xs font-extrabold rounded-xl shadow-sm transition-all btn-press touch-target"
          >
            {isSubmitting ? 'Saving...' : 'Confirm Status Update'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
