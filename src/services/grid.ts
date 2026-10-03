/**
 * ==============================================================================
 * Grid & Map Discovery Service for Kraków City Center
 * ==============================================================================
 * Divides Kraków śródmieście into a discrete ~100m x 100m grid for exploration,
 * gamification ("Fog of War"), and crowdsourcing motivation.
 *
 * All conversions are strictly O(1) mathematical projections.
 * No user GPS trails are stored — only discrete tile IDs.
 */

export interface GridConfig {
  LAT_MIN: number;
  LAT_MAX: number;
  LNG_MIN: number;
  LNG_MAX: number;
  STEP_LAT: number; // ~100.08 m in latitude
  STEP_LNG: number; // ~99.93 m in longitude
  COLS: number;     // Number of columns along Longitude (X)
  ROWS: number;     // Number of rows along Latitude (Y)
  TOTAL_TILES: number;
}

export const KRAKOW_GRID_CONFIG: GridConfig = {
  LAT_MIN: 50.0550,
  LAT_MAX: 50.0750,
  LNG_MIN: 19.9250,
  LNG_MAX: 20.0000,
  STEP_LAT: 0.0009, // ~100.08 m (111,200 m * 0.0009)
  STEP_LNG: 0.0014, // ~99.93 m (71,380 m * 0.0014)
  COLS: 54,         // Math.ceil((20.0000 - 19.9250) / 0.0014) = 54
  ROWS: 22,         // Math.ceil((50.0750 - 50.0550) / 0.0009) = 22
  TOTAL_TILES: 54 * 22, // 1,188 tiles total
};

export interface GridTile {
  x: number;
  y: number;
  tileId: string; // e.g. "14_8"
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
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

/**
 * Checks whether coordinate is inside the Kraków exploration zone.
 */
export function isInsideExplorationZone(
  lat: number,
  lng: number,
  config: GridConfig = KRAKOW_GRID_CONFIG
): boolean {
  return (
    lat >= config.LAT_MIN &&
    lat <= config.LAT_MAX &&
    lng >= config.LNG_MIN &&
    lng <= config.LNG_MAX
  );
}

/**
 * Converts GPS coordinate (lat, lng) to discrete tile indices (x, y).
 * Returns null if coordinate is outside the zone.
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

  const x = Math.floor((lng - config.LNG_MIN) / config.STEP_LNG);
  const y = Math.floor((lat - config.LAT_MIN) / config.STEP_LAT);

  // Clamp within grid bounds
  const clampedX = Math.max(0, Math.min(x, config.COLS - 1));
  const clampedY = Math.max(0, Math.min(y, config.ROWS - 1));

  return {
    x: clampedX,
    y: clampedY,
    tileId: `${clampedX}_${clampedY}`,
  };
}

/**
 * Parses a tileId string (e.g. "14_8") into x and y.
 */
export function parseTileId(tileId: string): { x: number; y: number } | null {
  const parts = tileId.split('_');
  if (parts.length !== 2) return null;
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (isNaN(x) || isNaN(y)) return null;
  return { x, y };
}

/**
 * Computes bounding rectangle coordinates for Leaflet [[south, west], [north, east]].
 * Complexity: O(1)
 */
export function tileToBounds(
  x: number,
  y: number,
  config: GridConfig = KRAKOW_GRID_CONFIG
): [[number, number], [number, number]] {
  const south = config.LAT_MIN + y * config.STEP_LAT;
  const north = south + config.STEP_LAT;
  const west = config.LNG_MIN + x * config.STEP_LNG;
  const east = west + config.STEP_LNG;

  return [
    [south, west],
    [north, east],
  ];
}

/**
 * Computes center coordinate for a tile.
 * Complexity: O(1)
 */
export function tileToCenter(
  x: number,
  y: number,
  config: GridConfig = KRAKOW_GRID_CONFIG
): { lat: number; lng: number } {
  return {
    lat: config.LAT_MIN + (y + 0.5) * config.STEP_LAT,
    lng: config.LNG_MIN + (x + 0.5) * config.STEP_LNG,
  };
}

/**
 * Gets full tile object by indices.
 */
export function getTile(
  x: number,
  y: number,
  config: GridConfig = KRAKOW_GRID_CONFIG
): GridTile {
  return {
    x,
    y,
    tileId: `${x}_${y}`,
    bounds: tileToBounds(x, y, config),
    center: tileToCenter(x, y, config),
  };
}

/**
 * Samples a route polyline [[lng, lat], ...] and returns all unique tile IDs intersected by the route.
 * Samples every ~30 meters along segment vectors to ensure no diagonal tiles are missed.
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
      const steps = Math.ceil(lengthMeters / 35); // sample every ~35m

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

  // Level thresholds
  const levels = [
    { level: 1, title: 'Turysta z Plant', requiredXp: 0 },
    { level: 2, title: 'Krakowski Przechodzień', requiredXp: 150 },     // ~15 tiles
    { level: 3, title: 'Eksplorator Starego Miasta', requiredXp: 500 },  // ~50 tiles
    { level: 4, title: 'Kartograf Dostępności', requiredXp: 1500 },     // ~150 tiles
    { level: 5, title: 'Mistrz Krakowa bez Barier', requiredXp: 3500 }, // ~350 tiles
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXp >= levels[i].requiredXp) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1] || { level: levels[i].level + 1, title: 'Legenda Krakowa', requiredXp: levels[i].requiredXp + 2000 };
      break;
    }
  }

  const xpInLevel = totalXp - currentLevel.requiredXp;
  const xpForNextLevel = nextLevel.requiredXp - currentLevel.requiredXp;
  const progressPercent = Math.min(100, Math.round((xpInLevel / Math.max(1, xpForNextLevel)) * 100));

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
