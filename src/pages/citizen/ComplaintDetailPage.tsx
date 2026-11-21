import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  Image as ImageIcon,
  Building,
  ExternalLink,
  Navigation,
  Check,
  Edit3,
} from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { StatusTimeline } from '../../components/common/StatusTimeline';
import { formatDate } from '../../utils/formatters';
import { ComplaintHistoryDocument, StatusHistoryEntry } from '../../types/complaint';
import { isSafeImageUrl } from '../../utils/security';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createComplaintPriorityIcon } from '../../components/maps/mapIcons';
import { LocationPickerMap } from '../../components/maps/LocationPickerMap';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isOfficer } = useAuth();
  const { getComplaint, getComplaintHistory, updateComplaintLocation, loading } = useComplaints();

  const [historyDocs, setHistoryDocs] = useState<ComplaintHistoryDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const complaint = id ? getComplaint(id) : undefined;

  const canUpdateLocation = Boolean(
    complaint && (user?.uid === complaint.userId || isAdmin || isOfficer)
  );

  const handleSaveLocation = async () => {
    if (!complaint || !editCoords) return;
    const targetId = complaint.id || complaint.complaintId;
    if (!targetId) return;
    setSavingLocation(true);
    try {
      await updateComplaintLocation(targetId, editCoords.lat, editCoords.lng);
      setIsEditingLocation(false);
    } catch (err) {
      console.error('Failed to update complaint location:', err);
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    if (id) {
      setHistoryLoading(true);
      getComplaintHistory(id)
        .then((res) => {
          setHistoryDocs(res);
        })
        .catch((err) => {
          console.warn('Could not load history subcollection:', err);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [id, getComplaintHistory]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading complaint record from Cloud Firestore...</p>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-12 text-center max-w-md mx-auto my-8 shadow-card">
        <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Complaint Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">
          The requested complaint identifier "{id}" does not exist in your record inventory.
        </p>
        <button
          onClick={() => navigate('/citizen/complaints')}
          className="mt-5 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 rounded-xl text-xs font-bold transition-colors btn-press"
        >
          Return to My Complaints
        </button>
      </div>
    );
  }

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Back button */}
      <div>
        <Link
          to="/citizen/complaints"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Complaints</span>
        </Link>
      </div>

      {/* Main Dossier Card */}
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
        {/* Header Bar */}
        <div className="p-6 sm:p-8 border-b border-slate-800 bg-[#071426]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs sm:text-sm font-bold px-3 py-1 bg-[#10243B] text-teal-300 border border-teal-500/30 rounded-xl shadow-2xs">
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
                <Building className="w-4 h-4 text-slate-500" />
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
          {/* Narrative */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Citizen Narrative
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#071426] p-4 rounded-2xl border border-slate-800 whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* AI Triage & Urgency Analysis Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 to-blue-950/30 border border-teal-500/30 shadow-2xs">
            <div className="flex items-center space-x-2 text-teal-300 font-bold text-xs tracking-wide uppercase mb-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>
                {complaint.aiAnalysis?.isFallback
                  ? 'CivicResolve Triage Notice (Standard Fallback)'
                  : 'CivicResolve AI Triage Assessment'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">
                  {complaint.aiAnalysis?.isFallback ? 'Initial Priority (Fallback):' : 'AI Severity & Priority:'}
                </span>
                <span className="font-extrabold text-white text-sm mt-0.5 block">
                  {complaint.priority} Priority
                </span>
                <p className="text-slate-300 mt-1 leading-normal font-medium">
                  {complaint.urgencyReason}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block">AI Recommended Department:</span>
                <span className="font-bold text-teal-300 mt-1 block">
                  {complaint.recommendedDepartment}
                </span>
                <span className="text-slate-400 block mt-2">Allocated Municipal Authority:</span>
                <span className="font-bold text-white block">
                  {complaint.assignedDepartment || 'Pending Administrative Assignment'}
                </span>
              </div>
            </div>
          </div>

          {/* Department Assignment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-800 bg-[#071426] flex items-start space-x-3 shadow-2xs">
              <div className="p-2.5 rounded-xl bg-[#10243B] text-slate-300 mt-0.5 border border-slate-700/60">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Responsible Authority</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  {complaint.assignedDepartment || 'Not yet allocated'}
                </p>
                {complaint.primaryOfficerName && (
                  <p className="text-[11px] text-teal-300 font-semibold mt-1">
                    Lead Officer: {complaint.primaryOfficerName}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-[#071426] flex items-start space-x-3 shadow-2xs">
              <div className="p-2.5 rounded-xl bg-teal-950/50 text-teal-400 mt-0.5 border border-teal-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Service Level Commitment</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                  {complaint.priority === 'Critical'
                    ? '4 - 12 Hours Emergency Turnaround'
                    : complaint.priority === 'High'
                    ? '24 - 48 Hours Priority Turnaround'
                    : '3 - 5 Business Days Standard SLA'}
                </p>
              </div>
            </div>
          </div>

          {/* Civic Resolution & Verification Dossier (When Submitted or Resolved) */}
          {complaint.resolution && (
            <div className="p-5 sm:p-6 rounded-3xl bg-teal-950/30 border border-teal-500/40 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-teal-300 font-extrabold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <span>Civic Resolution & Verification</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    complaint.status === 'Resolved'
                      ? 'bg-teal-950 text-teal-300 border-teal-500/50'
                      : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {complaint.status === 'Resolved' ? 'Verified & Closed' : 'Resolution Under Review'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#071426] border border-teal-500/20 text-xs space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Resolution Summary
                  </span>
                  <p className="text-white font-semibold text-sm leading-relaxed">{complaint.resolution.summary}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Actions Taken by Municipal Field Crew
                  </span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{complaint.resolution.actionsTaken}</p>
                </div>

                {complaint.resolution.evidenceUrl && isSafeImageUrl(complaint.resolution.evidenceUrl) && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Field Resolution Photographic Evidence
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-700 max-h-72 bg-black/40">
                      <img
                        src={complaint.resolution.evidenceUrl}
                        alt="Resolution proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Field Work Submitted by: <strong className="text-teal-300">{complaint.resolution.submittedByName}</strong>
                  </span>
                  {complaint.resolution.approvedBy && (
                    <span className="text-teal-400 font-bold">
                      Verified by Municipal Admin: {complaint.resolution.approvedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photo Attachment (if available and safe) */}
          {Boolean(isSafeImageUrl(complaint.imageUrl || complaint.imageURL)) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>Photographic Evidence</span>
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

          {/* Geospatial Incident Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span>Geospatial Incident Location</span>
              </h4>

              {canUpdateLocation && !isEditingLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setEditCoords(
                      typeof complaint.latitude === 'number' && typeof complaint.longitude === 'number'
                        ? { lat: complaint.latitude, lng: complaint.longitude }
                        : null
                    );
                    setIsEditingLocation(true);
                  }}
                  className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 font-bold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>
                    {typeof complaint.latitude === 'number' && typeof complaint.longitude === 'number'
                      ? 'Adjust Pin Location'
                      : 'Pin Missing Location'}
                  </span>
                </button>
              )}
            </div>

            {isEditingLocation ? (
              <div className="p-4 rounded-2xl bg-[#071426] border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300">
                  Click on the interactive map or use GPS to set the verified location coordinates for this complaint.
                </p>
                <LocationPickerMap
                  initialLat={editCoords?.lat ?? complaint.latitude}
                  initialLng={editCoords?.lng ?? complaint.longitude}
                  onLocationSelect={(coords) => setEditCoords(coords)}
                />
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingLocation(false)}
                    disabled={savingLocation}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLocation}
                    disabled={savingLocation || !editCoords}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-black transition-all btn-press disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingLocation ? 'Saving Coordinates...' : 'Save Coordinates'}</span>
                  </button>
                </div>
              </div>
            ) : typeof complaint.latitude === 'number' &&
              typeof complaint.longitude === 'number' &&
              complaint.latitude !== 0 &&
              complaint.longitude !== 0 ? (
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#071426] space-y-0">
                <div className="h-60 sm:h-72 w-full">
                  <MapContainer
                    center={[complaint.latitude, complaint.longitude]}
                    zoom={15}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[complaint.latitude, complaint.longitude]}
                      icon={createComplaintPriorityIcon(complaint.priority)}
                    >
                      <Popup className="civic-popup">
                        <div className="text-left text-xs p-1">
                          <p className="font-bold text-white">{complaint.title}</p>
                          <p className="text-[11px] text-slate-300 mt-1">{complaint.location}</p>
                          <p className="font-mono text-[10px] text-teal-400 mt-1">
                            {complaint.latitude.toFixed(5)}°, {complaint.longitude.toFixed(5)}°
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>

                <div className="p-3 bg-[#0D1B2E] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2 font-mono text-slate-300 text-[11px]">
                    <span className="text-slate-500 font-bold">GPS:</span>
                    <span>
                      {complaint.latitude.toFixed(5)}° N, {complaint.longitude.toFixed(5)}° E
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-colors"
                  >
                    <Navigation className="w-3 h-3 text-teal-400" />
                    <span>Open in Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#071426] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-2.5 text-slate-400">
                  <AlertOctagon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-300">No GPS Coordinates Recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This incident was registered with textual location ("{complaint.location}"). Coordinates have not yet been pinned to the GIS grid.
                    </p>
                  </div>
                </div>

                {canUpdateLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditCoords(null);
                      setIsEditingLocation(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-black transition-all btn-press whitespace-nowrap self-start sm:self-auto"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Pin Exact Location</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Status History Timeline */}
          <div className="pt-6 border-t border-slate-800">
            {historyLoading ? (
              <p className="text-xs text-slate-400">Loading verification history...</p>
            ) : (
              <StatusTimeline
                history={combinedHistory}
                currentStatus={complaint.status}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
