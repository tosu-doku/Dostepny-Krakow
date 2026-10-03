'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/user';
import { coordsToTile } from '@/services/grid';

interface UseLiveLocationProps {
  currentUser: User | null;
  discoveredTileIdsRef: React.RefObject<string[]>;
  onTileUnlocked?: () => void;
  onModeActivated?: () => void;
}

export interface UseLiveLocationReturn {
  liveLocationEnabled: boolean;
  currentGpsCoords: { lat: number; lng: number } | null;
  gpsStatusMessage: string | null;
  centerOnGpsTrigger: number;
  handleToggleLiveLocation: (enabled: boolean) => void;
  getCurrentLocation: () => Promise<{ lat: number; lng: number } | null>;
}

const STORAGE_KEY = 'krakow_live_location_mode';
const GPS_THROTTLE_MS = 4000;

export function useLiveLocation({
  currentUser,
  discoveredTileIdsRef,
  onTileUnlocked,
  onModeActivated,
}: UseLiveLocationProps): UseLiveLocationReturn {
  const [liveLocationEnabled, setLiveLocationEnabled] = useState<boolean>(false);
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [centerOnGpsTrigger, setCenterOnGpsTrigger] = useState<number>(0);

  // Check and unlock tile when user physically enters it with GPS in Live Location mode
  const checkAndUnlockLiveTile = useCallback(
    async (lat: number, lng: number) => {
      const tile = coordsToTile(lat, lng);
      if (!tile) return; // Outside Krakow exploration bounding box

      // Only unlock if not already discovered
      if (discoveredTileIdsRef.current?.includes(tile.tileId)) {
        return;
      }

      try {
        const res = await fetch('/api/discovery/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser?.id,
            tile_ids: [tile.tileId],
            has_photo: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.newly_unlocked_tiles && data.newly_unlocked_tiles.length > 0) {
            setGpsStatusMessage(`Odkryto kafel: ${tile.tileId} (+10 XP)!`);
            setTimeout(() => setGpsStatusMessage(null), 4500);
          }
          onTileUnlocked?.();
        }
      } catch (err) {
        console.warn('Błąd podczas odblokowywania kafelka GPS:', err);
      }
    },
    [currentUser, discoveredTileIdsRef, onTileUnlocked]
  );

  // Toggle Live Location mode
  const handleToggleLiveLocation = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        if (!('geolocation' in navigator)) {
          alert('Geolokalizacja nie jest wspierana w Twojej przeglądarce.');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLiveLocationEnabled(true);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, 'true');
            }
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentGpsCoords(coords);
            setCenterOnGpsTrigger(Date.now());
            onModeActivated?.();
            checkAndUnlockLiveTile(coords.lat, coords.lng);
          },
          (err) => {
            console.warn('Geolocation permission error:', err);
            setLiveLocationEnabled(false);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, 'false');
            }
            alert(
              'Aby włączyć tryb „Lokalizacja na żywo”, musisz zezwolić przeglądarce na dostęp do lokalizacji GPS.'
            );
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setLiveLocationEnabled(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, 'false');
        }
        setCurrentGpsCoords(null);
        setGpsStatusMessage(null);
        setCenterOnGpsTrigger(0);
      }
    },
    [checkAndUnlockLiveTile, onModeActivated]
  );

  // Restore saved live location preference on initial client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') {
        handleToggleLiveLocation(true);
      }
    }
  }, [handleToggleLiveLocation]);

  // Periodic GPS watching when liveLocationEnabled is true
  useEffect(() => {
    if (!liveLocationEnabled || !('geolocation' in navigator)) return;

    let lastCheckTime = 0;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentGpsCoords({ lat, lng });

        const now = Date.now();
        if (now - lastCheckTime > GPS_THROTTLE_MS) {
          lastCheckTime = now;
          checkAndUnlockLiveTile(lat, lng);
        }
      },
      (err) => {
        console.warn('GPS watch error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 10000,
      }
    );

    // Fallback interval check every 15 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentGpsCoords({ lat, lng });
          checkAndUnlockLiveTile(lat, lng);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }, 15000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [liveLocationEnabled, checkAndUnlockLiveTile]);

  // One-time GPS fetch helper (for forms or manual button)
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        alert('Geolokalizacja nie jest wspierana w tej przeglądarce.');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          alert('Nie udało się pobrać Twojej lokalizacji GPS.');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return {
    liveLocationEnabled,
    currentGpsCoords,
    gpsStatusMessage,
    centerOnGpsTrigger,
    handleToggleLiveLocation,
    getCurrentLocation,
  };
}
