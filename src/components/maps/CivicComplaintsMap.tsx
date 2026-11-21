import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Filter,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { createComplaintPriorityIcon } from './mapIcons';
import { PriorityBadge, StatusBadge } from '../common/Badge';

interface CivicComplaintsMapProps {
  complaints: Complaint[];
  onUpdateLocation?: (complaintId: string, lat: number, lng: number) => Promise<void>;
}

// Default center: Central Municipal Zone [11.0168, 76.9558]
const DEFAULT_CENTER: [number, number] = [11.0168, 76.9558];

function MapBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

export const CivicComplaintsMap: React.FC<CivicComplaintsMapProps> = ({ complaints }) => {
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUnmappedList, setShowUnmappedList] = useState(false);

  // Separate complaints with valid numeric coordinates from unmapped complaints
  const { mappedComplaints, unmappedComplaints } = useMemo(() => {
    const mapped: Complaint[] = [];
    const unmapped: Complaint[] = [];

    complaints.forEach((c) => {
      const hasCoords =
        typeof c.latitude === 'number' &&
        typeof c.longitude === 'number' &&
        !isNaN(c.latitude) &&
        !isNaN(c.longitude) &&
        c.latitude !== 0 &&
        c.longitude !== 0;

      if (hasCoords) {
        mapped.push(c);
      } else {
        unmapped.push(c);
      }
    });

    return { mappedComplaints: mapped, unmappedComplaints: unmapped };
  }, [complaints]);

  // Unique department list for dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      if (c.assignedDepartment && c.assignedDepartment !== 'Pending Assignment') {
        set.add(c.assignedDepartment);
      }
    });
    return Array.from(set).sort();
  }, [complaints]);

  // Filter mapped complaints based on selected criteria
  const filteredComplaints = useMemo(() => {
    return mappedComplaints.filter((c) => {
      const matchDept = departmentFilter === 'all' || c.assignedDepartment === departmentFilter;
      const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchDept && matchPriority && matchStatus;
    });
  }, [mappedComplaints, departmentFilter, priorityFilter, statusFilter]);

  const markerPoints: [number, number][] = useMemo(() => {
    return filteredComplaints.map((c) => [c.latitude!, c.longitude!]);
  }, [filteredComplaints]);

  return (
    <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
      {/* Header and Controls */}
      <div className="p-5 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
                <MapPin className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Municipal GIS Command & Incident Map
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Geospatial distribution of civic incidents across municipal wards powered by OpenStreetMap.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-[#071426] text-teal-300 border border-slate-800 font-mono font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>{filteredComplaints.length} Mapped on Grid</span>
            </span>

            {unmappedComplaints.length > 0 && (
              <button
                type="button"
                onClick={() => setShowUnmappedList((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-600/40 text-xs font-bold transition-colors flex items-center space-x-1 btn-press"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{unmappedComplaints.length} Awaiting Geolocation</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUnmappedList ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium flex items-center space-x-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filters:</span>
            </span>

            {/* Department */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-[#071426] text-slate-200 text-xs rounded-xl border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-[#071426] text-slate-200 text-xs rounded-xl border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#071426] text-slate-200 text-xs rounded-xl border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              <option value="all">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolution Submitted">Resolution Submitted</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Color Legend */}
          <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span>High</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
              <span>Medium</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unmapped Complaints Drawer */}
      {showUnmappedList && unmappedComplaints.length > 0 && (
        <div className="p-4 bg-[#071426] border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Complaints without GPS Coordinates (Recorded via manual text location)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Never displaying fabricated coordinates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {unmappedComplaints.map((c) => (
              <div
                key={c.id || c.complaintId}
                className="p-2.5 rounded-xl bg-[#0D1B2E] border border-slate-800 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold text-teal-400">{c.id || c.complaintId}</span>
                    <PriorityBadge priority={c.priority} size="sm" />
                  </div>
                  <p className="font-semibold text-white truncate">{c.title}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.location}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{c.assignedDepartment || 'General'}</span>
                  <Link
                    to={`/admin/complaints`}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Map Canvas */}
      <div className="relative h-96 sm:h-[460px] w-full bg-[#071426]">
        {filteredComplaints.length === 0 && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#071426]/70 backdrop-blur-xs pointer-events-none">
            <div className="p-4 rounded-2xl bg-[#0D1B2E] border border-slate-800 text-center max-w-sm shadow-xl">
              <MapPin className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="font-bold text-white text-xs">No matching geocoded complaints</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {mappedComplaints.length === 0
                  ? 'No complaints currently have GPS coordinates. Citizen submissions with map pins will appear here automatically.'
                  : 'No complaints match the selected department, priority, or status filter.'}
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsFitter points={markerPoints} />

          {filteredComplaints.map((c) => {
            const lat = c.latitude!;
            const lng = c.longitude!;
            const compId = c.id || c.complaintId || 'Unknown';

            return (
              <Marker
                key={compId}
                position={[lat, lng]}
                icon={createComplaintPriorityIcon(c.priority)}
              >
                <Popup className="civic-popup" closeButton={true}>
                  <div className="space-y-2 text-left min-w-[220px] max-w-xs p-1">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <span className="font-mono text-xs font-bold text-teal-400">{compId}</span>
                      <PriorityBadge priority={c.priority} size="sm" />
                    </div>

                    <h4 className="font-bold text-white text-xs leading-snug">{c.title}</h4>

                    <div className="text-[11px] space-y-1 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500 font-medium">Category:</span>
                        <span className="font-semibold text-slate-200">{c.category}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500 font-medium">Status:</span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      {c.assignedDepartment && (
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="truncate text-slate-300">{c.assignedDepartment}</span>
                        </div>
                      )}
                      <div className="flex items-start space-x-1.5 pt-1 border-t border-slate-800/80">
                        <MapPin className="w-3 h-3 text-teal-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300 font-medium leading-tight">{c.location}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {lat.toFixed(5)}°, {lng.toFixed(5)}°
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
                      <Link
                        to={`/admin/complaints`}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-[11px] transition-colors"
                      >
                        <span>Manage Case</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
