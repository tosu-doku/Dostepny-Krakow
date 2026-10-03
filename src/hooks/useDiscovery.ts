'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/types/user';
import { routeToTiles, coordsToTile, calculateUserRank, UserRank } from '@/services/grid';

export interface UseDiscoveryReturn {
  discoveredTileIds: string[];
  auditedTileIds: string[];
  userRank: UserRank | null;
  showDiscoveryGrid: boolean;
  setShowDiscoveryGrid: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDiscoveryGrid: () => void;
  fetchDiscoveryTiles: () => Promise<void>;
  unlockRouteTiles: (routeCoords: [number, number][]) => Promise<void>;
  unlockBarrierTile: (lat: number, lng: number, hasPhoto: boolean) => Promise<void>;
  discoveredTileIdsRef: React.RefObject<string[]>;
}

export function useDiscovery(currentUser: User | null): UseDiscoveryReturn {
  const [discoveredTileIds, setDiscoveredTileIds] = useState<string[]>([]);
  const [auditedTileIds, setAuditedTileIds] = useState<string[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [showDiscoveryGrid, setShowDiscoveryGrid] = useState<boolean>(true);

  // Ref to hold current discoveredTileIds to avoid stale closures in callbacks
  const discoveredTileIdsRef = useRef<string[]>([]);
  useEffect(() => {
    discoveredTileIdsRef.current = discoveredTileIds;
  }, [discoveredTileIds]);

  // Fetch discovery tiles for current user (or guest)
  const fetchDiscoveryTiles = useCallback(async () => {
    try {
      const url = currentUser?.id
        ? `/api/discovery/my-tiles?user_id=${currentUser.id}`
        : '/api/discovery/my-tiles';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const tiles = data.tiles || [];
        const disc: string[] = tiles.map((t: any) => t.tile_id);
        const audited: string[] = tiles
          .filter((t: any) => t.has_photo_contribution)
          .map((t: any) => t.tile_id);
        setDiscoveredTileIds(disc);
        setAuditedTileIds(audited);
        const rank = calculateUserRank(disc.length, audited.length);
        setUserRank(rank);
      }
    } catch (err) {
      console.warn('Nie udało się pobrać kafli eksploracji:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDiscoveryTiles();
  }, [fetchDiscoveryTiles]);

  // Unlock tiles intersected by a calculated route (+10 XP per tile)
  const unlockRouteTiles = useCallback(
    async (routeCoords: [number, number][]) => {
      if (!routeCoords || routeCoords.length === 0) return;
      const routeTiles = routeToTiles(routeCoords);
      if (routeTiles.length === 0) return;

      try {
        const res = await fetch('/api/discovery/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser?.id,
            tile_ids: routeTiles,
            has_photo: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user_rank) {
            setUserRank(data.user_rank);
          }
          fetchDiscoveryTiles();
        }
      } catch (err) {
        console.warn('Błąd podczas odblokowywania kafelków trasy:', err);
      }
    },
    [currentUser, fetchDiscoveryTiles]
  );

  // Unlock tile when a new barrier is reported (+100 XP with photo)
  const unlockBarrierTile = useCallback(
    async (lat: number, lng: number, hasPhoto: boolean) => {
      const tile = coordsToTile(lat, lng);
      if (!tile) return;

      try {
        const res = await fetch('/api/discovery/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser?.id,
            tile_ids: [tile.tileId],
            has_photo: hasPhoto,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user_rank) {
            setUserRank(data.user_rank);
          }
          fetchDiscoveryTiles();
        }
      } catch (err) {
        console.warn('Błąd podczas odblokowywania kafelka po zgłoszeniu bariery:', err);
      }
    },
    [currentUser, fetchDiscoveryTiles]
  );

  const toggleDiscoveryGrid = useCallback(() => {
    setShowDiscoveryGrid((prev) => !prev);
  }, []);

  return {
    discoveredTileIds,
    auditedTileIds,
    userRank,
    showDiscoveryGrid,
    setShowDiscoveryGrid,
    toggleDiscoveryGrid,
    fetchDiscoveryTiles,
    unlockRouteTiles,
    unlockBarrierTile,
    discoveredTileIdsRef,
  };
}
