import { describe, it, expect } from 'vitest';
import {
  calculateDistanceMeters,
  getProfileSpeedMps,
  calculateRealisticDurationSeconds,
} from '@/services/routing';
import { Barrier } from '@/types/barrier';

describe('Routing & Accessibility Service', () => {
  describe('Haversine Distance (calculateDistanceMeters)', () => {
    it('calculates 0 meters for identical points', () => {
      const dist = calculateDistanceMeters(50.0614, 19.9365, 50.0614, 19.9365);
      expect(dist).toBe(0);
    });

    it('calculates accurate distance between known Kraków landmarks', () => {
      // Dworzec Główny (50.0664, 19.9482) -> Rynek Główny (50.0614, 19.9365) ~ 950-1050 meters
      const dist = calculateDistanceMeters(50.0664, 19.9482, 50.0614, 19.9365);
      expect(dist).toBeGreaterThan(900);
      expect(dist).toBeLessThan(1100);
    });
  });

  describe('Profile Speeds (getProfileSpeedMps)', () => {
    it('sets wheelchair pace to accessible speed (~0.89 m/s)', () => {
      expect(getProfileSpeedMps('wheelchair')).toBeCloseTo(0.89, 2);
    });

    it('sets stroller pace to moderate walking speed (~0.97 m/s)', () => {
      expect(getProfileSpeedMps('stroller')).toBeCloseTo(0.97, 2);
    });

    it('sets visually impaired pace to careful navigation speed (~0.83 m/s)', () => {
      expect(getProfileSpeedMps('visually_impaired')).toBeCloseTo(0.83, 2);
    });

    it('sets standard pedestrian speed to ~1.19 m/s', () => {
      expect(getProfileSpeedMps('foot_walking')).toBeCloseTo(1.19, 2);
    });
  });

  describe('Realistic Duration & Obstacle Penalties', () => {
    it('calculates base walking duration without obstacles', () => {
      const distance = 1000; // 1 km
      const duration = calculateRealisticDurationSeconds(distance, 'foot_walking', []);
      // 1000m / 1.19 m/s ~ 840s (~14 min)
      expect(duration).toBeGreaterThan(800);
      expect(duration).toBeLessThan(900);
    });

    it('adds extra time penalty for wheelchair when stairs or high kerbs exist', () => {
      const distance = 500;
      const stairsBarrier: Barrier = {
        id: 'barrier-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        barrier_type: 'STAIRS',
        location: undefined,
        latitude: 50.062,
        longitude: 19.937,
        details: { step_count: 5, has_ramp: false },
        source: 'CROWDSOURCED',
        status: 'VERIFIED',
        confidence_score: 0.9,
        last_verified_at: new Date().toISOString(),
        upvotes: 3,
      };

      const highKerbBarrier: Barrier = {
        id: 'barrier-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        barrier_type: 'HIGH_KERB',
        location: undefined,
        latitude: 50.063,
        longitude: 19.938,
        details: { height_cm: 12 },
        source: 'CROWDSOURCED',
        status: 'VERIFIED',
        confidence_score: 0.9,
        last_verified_at: new Date().toISOString(),
        upvotes: 2,
      };

      const baseDuration = calculateRealisticDurationSeconds(distance, 'wheelchair', []);
      const penalizedDuration = calculateRealisticDurationSeconds(distance, 'wheelchair', [
        stairsBarrier,
        highKerbBarrier,
      ]);

      // STAIRS adds +120s, HIGH_KERB adds +40s => total +160s
      expect(penalizedDuration).toBe(baseDuration + 160);
    });

    it('adds realistic vibration and rolling delay for wheelchair on cobblestone surfaces', () => {
      const distance = 400;
      const cobblestoneBarrier: Barrier = {
        id: 'cobble-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        barrier_type: 'COBBLESTONE_SURFACE',
        location: undefined,
        latitude: 50.0614,
        longitude: 19.9365,
        details: { surface: 'sett', smoothness: 'intermediate' },
        source: 'OSM',
        status: 'VERIFIED',
        confidence_score: 0.95,
        last_verified_at: new Date().toISOString(),
      };

      const baseDuration = calculateRealisticDurationSeconds(distance, 'wheelchair', []);
      const penalizedDuration = calculateRealisticDurationSeconds(distance, 'wheelchair', [cobblestoneBarrier]);

      // COBBLESTONE_SURFACE adds +45s for wheelchair
      expect(penalizedDuration).toBe(baseDuration + 45);
    });

    it('does not penalize duration for nearby off-path obstacles (is_nearby: true)', () => {
      const distance = 400;
      const nearbyStairs: Barrier = {
        id: 'stairs-nearby',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        barrier_type: 'STAIRS',
        latitude: 50.0665,
        longitude: 19.944,
        details: { step_count: 8 },
        source: 'OSM',
        status: 'VERIFIED',
        confidence_score: 0.9,
        last_verified_at: new Date().toISOString(),
        is_nearby: true,
        distance_from_route: 18,
      };

      const baseDuration = calculateRealisticDurationSeconds(distance, 'wheelchair', []);
      const nearbyDuration = calculateRealisticDurationSeconds(distance, 'wheelchair', [nearbyStairs]);

      // Should not add 120s penalty because it is off-path
      expect(nearbyDuration).toBe(baseDuration);
    });
  });

  describe('Polyline Segment Distance (minDistanceToPolyline)', () => {
    it('calculates accurate perpendicular distance to intermediate point along segment', async () => {
      const { minDistanceToPolyline } = await import('@/services/routing');
      // Segment from (50.0600, 19.9400) to (50.0600, 19.9500)
      const polyline: [number, number][] = [
        [19.9400, 50.0600],
        [19.9500, 50.0600],
      ];
      // Point midway along segment, offset by ~0.0001 deg latitude (~11 meters north)
      const point = { lat: 50.0601, lng: 19.9450 };
      const dist = minDistanceToPolyline(point, polyline);

      expect(dist).toBeGreaterThan(9);
      expect(dist).toBeLessThan(13);
    });
  });
});
