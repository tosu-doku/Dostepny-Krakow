import { describe, it, expect } from 'vitest';
import * as h3 from 'h3-js';
import {
  KRAKOW_GRID_CONFIG,
  coordsToTile,
  tileToBounds,
  parseTileId,
  getCellBoundary,
  getAllKrakowCells,
  routeToTiles,
  calculateUserRank,
  isInsideExplorationZone,
} from '@/services/grid';

describe('Kraków Uber H3 Hexagonal Grid & Discovery Service', () => {
  describe('Expanded Metropolitan Zone & Hexagonal Cell Projection', () => {
    it('identifies coordinates within Kraków expanded metropolitan zone', () => {
      // Rynek Główny (Sukiennice)
      expect(isInsideExplorationZone(50.0614, 19.9365)).toBe(true);
      // Dworzec Główny
      expect(isInsideExplorationZone(50.0664, 19.9482)).toBe(true);
      // Kazimierz (Plac Nowy) - now included in expanded zone!
      expect(isInsideExplorationZone(50.0520, 19.9450)).toBe(true);
      // Podgórze (Rynek Podgórski)
      expect(isInsideExplorationZone(50.0435, 19.9485)).toBe(true);
      // Błonia Krakowskie
      expect(isInsideExplorationZone(50.0590, 19.9050)).toBe(true);
      // Outside Krakow (Warszawa)
      expect(isInsideExplorationZone(52.2297, 21.0122)).toBe(false);
      // Outside Krakow (Zakopane)
      expect(isInsideExplorationZone(49.2992, 19.9496)).toBe(false);
    });

    it('generates the complete set of H3 hexagonal cells for Kraków', () => {
      const allCells = getAllKrakowCells();
      expect(allCells.length).toBe(KRAKOW_GRID_CONFIG.TOTAL_TILES);
      expect(allCells.length).toBeGreaterThan(600);

      // Verify each cell is a valid H3 index at Resolution 9
      for (const cell of allCells.slice(0, 20)) {
        expect(h3.isValidCell(cell)).toBe(true);
        expect(h3.getResolution(cell)).toBe(9);
      }
    });

    it('projects GPS coordinates to a valid H3 hexagon with 6 boundary vertices in O(1)', () => {
      const tile = coordsToTile(50.0614, 19.9365);
      expect(tile).not.toBeNull();
      if (!tile) return;

      expect(h3.isValidCell(tile.tileId)).toBe(true);
      expect(typeof tile.x).toBe('number');
      expect(typeof tile.y).toBe('number');

      // Hexagon must have exactly 6 boundary coordinates
      const boundary = getCellBoundary(tile.tileId);
      expect(boundary.length).toBe(6);

      // Envelope bounds encompass the query point
      const [[south, west], [north, east]] = tileToBounds(tile.tileId);
      expect(50.0614).toBeGreaterThanOrEqual(south);
      expect(50.0614).toBeLessThanOrEqual(north);
      expect(19.9365).toBeGreaterThanOrEqual(west);
      expect(19.9365).toBeLessThanOrEqual(east);
    });

    it('returns null for coordinates outside the exploration grid', () => {
      expect(coordsToTile(48.000, 19.000)).toBeNull();
      expect(coordsToTile(52.000, 21.000)).toBeNull();
    });

    it('parses both H3 hexadecimal indices and legacy x_y format bijectively', () => {
      const tile = coordsToTile(50.0614, 19.9365);
      expect(tile).not.toBeNull();
      if (!tile) return;

      const parsedH3 = parseTileId(tile.tileId);
      expect(parsedH3).not.toBeNull();
      expect(parsedH3?.x).toBe(tile.x);
      expect(parsedH3?.y).toBe(tile.y);

      const parsedLegacy = parseTileId('12_7');
      expect(parsedLegacy).toEqual({ x: 12, y: 7 });

      expect(parseTileId('invalid_format_xyz')).toBeNull();
    });
  });

  describe('Route Sampling (routeToTiles)', () => {
    it('samples polyline coordinates and returns unique intercepted H3 hexagons', () => {
      // Walk from Dworzec Główny through Planty to Sukiennice
      const routePolyline: [number, number][] = [
        [19.9482, 50.0664],
        [19.9420, 50.0640],
        [19.9400, 50.0630],
        [19.9380, 50.0620],
        [19.9365, 50.0614],
      ];

      const tiles = routeToTiles(routePolyline);
      expect(tiles.length).toBeGreaterThan(0);

      // All tile IDs must be unique valid H3 cells
      const uniqueSet = new Set(tiles);
      expect(uniqueSet.size).toBe(tiles.length);

      for (const tid of tiles) {
        expect(h3.isValidCell(tid)).toBe(true);
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

    it('accurately computes XP: +10 XP per hexagon and +100 XP per photo audit', () => {
      // 5 hexagons (+50 XP) + 1 photo (+100 XP) = 150 XP
      const rank = calculateUserRank(5, 1);
      expect(rank.totalXp).toBe(5 * 10 + 1 * 100);
      expect(rank.discoveredTilesCount).toBe(5);
      expect(rank.auditedTilesCount).toBe(1);
    });

    it('levels up as XP thresholds are surpassed', () => {
      // 20 hexagons (+200 XP) + 3 photos (+300 XP) = 500 XP
      const rank = calculateUserRank(20, 3);
      expect(rank.level).toBeGreaterThanOrEqual(2);
      expect(rank.progressPercent).toBeGreaterThanOrEqual(0);
      expect(rank.progressPercent).toBeLessThanOrEqual(100);
    });
  });
});
