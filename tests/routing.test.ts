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
  });
});
