import { getSupabaseAdmin } from './supabase';
import {
  KRAKOW_GRID_CONFIG,
  parseTileId,
  calculateUserRank,
  UserRank,
} from './grid';

export interface DiscoveredTileRecord {
  tile_id: string;
  tile_x: number;
  tile_y: number;
  has_photo_contribution: boolean;
  unlocked_at: string;
}

export interface CityExplorationSummary {
  total_tiles: number;
  discovered_tiles_count: number;
  audited_with_photos_count: number;
  percentage_discovered: number;
  total_explorers: number;
}

export interface UnlockResult {
  newly_unlocked_tiles: string[];
  total_unlocked_count: number;
  audited_photos_count: number;
  xp_gained: number;
  user_rank: UserRank;
}

// In-memory fallback map of user discovered tiles (used when user is guest or before SQL table is created in Supabase)
// Map<userIdOrSessionKey, Map<tileId, DiscoveredTileRecord>>
const fallbackDiscoveryStore: Map<string, Map<string, DiscoveredTileRecord>> = new Map();

/**
 * Unlocks a list of tile IDs for a user.
 * Awards +10 XP per new tile and +100 XP if hasPhoto is true.
 */
export async function unlockTilesForUser(
  userId: string | null,
  tileIds: string[],
  hasPhoto: boolean = false
): Promise<UnlockResult> {
  const effectiveUserId = userId || 'guest_user';
  const now = new Date().toISOString();
  const newlyUnlocked: string[] = [];
  const supabase = getSupabaseAdmin();

  // Validate tileIds
  const validTiles: { x: number; y: number; tileId: string }[] = [];
  for (const tid of tileIds) {
    const parsed = parseTileId(tid);
    if (parsed) {
      if (
        parsed.x >= 0 &&
        parsed.x < KRAKOW_GRID_CONFIG.COLS &&
        parsed.y >= 0 &&
        parsed.y < KRAKOW_GRID_CONFIG.ROWS
      ) {
        validTiles.push({ x: parsed.x, y: parsed.y, tileId: tid });
      }
    }
  }

  // 1. Always update local/fallback in-memory store
  let userMap = fallbackDiscoveryStore.get(effectiveUserId);
  if (!userMap) {
    userMap = new Map();
    fallbackDiscoveryStore.set(effectiveUserId, userMap);
  }

  for (const { x, y, tileId } of validTiles) {
    const existing = userMap.get(tileId);
    if (!existing) {
      newlyUnlocked.push(tileId);
      userMap.set(tileId, {
        tile_id: tileId,
        tile_x: x,
        tile_y: y,
        has_photo_contribution: hasPhoto,
        unlocked_at: now,
      });
    } else if (hasPhoto && !existing.has_photo_contribution) {
      existing.has_photo_contribution = true;
    }
  }

  // 2. If authenticated, persist to Supabase PostgreSQL
  if (userId && validTiles.length > 0) {
    try {
      const recordsToUpsert = validTiles.map((t) => ({
        user_id: userId,
        tile_x: t.x,
        tile_y: t.y,
        tile_id: t.tileId,
        has_photo_contribution: hasPhoto,
        unlocked_at: now,
      }));

      await supabase.from('user_discovered_tiles').upsert(recordsToUpsert, {
        onConflict: 'user_id,tile_x,tile_y',
        ignoreDuplicates: false,
      });
    } catch (err: any) {
      console.warn('[Discovery] Supabase upsert fallback:', err.message);
    }
  }

  // Calculate user stats & rank
  const allUserTiles = Array.from(userMap.values());
  const totalCount = allUserTiles.length;
  const photosCount = allUserTiles.filter((t) => t.has_photo_contribution).length;
  const xpGained = newlyUnlocked.length * 10 + (hasPhoto ? 100 : 0);
  const userRank = calculateUserRank(totalCount, photosCount);

  return {
    newly_unlocked_tiles: newlyUnlocked,
    total_unlocked_count: totalCount,
    audited_photos_count: photosCount,
    xp_gained: xpGained,
    user_rank: userRank,
  };
}

/**
 * Fetches all unlocked tiles for a given user.
 */
export async function getUserDiscoveredTiles(userId: string | null): Promise<DiscoveredTileRecord[]> {
  const effectiveUserId = userId || 'guest_user';
  const supabase = getSupabaseAdmin();

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('user_discovered_tiles')
        .select('tile_id, tile_x, tile_y, has_photo_contribution, unlocked_at')
        .eq('user_id', userId);

      if (!error && data && data.length > 0) {
        // Sync back into in-memory store
        let userMap = fallbackDiscoveryStore.get(userId);
        if (!userMap) {
          userMap = new Map();
          fallbackDiscoveryStore.set(userId, userMap);
        }
        for (const row of data) {
          userMap.set(row.tile_id, row);
        }
        return data;
      }
    } catch {
      // Fall through to in-memory store
    }
  }

  const userMap = fallbackDiscoveryStore.get(effectiveUserId);
  return userMap ? Array.from(userMap.values()) : [];
}

/**
 * Fetches collective city exploration statistics.
 */
export async function getCityExplorationSummary(): Promise<CityExplorationSummary> {
  const totalTiles = KRAKOW_GRID_CONFIG.TOTAL_TILES; // 1,188
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.from('city_exploration_stats').select('*');

    if (!error && data && data.length > 0) {
      const discoveredCount = data.length;
      const auditedCount = data.filter((row: any) => row.is_audited_with_photo).length;
      const percentage = Math.round((discoveredCount / totalTiles) * 1000) / 10;

      let totalExplorers = 0;
      for (const row of data) {
        totalExplorers = Math.max(totalExplorers, row.explorers_count || 1);
      }

      return {
        total_tiles: totalTiles,
        discovered_tiles_count: discoveredCount,
        audited_with_photos_count: auditedCount,
        percentage_discovered: percentage,
        total_explorers: totalExplorers,
      };
    }
  } catch {
    // Fallback to in-memory store aggregation
  }

  // Fallback: aggregate in-memory store
  const uniqueTiles = new Set<string>();
  let auditedCount = 0;
  for (const userMap of fallbackDiscoveryStore.values()) {
    for (const t of userMap.values()) {
      uniqueTiles.add(t.tile_id);
      if (t.has_photo_contribution) auditedCount++;
    }
  }

  const discoveredCount = uniqueTiles.size;
  const percentage = Math.round((discoveredCount / totalTiles) * 1000) / 10;

  return {
    total_tiles: totalTiles,
    discovered_tiles_count: discoveredCount,
    audited_with_photos_count: auditedCount,
    percentage_discovered: percentage,
    total_explorers: Math.max(1, fallbackDiscoveryStore.size),
  };
}
