import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import {
  Navigation,
  MapPin,
  Clock,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Building,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { createNumberedRouteStopIcon, createStartPointIcon } from './mapIcons';
import { PriorityBadge, StatusBadge } from '../common/Badge';

interface SmartRoutePlannerProps {
  officerComplaints: Complaint[];
  officerName?: string;
  departmentName?: string;
}

export interface StartLocation {
  name: string;
  lat: number;
  lng: number;
  type: 'depot' | 'gps' | 'custom';
}

const PRESET_DEPOTS: StartLocation[] = [
  {
    name: 'Municipal HQ & Central Engineering Base',
    lat: 11.0168,
    lng: 76.9558,
    type: 'depot',
  },
  {
    name: 'North Zone Operations Depot',
    lat: 11.0310,
    lng: 76.9650,
    type: 'depot',
  },
  {
    name: 'South Zone Sanitation & PWD Yard',
    lat: 10.9980,
    lng: 76.9450,
    type: 'depot',
  },
];

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Heuristic route ordering:
 * 1. Prioritize Critical public-safety incidents first.
 * 2. Greedily select the nearest unvisited stop from current position (Nearest-Neighbour).
 * 3. Then visit remaining standard stops with Nearest-Neighbour sequence.
 */
export function orderStopsHeuristic(
  startLat: number,
  startLng: number,
  complaints: Complaint[]
): Complaint[] {
  if (complaints.length <= 1) return [...complaints];

  // Partition critical safety hazards from standard tickets
  const critical = complaints.filter((c) => c.priority === 'Critical');
  const others = complaints.filter((c) => c.priority !== 'Critical');

  const ordered: Complaint[] = [];
  let currentLat = startLat;
  let currentLng = startLng;

  // 1. Sequence all critical complaints first
  const remainingCritical = [...critical];
  while (remainingCritical.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingCritical.length; i++) {
      const c = remainingCritical[i];
      const dist = haversineDistanceKm(currentLat, currentLng, c.latitude!, c.longitude!);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const chosen = remainingCritical.splice(nearestIdx, 1)[0];
    ordered.push(chosen);
    currentLat = chosen.latitude!;
    currentLng = chosen.longitude!;
  }

  // 2. Sequence remaining standard complaints
  const remainingOthers = [...others];
  while (remainingOthers.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingOthers.length; i++) {
      const c = remainingOthers[i];
      const dist = haversineDistanceKm(currentLat, currentLng, c.latitude!, c.longitude!);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const chosen = remainingOthers.splice(nearestIdx, 1)[0];
    ordered.push(chosen);
    currentLat = chosen.latitude!;
    currentLng = chosen.longitude!;
  }

  return ordered;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} hr ${remMins > 0 ? `${remMins} min` : ''}`;
}

function RouteBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

export const SmartRoutePlanner: React.FC<SmartRoutePlannerProps> = ({
  officerComplaints,
  officerName,
}) => {
  const [selectedDepot, setSelectedDepot] = useState<StartLocation>(PRESET_DEPOTS[0]);
  const [gpsLocation, setGpsLocation] = useState<StartLocation | null>(null);
  const [useGps, setUseGps] = useState<boolean>(false);
  const [geoLocating, setGeoLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Active starting coordinate
  const activeStart: StartLocation = useGps && gpsLocation ? gpsLocation : selectedDepot;

  // Filter out resolved & rejected tickets; only route active assigned complaints
  const { routableComplaints, unroutableCount } = useMemo(() => {
    const valid: Complaint[] = [];
    let missingCoords = 0;

    officerComplaints.forEach((c) => {
      // Exclude resolved and rejected
      if (c.status === 'Resolved' || c.status === 'Resolution Submitted') return;

      const hasCoords =
        typeof c.latitude === 'number' &&
        typeof c.longitude === 'number' &&
        !isNaN(c.latitude) &&
        !isNaN(c.longitude) &&
        c.latitude !== 0 &&
        c.longitude !== 0;

      if (hasCoords) {
        valid.push(c);
      } else {
        missingCoords++;
      }
    });

    return { routableComplaints: valid, unroutableCount: missingCoords };
  }, [officerComplaints]);

  // Order stops using nearest-neighbour with critical hazard prioritization
  const orderedStops = useMemo(() => {
    return orderStopsHeuristic(activeStart.lat, activeStart.lng, routableComplaints);
  }, [activeStart, routableComplaints]);

  // Road route state returned from OSRM
  const [osrmRoute, setOsrmRoute] = useState<{
    coordinates: [number, number][];
    distanceKm: number | null;
    durationText: string | null;
    isRoadRoute: boolean;
    loading: boolean;
    error: string | null;
  }>({
    coordinates: [],
    distanceKm: null,
    durationText: null,
    isRoadRoute: false,
    loading: false,
    error: null,
  });

  // Query OSRM public road routing API
  useEffect(() => {
    if (orderedStops.length === 0) {
      setOsrmRoute({
        coordinates: [],
        distanceKm: null,
        durationText: null,
        isRoadRoute: false,
        loading: false,
        error: null,
      });
      return;
    }

    let isCancelled = false;

    // Build straight line fallback coordinates
    const directCoordinates: [number, number][] = [
      [activeStart.lat, activeStart.lng],
      ...orderedStops.map((s) => [s.latitude!, s.longitude!] as [number, number]),
    ];

    setOsrmRoute((prev) => ({ ...prev, loading: true, error: null }));

    // Build OSRM semicolon-delimited longitude,latitude string
    const coordsParam = [
      `${activeStart.lng},${activeStart.lat}`,
      ...orderedStops.map((s) => `${s.longitude},${s.latitude}`),
    ].join(';');

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout for public service

    fetch(osrmUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        clearTimeout(timeoutId);
        if (isCancelled) return;

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const roadPoints: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );

          const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
          const durationText = formatDuration(route.duration);

          setOsrmRoute({
            coordinates: roadPoints,
            distanceKm,
            durationText,
            isRoadRoute: true,
            loading: false,
            error: null,
          });
        } else {
          throw new Error(data.message || 'OSRM routing grid unable to resolve road path');
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (isCancelled) return;
        console.warn('[CivicResolve Diagnostic] OSRM road routing fallback active:', err.message);
        setOsrmRoute({
          coordinates: directCoordinates,
          distanceKm: null,
          durationText: null,
          isRoadRoute: false,
          loading: false,
          error: 'OSRM road route unavailable. Sequence path displayed.',
        });
      });

    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [activeStart, orderedStops]);

  // Request browser geolocation on explicit user click
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const gps: StartLocation = {
          name: 'My Current Location (Officer GPS)',
          lat,
          lng,
          type: 'gps',
        };
        setGpsLocation(gps);
        setUseGps(true);
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        if (err.code === 1) {
          setGeoError('GPS permission denied. Using selected Municipal Base instead.');
        } else {
          setGeoError('Unable to detect current GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const mapBoundsPoints: [number, number][] = useMemo(() => {
    return [
      [activeStart.lat, activeStart.lng],
      ...orderedStops.map((s) => [s.latitude!, s.longitude!] as [number, number]),
    ];
  }, [activeStart, orderedStops]);

  return (
    <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 shadow-card overflow-hidden">
      {/* Header and Route Parameters */}
      <div className="p-5 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
                <Navigation className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {officerName ? `${officerName}'s Field Route Planner` : 'Officer Smart Route Planner'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Field inspection sequencing powered by OSRM road network routing & nearest-neighbour triage.
            </p>
          </div>

          {/* SLA & Algorithm Notice */}
          <div className="p-2.5 rounded-xl bg-[#071426] border border-slate-800 max-w-sm text-[11px] text-slate-300">
            <div className="flex items-center space-x-1.5 font-bold text-teal-300">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Recommended Inspection Order</span>
            </div>
            <p className="text-slate-400 text-[10px] mt-0.5 leading-snug">
              Critical public-safety hazards are sequenced first, followed by nearest-neighbour dispatch. Not guaranteed mathematically optimal.
            </p>
          </div>
        </div>

        {/* Departure Point Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center space-x-1 mr-1">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>Departure Point:</span>
            </span>

            {/* Depot Selector */}
            <select
              value={useGps ? 'gps' : selectedDepot.name}
              onChange={(e) => {
                if (e.target.value === 'gps') {
                  handleAcquireGps();
                } else {
                  setUseGps(false);
                  const found = PRESET_DEPOTS.find((d) => d.name === e.target.value);
                  if (found) setSelectedDepot(found);
                }
              }}
              className="bg-[#071426] text-slate-200 text-xs rounded-xl border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              {PRESET_DEPOTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
              {gpsLocation && <option value="gps">My Live GPS Position</option>}
            </select>

            {/* GPS Toggle */}
            <button
              type="button"
              onClick={handleAcquireGps}
              disabled={geoLocating}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors btn-press ${
                useGps && gpsLocation
                  ? 'bg-teal-500 text-navy-950 shadow-xs'
                  : 'bg-[#10243B] hover:bg-[#162A45] text-teal-300 border border-teal-500/30'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
              <span>{geoLocating ? 'Detecting GPS...' : useGps ? 'Using GPS' : 'Use My GPS'}</span>
            </button>
          </div>

          {/* Route Distance & Duration Metric Banner (Shown strictly when returned by OSRM) */}
          <div className="flex items-center space-x-2">
            {osrmRoute.loading ? (
              <span className="text-xs text-slate-400 font-mono animate-pulse">
                Querying OSRM road routes...
              </span>
            ) : osrmRoute.distanceKm !== null && osrmRoute.durationText !== null ? (
              <div className="flex items-center space-x-2 font-mono text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 text-teal-300 border border-teal-500/40 font-bold flex items-center space-x-1">
                  <Gauge className="w-3 h-3 text-teal-400" />
                  <span>{osrmRoute.distanceKm} km drive</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>~{osrmRoute.durationText}</span>
                </span>
              </div>
            ) : osrmRoute.error ? (
              <span className="text-[11px] text-amber-400/90 italic">
                {osrmRoute.error}
              </span>
            ) : null}
          </div>
        </div>

        {geoError && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{geoError}</span>
          </div>
        )}
      </div>

      {/* Unroutable Complaints Notice */}
      {unroutableCount > 0 && (
        <div className="p-3 bg-[#071426] border-b border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              {unroutableCount} assigned complaint{unroutableCount > 1 ? 's are' : ' is'} missing GPS coordinates and cannot be sequenced on the road route.
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Only verified coordinates are routed</span>
        </div>
      )}

      {/* Route Map Canvas */}
      <div className="relative h-96 sm:h-[460px] w-full bg-[#071426]">
        {orderedStops.length === 0 && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#071426]/80 backdrop-blur-xs">
            <div className="p-5 rounded-2xl bg-[#0D1B2E] border border-slate-800 text-center max-w-sm shadow-xl">
              <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">No Active Assigned Route Stops</p>
              <p className="text-xs text-slate-400 mt-1">
                You have no unresolved complaints with coordinates assigned to your caseload. Once new cases are assigned, smart routes will be generated automatically.
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={[activeStart.lat, activeStart.lng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RouteBoundsFitter points={mapBoundsPoints} />

          {/* Starting Depot / HQ Marker */}
          <Marker position={[activeStart.lat, activeStart.lng]} icon={createStartPointIcon()}>
            <Popup className="civic-popup">
              <div className="text-left p-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Departure Origin
                </span>
                <p className="font-bold text-white text-xs mt-0.5">{activeStart.name}</p>
                <p className="font-mono text-[10px] text-slate-400 mt-1">
                  {activeStart.lat.toFixed(5)}°, {activeStart.lng.toFixed(5)}°
                </p>
              </div>
            </Popup>
          </Marker>

          {/* OSRM Road Route or Direct Polyline */}
          {osrmRoute.coordinates.length > 0 && (
            <Polyline
              positions={osrmRoute.coordinates}
              pathOptions={{
                color: osrmRoute.isRoadRoute ? '#14B8A6' : '#94A3B8',
                weight: 4,
                opacity: 0.85,
                dashArray: osrmRoute.isRoadRoute ? undefined : '6, 8',
              }}
            />
          )}

          {/* Ordered Numbered Stop Markers */}
          {orderedStops.map((c, index) => {
            const stopNumber = index + 1;
            const lat = c.latitude!;
            const lng = c.longitude!;
            const compId = c.id || c.complaintId || 'Case';

            return (
              <Marker
                key={compId}
                position={[lat, lng]}
                icon={createNumberedRouteStopIcon(stopNumber, c.priority)}
              >
                <Popup className="civic-popup">
                  <div className="space-y-1.5 text-left p-1 min-w-[200px]">
                    <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-1">
                      <span className="font-bold text-teal-400 text-xs">Stop #{stopNumber}</span>
                      <PriorityBadge priority={c.priority} size="sm" />
                    </div>
                    <p className="font-bold text-white text-xs leading-snug">{c.title}</p>
                    <p className="text-[11px] text-slate-300">{c.location}</p>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-400">{compId}</span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold text-[10px] transition-colors"
                      >
                        <span>Navigate</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Numbered Stops Sequence List */}
      {orderedStops.length > 0 && (
        <div className="p-5 sm:p-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
              <span>Inspection Schedule ({orderedStops.length} Stops)</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Sequenced by Priority + Proximity
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 overflow-hidden bg-[#071426]">
            {orderedStops.map((stop, idx) => {
              const stopNum = idx + 1;
              const isCritical = stop.priority === 'Critical';

              return (
                <div
                  key={stop.id || stop.complaintId || idx}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#10243B]/60 transition-colors"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs flex-shrink-0 ${
                        isCritical
                          ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {stopNum}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-[10px] text-teal-400 font-bold">
                          {stop.id || stop.complaintId}
                        </span>
                        <PriorityBadge priority={stop.priority} size="sm" />
                        <StatusBadge status={stop.status} size="sm" />
                        {isCritical && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
                            Immediate SLA Priority
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-white text-xs truncate mt-0.5">{stop.title}</p>
                      <p className="text-[11px] text-slate-400 truncate flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span>{stop.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-black transition-all btn-press shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Open Navigation</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
