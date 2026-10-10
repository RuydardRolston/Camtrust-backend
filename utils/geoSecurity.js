/**
 * GeoSecurity Utility for CamTrust
 * Implements Anti-Mock GPS detection, Geofencing validation, and Teleportation checks.
 */

/**
 * Calculates the great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in kilometers
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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
 * Validates that GPS coordinates are legitimate decimal values within worldwide bounds.
 * Rejects (0, 0) "Null Island" as an uncalibrated default.
 */
export function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

/**
 * Attempts to parse decimal coordinates from a project location string (e.g. "3.8480, 11.5021").
 */
export function parseCoordinatesFromString(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}

/**
 * Evaluates whether an evidence capture point satisfies project geofencing constraints.
 * @param {object} project - Sequelize Project instance
 * @param {number} evidenceLat 
 * @param {number} evidenceLng 
 * @returns {{ checked: boolean, withinGeofence: boolean, distanceMeters: number|null, maxRadiusMeters: number }}
 */
export function checkProjectGeofence(project, evidenceLat, evidenceLng) {
  if (!isValidCoordinate(evidenceLat, evidenceLng)) {
    return { checked: false, withinGeofence: true, distanceMeters: null, maxRadiusMeters: 500 };
  }

  let projectLat = project.latitude;
  let projectLng = project.longitude;

  if (!isValidCoordinate(projectLat, projectLng)) {
    const parsed = parseCoordinatesFromString(project.location);
    if (parsed) {
      projectLat = parsed.latitude;
      projectLng = parsed.longitude;
    }
  }

  if (!isValidCoordinate(projectLat, projectLng)) {
    // Project does not have explicit GPS center coordinates registered
    return { checked: false, withinGeofence: true, distanceMeters: null, maxRadiusMeters: project.geofenceRadiusMeters || 500 };
  }

  const distanceKm = haversineDistanceKm(projectLat, projectLng, evidenceLat, evidenceLng);
  const distanceMeters = Math.round(distanceKm * 1000);
  const maxRadiusMeters = project.geofenceRadiusMeters || 500;

  return {
    checked: true,
    withinGeofence: distanceMeters <= maxRadiusMeters,
    distanceMeters,
    maxRadiusMeters
  };
}

/**
 * Detects impossible speed / velocity teleportation between sequential uploads.
 * @param {object|null} lastEvidence - Previous SiteEvidence record for the user
 * @param {number} currentLat 
 * @param {number} currentLng 
 * @param {Date} currentTimestamp 
 * @returns {{ isTeleporting: boolean, speedKmH: number|null, distanceKm: number|null, reason?: string }}
 */
export function checkTeleportation(lastEvidence, currentLat, currentLng, currentTimestamp = new Date()) {
  if (!lastEvidence || !isValidCoordinate(lastEvidence.gpsLatitude, lastEvidence.gpsLongitude)) {
    return { isTeleporting: false, speedKmH: null, distanceKm: null };
  }

  if (!isValidCoordinate(currentLat, currentLng)) {
    return { isTeleporting: false, speedKmH: null, distanceKm: null };
  }

  const lastTime = new Date(lastEvidence.capturedAt || lastEvidence.createdAt).getTime();
  const currentTime = new Date(currentTimestamp).getTime();
  const timeDiffHours = (currentTime - lastTime) / (1000 * 3600);

  // If previous upload was over 24 hours ago, skip velocity check
  if (timeDiffHours <= 0 || timeDiffHours > 24) {
    return { isTeleporting: false, speedKmH: null, distanceKm: null };
  }

  const distanceKm = haversineDistanceKm(
    lastEvidence.gpsLatitude,
    lastEvidence.gpsLongitude,
    currentLat,
    currentLng
  );

  const speedKmH = distanceKm / timeDiffHours;

  // Faster than 800 km/h (impossible commercial ground/flight transit between construction sites)
  // or jump of > 100km in under 15 minutes
  if (speedKmH > 800 || (distanceKm > 100 && timeDiffHours < 0.25)) {
    return {
      isTeleporting: true,
      speedKmH: Math.round(speedKmH),
      distanceKm: Math.round(distanceKm),
      reason: `Impossible transit speed (${Math.round(speedKmH)} km/h across ${Math.round(distanceKm)} km in ${Math.round(timeDiffHours * 60)} mins) detected. Potential Mock GPS teleportation.`
    };
  }

  return { isTeleporting: false, speedKmH: Math.round(speedKmH), distanceKm: Math.round(distanceKm) };
}

/**
 * Inspects telemetry metadata for mock GPS signatures.
 * @param {object} params
 * @param {number|null} params.accuracy 
 * @param {boolean|string|null} params.isMockFlag 
 * @returns {{ isMockSuspicious: boolean, reason?: string }}
 */
export function detectMockSignatures({ accuracy, isMockFlag }) {
  if (isMockFlag === true || isMockFlag === 'true') {
    return {
      isMockSuspicious: true,
      reason: 'Device reported active mock location provider.'
    };
  }

  // Exact 0.0m accuracy is physically impossible with GNSS satellite triangulation
  if (typeof accuracy === 'number' && accuracy <= 0) {
    return {
      isMockSuspicious: true,
      reason: 'Unrealistic zero-meter telemetry precision (indicates synthetic mock location generator).'
    };
  }

  return { isMockSuspicious: false };
}
