import { describe, it, expect } from 'vitest';
import { parseLocationCoordinates, normalizeBarrierRow } from '@/services/barriers';

describe('Barriers & PostGIS Service', () => {
  describe('Coordinates Parsing (parseLocationCoordinates)', () => {
    it('parses GeoJSON Point objects with [lng, lat]', () => {
      const geojson = { type: 'Point', coordinates: [19.9365, 50.0614] };
      const parsed = parseLocationCoordinates(geojson);
      expect(parsed).toEqual({ lng: 19.9365, lat: 50.0614 });
    });

    it('parses WKT strings in POINT(lng lat) format', () => {
      const wkt = 'POINT(19.9482 50.0664)';
      const parsed = parseLocationCoordinates(wkt);
      expect(parsed).toEqual({ lng: 19.9482, lat: 50.0664 });
    });

    it('returns null for null, undefined, or malformed input', () => {
      expect(parseLocationCoordinates(null)).toBeNull();
      expect(parseLocationCoordinates(undefined)).toBeNull();
      expect(parseLocationCoordinates('')).toBeNull();
      expect(parseLocationCoordinates('INVALID_POINT')).toBeNull();
    });
  });

  describe('Barrier Normalization (normalizeBarrierRow)', () => {
    it('enforces AGENTS.md requirements: source, confidence_score, last_verified_at', () => {
      const rawRow = {
        id: 'barrier-123',
        barrier_type: 'HIGH_KERB',
        location: { type: 'Point', coordinates: [19.94, 50.06] },
        address_description: 'ul. Floriańska 10',
        details: { height_cm: 8 },
        source: 'CROWDSOURCED',
        confidence_score: 0.85,
        status: 'VERIFIED',
      };

      const normalized = normalizeBarrierRow(rawRow);

      expect(normalized.id).toBe('barrier-123');
      expect(normalized.barrier_type).toBe('HIGH_KERB');
      expect(normalized.latitude).toBe(50.06);
      expect(normalized.longitude).toBe(19.94);
      expect(normalized.source).toBe('CROWDSOURCED');
      expect(normalized.confidence_score).toBe(0.85);
      expect(normalized.status).toBe('VERIFIED');
      expect(normalized.last_verified_at).toBeDefined();
    });

    it('assigns safe defaults according to WCAG/AGENTS.md when optional fields are missing', () => {
      const rawRow = {
        id: 'barrier-fallback',
        barrier_type: 'STAIRS',
      };

      const normalized = normalizeBarrierRow(rawRow);

      expect(normalized.source).toBe('CROWDSOURCED');
      expect(normalized.status).toBe('UNVERIFIED');
      expect(normalized.confidence_score).toBe(0.5);
      expect(normalized.latitude).toBe(0);
      expect(normalized.longitude).toBe(0);
      expect(normalized.last_verified_at).toBeDefined();
    });
  });
});
