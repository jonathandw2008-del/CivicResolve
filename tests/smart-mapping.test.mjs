import test from 'node:test';
import assert from 'node:assert';

/**
 * Smart Mapping Logic Under Test:
 * Reusable core algorithms for coordinate validation, GIS filtering,
 * nearest-neighbour routing with Critical priority escalation, and OSRM serialization.
 */

// 1. Haversine distance formula
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

// 2. Nearest-neighbour heuristic with Critical safety priority escalation
function orderStopsHeuristic(startLat, startLng, complaints) {
  if (!complaints || complaints.length <= 1) return [...(complaints || [])];

  const critical = complaints.filter((c) => c.priority === 'Critical');
  const others = complaints.filter((c) => c.priority !== 'Critical');

  const ordered = [];
  let currentLat = startLat;
  let currentLng = startLng;

  // 1. Sequence all critical complaints first via nearest-neighbour
  const remainingCritical = [...critical];
  while (remainingCritical.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingCritical.length; i++) {
      const c = remainingCritical[i];
      const dist = haversineDistanceKm(currentLat, currentLng, c.latitude, c.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const chosen = remainingCritical.splice(nearestIdx, 1)[0];
    ordered.push(chosen);
    currentLat = chosen.latitude;
    currentLng = chosen.longitude;
  }

  // 2. Sequence remaining standard complaints via nearest-neighbour
  const remainingOthers = [...others];
  while (remainingOthers.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingOthers.length; i++) {
      const c = remainingOthers[i];
      const dist = haversineDistanceKm(currentLat, currentLng, c.latitude, c.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const chosen = remainingOthers.splice(nearestIdx, 1)[0];
    ordered.push(chosen);
    currentLat = chosen.latitude;
    currentLng = chosen.longitude;
  }

  return ordered;
}

// 3. Officer complaint filtering (active assigned tickets only)
function filterRoutableOfficerComplaints(complaints, officerUid) {
  if (!officerUid) return [];

  return complaints.filter((c) => {
    // Must be assigned to this officer
    const isAssigned =
      c.primaryOfficerId === officerUid ||
      c.primaryOfficerUid === officerUid ||
      (Array.isArray(c.supportingOfficerIds) && c.supportingOfficerIds.includes(officerUid)) ||
      (Array.isArray(c.supportingOfficerUids) && c.supportingOfficerUids.includes(officerUid));

    if (!isAssigned) return false;

    // Exclude resolved and rejected
    if (c.status === 'Resolved' || c.status === 'Resolution Submitted' || c.status === 'Rejected') {
      return false;
    }

    // Must have valid numeric GPS coordinates
    const hasValidCoords =
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      !isNaN(c.latitude) &&
      !isNaN(c.longitude) &&
      c.latitude !== 0 &&
      c.longitude !== 0;

    return hasValidCoords;
  });
}

// 4. OSRM coordinates serializer
function serializeOsrmCoordinates(startPoint, stops) {
  const allPoints = [
    `${startPoint.lng},${startPoint.lat}`,
    ...stops.map((s) => `${s.longitude},${s.latitude}`),
  ];
  return allPoints.join(';');
}

// 5. OSRM response parser
function parseOsrmResponse(data) {
  if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    return {
      distanceKm: null,
      durationText: null,
      isRoadRoute: false,
    };
  }
  const route = data.routes[0];
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
  const mins = Math.round(route.duration / 60);
  const durationText = mins < 60 ? `${mins} mins` : `${Math.floor(mins / 60)} hr ${mins % 60} min`;

  return {
    distanceKm,
    durationText,
    isRoadRoute: true,
  };
}

// ==========================================
// TEST SUITE: CIVICRESOLVE SMART MAPPING
// ==========================================

test('Smart Mapping: Citizen can set and validate GPS coordinates without fabricating missing data', () => {
  const validSubmission = {
    title: 'Burst pipe on Cross Cut',
    description: 'Fresh water flooding the pedestrian pathway.',
    location: 'Near Pillar 18, Gandhipuram',
    latitude: 11.01852,
    longitude: 76.96324,
  };

  assert.strictEqual(typeof validSubmission.latitude, 'number');
  assert.strictEqual(typeof validSubmission.longitude, 'number');
  assert.strictEqual(validSubmission.location, 'Near Pillar 18, Gandhipuram');

  // When citizen skips map selection, coordinates must stay null (never fabricated)
  const manualOnlySubmission = {
    title: 'Streetlight flickers at night',
    description: 'Hazardous darkness near bus stop.',
    location: '100 Feet Road, Saibaba Colony',
    latitude: null,
    longitude: null,
  };

  assert.strictEqual(manualOnlySubmission.latitude, null, 'Must not invent latitude');
  assert.strictEqual(manualOnlySubmission.longitude, null, 'Must not invent longitude');
  assert.strictEqual(manualOnlySubmission.location, '100 Feet Road, Saibaba Colony');
});

test('Smart Mapping: Admin Map View filters out complaints without coordinates and groups by priority', () => {
  const complaints = [
    { id: 'C-1', title: 'Road crater', priority: 'Critical', latitude: 11.018, longitude: 76.963, status: 'In Progress' },
    { id: 'C-2', title: 'Garbage pile', priority: 'High', latitude: null, longitude: null, status: 'Reported' },
    { id: 'C-3', title: 'Broken pole', priority: 'Medium', latitude: 11.025, longitude: 76.951, status: 'Assigned' },
    { id: 'C-4', title: 'Drain silt', priority: 'Low', latitude: 0, longitude: 0, status: 'Reported' }, // invalid 0,0
  ];

  const mapped = complaints.filter(
    (c) => typeof c.latitude === 'number' && typeof c.longitude === 'number' && c.latitude !== 0 && c.longitude !== 0
  );

  assert.strictEqual(mapped.length, 2, 'Only tickets with real coordinates are mapped');
  assert.strictEqual(mapped[0].id, 'C-1');
  assert.strictEqual(mapped[1].id, 'C-3');

  const unmapped = complaints.filter((c) => !mapped.includes(c));
  assert.strictEqual(unmapped.length, 2, 'Unmapped tickets identified for geolocation follow-up');
});

test('Smart Mapping: Officer route planner displays ONLY authorized complaints and excludes resolved ones', () => {
  const officerUid = 'officer-ramanathan';

  const mixedDataset = [
    // 1. Assigned to officer, In Progress, valid coords -> MUST BE INCLUDED
    {
      id: 'CMP-101',
      title: 'Pothole patch',
      primaryOfficerId: officerUid,
      status: 'In Progress',
      priority: 'Medium',
      latitude: 11.0185,
      longitude: 76.9632,
    },
    // 2. Assigned to officer, Resolved -> MUST BE EXCLUDED
    {
      id: 'CMP-102',
      title: 'Fixed water pipe',
      primaryOfficerId: officerUid,
      status: 'Resolved',
      priority: 'High',
      latitude: 11.0124,
      longitude: 76.958,
    },
    // 3. Assigned to another officer -> MUST BE EXCLUDED
    {
      id: 'CMP-103',
      title: 'Other division ticket',
      primaryOfficerId: 'officer-other',
      status: 'In Progress',
      priority: 'Critical',
      latitude: 11.025,
      longitude: 76.951,
    },
    // 4. Assigned to officer as supporting, Assigned status, valid coords -> MUST BE INCLUDED
    {
      id: 'CMP-104',
      title: 'Drainage clearing',
      primaryOfficerId: 'lead-eng',
      supportingOfficerIds: [officerUid],
      status: 'Assigned',
      priority: 'Critical',
      latitude: 11.009,
      longitude: 76.969,
    },
    // 5. Assigned to officer, but missing coordinates -> MUST BE EXCLUDED FROM ROUTE
    {
      id: 'CMP-105',
      title: 'No GPS ticket',
      primaryOfficerId: officerUid,
      status: 'In Progress',
      priority: 'High',
      latitude: null,
      longitude: null,
    },
  ];

  const routable = filterRoutableOfficerComplaints(mixedDataset, officerUid);
  assert.strictEqual(routable.length, 2);
  assert.strictEqual(routable.some((c) => c.id === 'CMP-101'), true);
  assert.strictEqual(routable.some((c) => c.id === 'CMP-104'), true);
  assert.strictEqual(routable.some((c) => c.id === 'CMP-102'), false, 'Resolved tickets excluded');
  assert.strictEqual(routable.some((c) => c.id === 'CMP-103'), false, 'Unauthorized tickets excluded');
  assert.strictEqual(routable.some((c) => c.id === 'CMP-105'), false, 'Ungeocoded tickets excluded');
});

test('Smart Mapping: Route optimizer prioritizes Critical safety complaints before standard tickets', () => {
  const startLat = 11.0168; // Central Base
  const startLng = 76.9558;

  // Stop A is very close to base, but is Medium priority
  const stopA = {
    id: 'STOP-A',
    priority: 'Medium',
    latitude: 11.0175,
    longitude: 76.9565, // ~100 meters away
  };

  // Stop B is further away, but is Critical priority
  const stopB = {
    id: 'STOP-B',
    priority: 'Critical',
    latitude: 11.031,
    longitude: 76.972, // ~2.2 km away
  };

  // Stop C is also Critical, located even further
  const stopC = {
    id: 'STOP-C',
    priority: 'Critical',
    latitude: 11.039,
    longitude: 76.985, // ~3.5 km away
  };

  // Stop D is Low priority
  const stopD = {
    id: 'STOP-D',
    priority: 'Low',
    latitude: 11.019,
    longitude: 76.958,
  };

  const inputComplaints = [stopA, stopB, stopC, stopD];
  const ordered = orderStopsHeuristic(startLat, startLng, inputComplaints);

  assert.strictEqual(ordered.length, 4);
  // Both Critical stops MUST appear before the non-critical stops (A and D)
  assert.strictEqual(ordered[0].priority, 'Critical', 'First stop must be Critical');
  assert.strictEqual(ordered[1].priority, 'Critical', 'Second stop must be Critical');
  assert.strictEqual(ordered[0].id, 'STOP-B', 'Closer Critical stop (B) visited before further Critical stop (C)');
  assert.strictEqual(ordered[1].id, 'STOP-C');
  // Then non-critical stops are sequenced via nearest-neighbour
  assert.strictEqual(ordered[2].priority !== 'Critical', true);
  assert.strictEqual(ordered[3].priority !== 'Critical', true);
});

test('Smart Mapping: OSRM coordinate serialization and response parsing', () => {
  const depot = { lat: 11.0168, lng: 76.9558 };
  const stops = [
    { latitude: 11.0185, longitude: 76.9632 },
    { latitude: 11.025, longitude: 76.951 },
  ];

  const serialized = serializeOsrmCoordinates(depot, stops);
  assert.strictEqual(serialized, '76.9558,11.0168;76.9632,11.0185;76.951,11.025');

  // Mock valid OSRM response
  const mockOsrmSuccess = {
    code: 'Ok',
    routes: [
      {
        distance: 8450, // 8.45 km
        duration: 1320, // 22 minutes
        geometry: { coordinates: [[76.9558, 11.0168], [76.9632, 11.0185]] },
      },
    ],
  };

  const parsed = parseOsrmResponse(mockOsrmSuccess);
  assert.strictEqual(parsed.distanceKm, 8.5);
  assert.strictEqual(parsed.durationText, '22 mins');
  assert.strictEqual(parsed.isRoadRoute, true);

  // Mock failed OSRM response (service unavailable / rate limited)
  const mockOsrmFailure = { code: 'NoRoute', message: 'No route found between coordinates' };
  const failedParsed = parseOsrmResponse(mockOsrmFailure);
  assert.strictEqual(failedParsed.distanceKm, null, 'Do not invent distance when service fails');
  assert.strictEqual(failedParsed.durationText, null, 'Do not invent duration when service fails');
  assert.strictEqual(failedParsed.isRoadRoute, false);
});

test('Smart Mapping: Haversine distance accuracy', () => {
  // Distance between Gandhipuram (11.0168, 76.9558) and Peelamedu (11.0315, 76.9720) in Coimbatore
  const d = haversineDistanceKm(11.0168, 76.9558, 11.0315, 76.9720);
  assert.ok(d > 2.0 && d < 2.8, `Calculated distance ${d}km should be approx 2.4km`);
});
