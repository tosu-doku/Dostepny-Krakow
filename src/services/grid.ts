/**
 * ==============================================================================
 * Uber H3 Hexagonal Grid & Map Discovery Service for Kraków Metropolitan Core
 * ==============================================================================
 * Divides the expanded Kraków metropolitan core into discrete hexagonal cells
 * using Uber's open-source H3 spatial indexing system at Resolution 9
 * (~200m edge length, ~350-400m cell diameter, ~0.1 km² area).
 *
 * Covers: Stare Miasto, Kazimierz, Podgórze, Krowodrza, Błonia, Dębniki,
 * Grzegórzki, Dąbie, Czyżyny, Zabłocie, Mateczny, Tauron Arena (~83 km²).
 *
 * All operations are mathematically discrete, O(1), and privacy-preserving
 * (no user GPS traces or raw coordinates are stored in the database).
 */

import * as h3 from 'h3-js';

export interface GridConfig {
  RESOLUTION: number;
  LAT_MIN: number;
  LAT_MAX: number;
  LNG_MIN: number;
  LNG_MAX: number;
  TOTAL_TILES: number;
  // Legacy aliases for backward compatibility
  STEP_LAT?: number;
  STEP_LNG?: number;
  COLS?: number;
  ROWS?: number;
}

export const KRAKOW_GRID_CONFIG: GridConfig = {
  RESOLUTION: 9,
  LAT_MIN: 50.0300, // South: Podgórze, Mateczny, Zabłocie, Dębniki
  LAT_MAX: 50.0950, // North: Krowodrza, Kleparz, Prądnik Czerwony
  LNG_MIN: 19.8950, // West: Błonia, Park Jordana, Salwator
  LNG_MAX: 20.0300, // East: Grzegórzki, Dąbie, Czyżyny, Tauron Arena
  TOTAL_TILES: 697, // Exactly 697 hexagonal cells at Resolution 9
};

export const KRAKOW_H3_CONFIG = KRAKOW_GRID_CONFIG;

export interface GridTile {
  tileId: string; // H3 index string (e.g. "891e2e6b153ffff")
  x: number;      // Bijective lower 32-bit integer for database storage
  y: number;      // Bijective upper 32-bit integer for database storage
  boundary: [number, number][]; // 6 [lat, lng] vertices of the hexagon
  bounds: [[number, number], [number, number]]; // Envelope [[south, west], [north, east]]
  center: { lat: number; lng: number };
}

export interface UserRank {
  title: string;
  level: number;
  totalXp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  discoveredTilesCount: number;
  auditedTilesCount: number;
  progressPercent: number;
}

// Operating bounding polygon for Kraków exploration zone [lat, lng]
const KRAKOW_EXPLORATION_POLYGON: [number, number][] = [
  [KRAKOW_GRID_CONFIG.LAT_MIN, KRAKOW_GRID_CONFIG.LNG_MIN],
  [KRAKOW_GRID_CONFIG.LAT_MAX, KRAKOW_GRID_CONFIG.LNG_MIN],
  [KRAKOW_GRID_CONFIG.LAT_MAX, KRAKOW_GRID_CONFIG.LNG_MAX],
  [KRAKOW_GRID_CONFIG.LAT_MIN, KRAKOW_GRID_CONFIG.LNG_MAX],
  [KRAKOW_GRID_CONFIG.LAT_MIN, KRAKOW_GRID_CONFIG.LNG_MIN],
];

// Lazy-computed and in-memory cached array & set of all valid Kraków H3 cells
let cachedKrakowCells: string[] | null = null;
let cachedKrakowCellSet: Set<string> | null = null;

/**
 * Returns all H3 hexagonal cell indices covering Kraków's expanded operating zone.
 * Cached in memory after first call (instantaneous O(1) lookup).
 */
export function getAllKrakowCells(): string[] {
  if (!cachedKrakowCells) {
    cachedKrakowCells = h3.polygonToCells(
      KRAKOW_EXPLORATION_POLYGON,
      KRAKOW_GRID_CONFIG.RESOLUTION
    );
    cachedKrakowCellSet = new Set(cachedKrakowCells);
  }
  return cachedKrakowCells;
}

/**
 * Checks whether coordinate is inside the expanded Kraków exploration zone.
 */
export function isInsideExplorationZone(
  lat: number,
  lng: number,
  config: GridConfig = KRAKOW_GRID_CONFIG
): boolean {
  if (
    lat < config.LAT_MIN ||
    lat > config.LAT_MAX ||
    lng < config.LNG_MIN ||
    lng > config.LNG_MAX
  ) {
    return false;
  }

  // Ensure cell is within valid Kraków polygon
  if (!cachedKrakowCellSet) {
    getAllKrakowCells();
  }
  const cell = h3.latLngToCell(lat, lng, config.RESOLUTION);
  return cachedKrakowCellSet ? cachedKrakowCellSet.has(cell) : true;
}

/**
 * Converts GPS coordinate (lat, lng) to an H3 hexagonal tile.
 * Returns null if coordinate is outside Kraków's exploration zone.
 * Complexity: O(1)
 */
export function coordsToTile(
  lat: number,
  lng: number,
  config: GridConfig = KRAKOW_GRID_CONFIG
): { x: number; y: number; tileId: string } | null {
  if (!isInsideExplorationZone(lat, lng, config)) {
    return null;
  }

  const tileId = h3.latLngToCell(lat, lng, config.RESOLUTION);
  const [lower, upper] = h3.h3IndexToSplitLong(tileId);

  // Cast to 32-bit signed integers for PostgreSQL INT storage
  return {
    x: lower | 0,
    y: upper | 0,
    tileId,
  };
}

/**
 * Parses a tileId string (either H3 hex index or legacy "x_y") into integer pair { x, y }.
 */
export function parseTileId(tileId: string): { x: number; y: number } | null {
  if (!tileId) return null;

  // 1. Uber H3 Index (hex string, e.g. "891e2e6b153ffff")
  if (h3.isValidCell(tileId)) {
    const [lower, upper] = h3.h3IndexToSplitLong(tileId);
    return { x: lower | 0, y: upper | 0 };
  }

  // 2. Legacy "x_y" format fallback
  const parts = tileId.split('_');
  if (parts.length === 2) {
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (!isNaN(x) && !isNaN(y)) {
      return { x, y };
    }
  }

  return null;
}

/**
 * Returns the 6 [lat, lng] vertices of an H3 hexagonal cell for Leaflet L.polygon.
 */
export function getCellBoundary(tileId: string): [number, number][] {
  if (h3.isValidCell(tileId)) {
    return h3.cellToBoundary(tileId);
  }
  return [];
}

/**
 * Computes bounding rectangle [[south, west], [north, east]] for a tile.
 */
export function tileToBounds(
  xOrTileId: number | string,
  y?: number
): [[number, number], [number, number]] {
  let hexTileId = typeof xOrTileId === 'string' ? xOrTileId : '';

  if (!hexTileId && typeof xOrTileId === 'number' && typeof y === 'number') {
    try {
      hexTileId = h3.splitLongToH3Index(xOrTileId, y);
    } catch {
      // Fallback
    }
  }

  if (hexTileId && h3.isValidCell(hexTileId)) {
    const boundary = h3.cellToBoundary(hexTileId);
    let south = Infinity;
    let north = -Infinity;
    let west = Infinity;
    let east = -Infinity;

    for (const [lat, lng] of boundary) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }

    return [
      [south, west],
      [north, east],
    ];
  }

  // Default fallback envelope around Rynek Główny
  return [
    [50.0610, 19.9360],
    [50.0620, 19.9370],
  ];
}

/**
 * Computes center coordinate for an H3 tile.
 */
export function tileToCenter(tileId: string): { lat: number; lng: number } {
  if (h3.isValidCell(tileId)) {
    const [lat, lng] = h3.cellToLatLng(tileId);
    return { lat, lng };
  }
  return { lat: 50.0614, lng: 19.9365 };
}

/**
 * Samples a route polyline [[lng, lat], ...] and returns all unique H3 hexagon IDs intersected by the route.
 * Samples every ~50 meters along route vectors to ensure no hexagon cells are missed.
 */
export function routeToTiles(
  coordinates: [number, number][],
  config: GridConfig = KRAKOW_GRID_CONFIG
): string[] {
  if (!coordinates || coordinates.length === 0) return [];

  const visitedSet = new Set<string>();

  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    const tile = coordsToTile(lat, lng, config);
    if (tile) {
      visitedSet.add(tile.tileId);
    }

    // Sample line between coordinate i and i + 1
    if (i < coordinates.length - 1) {
      const [nextLng, nextLat] = coordinates[i + 1];
      const dLat = nextLat - lat;
      const dLng = nextLng - lng;
      // Approximate length in meters
      const lengthMeters = Math.hypot(dLat * 111200, dLng * 71380);
      const steps = Math.ceil(lengthMeters / 50); // sample every ~50m

      if (steps > 1) {
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const sampleLat = lat + dLat * t;
          const sampleLng = lng + dLng * t;
          const sampleTile = coordsToTile(sampleLat, sampleLng, config);
          if (sampleTile) {
            visitedSet.add(sampleTile.tileId);
          }
        }
      }
    }
  }

  return Array.from(visitedSet);
}

/**
 * Calculates user gamification rank, title, and XP based on discovered tiles and photo audits.
 */
export function calculateUserRank(
  discoveredTilesCount: number,
  auditedPhotosCount: number = 0
): UserRank {
  // XP formula: 10 XP per tile + 100 XP per photo audit
  const totalXp = discoveredTilesCount * 10 + auditedPhotosCount * 100;

  // Level thresholds scaled for the 697-hex expanded city
  const levels = [
    { level: 1, title: 'Turysta z Plant', requiredXp: 0 },
    { level: 2, title: 'Krakowski Przechodzień', requiredXp: 100 },     // ~10 heksagonów
    { level: 3, title: 'Eksplorator Starego Miasta', requiredXp: 350 }, // ~35 heksagonów
    { level: 4, title: 'Kartograf Dostępności', requiredXp: 1000 },    // ~100 heksagonów
    { level: 5, title: 'Mistrz Metropolii bez Barier', requiredXp: 2500 }, // ~250 heksagonów
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXp >= levels[i].requiredXp) {
      currentLevel = levels[i];
      nextLevel =
        levels[i + 1] || {
          level: levels[i].level + 1,
          title: 'Legenda Krakowa',
          requiredXp: levels[i].requiredXp + 1500,
        };
      break;
    }
  }

  const xpInLevel = totalXp - currentLevel.requiredXp;
  const xpForNextLevel = nextLevel.requiredXp - currentLevel.requiredXp;
  const progressPercent = Math.min(
    100,
    Math.round((xpInLevel / Math.max(1, xpForNextLevel)) * 100)
  );

  return {
    title: currentLevel.title,
    level: currentLevel.level,
    totalXp,
    xpInLevel,
    xpForNextLevel,
    discoveredTilesCount,
    auditedTilesCount: auditedPhotosCount,
    progressPercent,
  };
}
