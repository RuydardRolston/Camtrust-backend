import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  isValidCoordinate,
  parseCoordinatesFromString,
  checkProjectGeofence,
  checkTeleportation,
  detectMockSignatures,
} from '../utils/geoSecurity.js';

describe('GeoSecurity - Anti-Mock & Geofencing Suite', () => {
  describe('haversineDistanceKm', () => {
    it('calculates correct distance between Douala and Yaoundé (~200km)', () => {
      // Douala: 4.0511, 9.7679 | Yaoundé: 3.8480, 11.5021
      const dist = haversineDistanceKm(4.0511, 9.7679, 3.8480, 11.5021);
      expect(dist).toBeGreaterThan(190);
      expect(dist).toBeLessThan(215);
    });

    it('returns 0 for identical points', () => {
      const dist = haversineDistanceKm(4.0, 9.0, 4.0, 9.0);
      expect(dist).toBeCloseTo(0);
    });
  });

  describe('isValidCoordinate', () => {
    it('accepts legitimate worldwide coordinates', () => {
      expect(isValidCoordinate(3.848, 11.502)).toBe(true);
      expect(isValidCoordinate(-33.8688, 151.2093)).toBe(true);
    });

    it('rejects invalid or null coordinates', () => {
      expect(isValidCoordinate(null, 11.5)).toBe(false);
      expect(isValidCoordinate(NaN, 11.5)).toBe(false);
      expect(isValidCoordinate(95, 11.5)).toBe(false);
      expect(isValidCoordinate(3.5, 185)).toBe(false);
      expect(isValidCoordinate(0.0, 0.0)).toBe(false); // Null Island rejected
    });
  });

  describe('parseCoordinatesFromString', () => {
    it('parses comma-separated latitude and longitude from location string', () => {
      const coords = parseCoordinatesFromString('Site at 3.8480, 11.5021 (Cameroon)');
      expect(coords).not.toBeNull();
      expect(coords?.latitude).toBeCloseTo(3.848);
      expect(coords?.longitude).toBeCloseTo(11.5021);
    });

    it('returns null for plain text locations without coordinates', () => {
      expect(parseCoordinatesFromString('Nairobi, Kenya')).toBeNull();
    });
  });

  describe('checkProjectGeofence', () => {
    const mockProject = {
      latitude: 4.0511,
      longitude: 9.7679,
      geofenceRadiusMeters: 500,
    };

    it('approves coordinates within the designated geofence radius', () => {
      // Very close point (~50m away)
      const res = checkProjectGeofence(mockProject, 4.0513, 9.7681);
      expect(res.checked).toBe(true);
      expect(res.withinGeofence).toBe(true);
      expect(res.distanceMeters).toBeLessThan(100);
    });

    it('flags coordinates that breach the project perimeter', () => {
      // 2km away
      const res = checkProjectGeofence(mockProject, 4.07, 9.77);
      expect(res.checked).toBe(true);
      expect(res.withinGeofence).toBe(false);
      expect(res.distanceMeters).toBeGreaterThan(1000);
    });
  });

  describe('checkTeleportation', () => {
    it('detects impossible transit speeds (mock teleportation)', () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const lastEvidence = {
        gpsLatitude: 4.0511, // Douala
        gpsLongitude: 9.7679,
        capturedAt: tenMinutesAgo,
      };

      // New evidence in Yaoundé (~200km away in 10 minutes => 1200 km/h)
      const res = checkTeleportation(lastEvidence, 3.848, 11.5021, now);
      expect(res.isTeleporting).toBe(true);
      expect(res.speedKmH).toBeGreaterThan(800);
    });

    it('permits realistic travel velocity', () => {
      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 3600 * 1000);
      const lastEvidence = {
        gpsLatitude: 4.0511,
        gpsLongitude: 9.7679,
        capturedAt: fourHoursAgo,
      };

      // ~200km in 4 hours = ~50 km/h (realistic car drive)
      const res = checkTeleportation(lastEvidence, 3.848, 11.5021, now);
      expect(res.isTeleporting).toBe(false);
    });
  });

  describe('detectMockSignatures', () => {
    it('flags explicit mock provider flags from client/hardware', () => {
      const res = detectMockSignatures({ accuracy: 5.0, isMockFlag: true });
      expect(res.isMockSuspicious).toBe(true);
    });

    it('flags physically impossible zero-meter satellite accuracy', () => {
      const res = detectMockSignatures({ accuracy: 0.0, isMockFlag: false });
      expect(res.isMockSuspicious).toBe(true);
    });

    it('passes normal physical GNSS satellite telemetry (e.g. 4.5m accuracy)', () => {
      const res = detectMockSignatures({ accuracy: 4.5, isMockFlag: false });
      expect(res.isMockSuspicious).toBe(false);
    });
  });
});
