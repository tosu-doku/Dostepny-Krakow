import { describe, it, expect } from 'vitest';
import {
  KRAKOW_GRID_CONFIG,
  coordsToTile,
  tileToBounds,
  parseTileId,
  routeToTiles,
  calculateUserRank,
  isInsideExplorationZone,
} from '@/services/grid';

describe('Kraków Grid & Discovery Service', () => {
  describe('Grid Bounding Box & Coordinates Projection', () => {
    it('identifies coordinates within Kraków city center exploration zone', () => {
      // Rynek Główny (Sukiennice)
      expect(isInsideExplorationZone(50.0614, 19.9365)).toBe(true);
      // Dworzec Główny
      expect(isInsideExplorationZone(50.0664, 19.9482)).toBe(true);
      // Kazimierz (Plac Nowy)
      expect(isInsideExplorationZone(50.0520, 19.9450)).toBe(false); // below 50.0550 LAT_MIN
      // Outside Krakow (Warszawa)
      expect(isInsideExplorationZone(52.2297, 21.0122)).toBe(false);
    });

    it('projects valid coordinate to a discrete GridTile in O(1)', () => {
      const tile = coordsToTile(50.0614, 19.9365);
      expect(tile).not.toBeNull();
      if (!tile) return;

      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(KRAKOW_GRID_CONFIG.COLS);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(KRAKOW_GRID_CONFIG.ROWS);
      expect(tile.tileId).toBe(`${tile.x}_${tile.y}`);

      // Verify bounds encompass the query point
      const [[south, west], [north, east]] = tileToBounds(tile.x, tile.y);
      expect(50.0614).toBeGreaterThanOrEqual(south);
      expect(50.0614).toBeLessThanOrEqual(north);
      expect(19.9365).toBeGreaterThanOrEqual(west);
      expect(19.9365).toBeLessThanOrEqual(east);
    });

    it('returns null for coordinates outside the exploration grid', () => {
      expect(coordsToTile(49.000, 19.000)).toBeNull();
      expect(coordsToTile(51.000, 21.000)).toBeNull();
    });

    it('calculates accurate bounds for a given tile ID', () => {
      const bounds = tileToBounds(0, 0);
      expect(bounds[0][0]).toBeCloseTo(KRAKOW_GRID_CONFIG.LAT_MIN, 4);
      expect(bounds[0][1]).toBeCloseTo(KRAKOW_GRID_CONFIG.LNG_MIN, 4);

      const parsed = parseTileId('12_7');
      expect(parsed).toEqual({ x: 12, y: 7 });

      expect(parseTileId('invalid_tile_format')).toBeNull();
    });
  });

  describe('Route Sampling (routeToTiles)', () => {
    it('samples polyline coordinates and returns unique intercepted tiles', () => {
      // Small walk from Planty near Teatr Słowackiego to Sukiennice
      const routePolyline: [number, number][] = [
        [19.9420, 50.0640],
        [19.9400, 50.0630],
        [19.9380, 50.0620],
        [19.9365, 50.0614],
      ];

      const tiles = routeToTiles(routePolyline);
      expect(tiles.length).toBeGreaterThan(0);
      // All IDs must be unique
      const uniqueSet = new Set(tiles);
      expect(uniqueSet.size).toBe(tiles.length);

      // Each ID must follow the 'x_y' format
      for (const tid of tiles) {
        expect(parseTileId(tid)).not.toBeNull();
      }
    });

    it('returns empty array when route coordinates are empty', () => {
      expect(routeToTiles([])).toEqual([]);
    });
  });

  describe('Gamification & User Rank Progression', () => {
    it('awards Level 1 for a beginner with 0 tiles', () => {
      const rank = calculateUserRank(0, 0);
      expect(rank.level).toBe(1);
      expect(rank.title).toBe('Turysta z Plant');
      expect(rank.totalXp).toBe(0);
      expect(rank.progressPercent).toBe(0);
    });

    it('accurately computes XP: +10 XP per tile and +100 XP per photo audit', () => {
      // 5 tiles discovered (+50 XP) + 1 photo (+100 XP) = 150 XP
      const rank = calculateUserRank(5, 1);
      expect(rank.totalXp).toBe(5 * 10 + 1 * 100);
      expect(rank.discoveredTilesCount).toBe(5);
      expect(rank.auditedTilesCount).toBe(1);
    });

    it('levels up as XP thresholds are surpassed', () => {
      // 20 tiles (+200 XP) + 3 photos (+300 XP) = 500 XP
      const rank = calculateUserRank(20, 3);
      expect(rank.level).toBeGreaterThanOrEqual(2);
      expect(rank.progressPercent).toBeGreaterThanOrEqual(0);
      expect(rank.progressPercent).toBeLessThanOrEqual(100);
    });
  });
});
