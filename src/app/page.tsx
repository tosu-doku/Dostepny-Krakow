'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { RouteResult, NavigationProfile } from '@/types/routing';
import { Barrier } from '@/types/barrier';
import { User, BadActorPurgeResult } from '@/types/user';
import RoutePlanner from '@/components/navigation/RoutePlanner';
import RouteObstacleList from '@/components/navigation/RouteObstacleList';
import AddBarrierForm from '@/components/crowdsourcing/AddBarrierForm';
import UserAccountMenu from '@/components/auth/UserAccountMenu';
import DiscoveryBanner from '@/components/gamification/DiscoveryBanner';
import { routeToTiles, coordsToTile, calculateUserRank, UserRank } from '@/services/grid';
import { ShieldCheck, Map as MapIcon, PlusCircle, AlertCircle, Compass, ListFilter } from 'lucide-react';

// Dynamically import Leaflet Map to prevent SSR errors
const AccessibleMap = dynamic(() => import('@/components/map/AccessibleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[380px] bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 text-sm">
      Ładowanie mapy Krakowa...
    </div>
  ),
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<'navigation' | 'crowdsource'>('navigation');
  const [mobileView, setMobileView] = useState<'panel' | 'map'>('panel');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [allBarriers, setAllBarriers] = useState<Barrier[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map state
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>({
    lat: 50.0664,
    lng: 19.9482,
  });
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>({
    lat: 50.0614,
    lng: 19.9365,
  });
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickingTarget, setPickingTarget] = useState<'start' | 'end' | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fog of War / Map Discovery Gamification state
  const [discoveredTileIds, setDiscoveredTileIds] = useState<string[]>([]);
  const [auditedTileIds, setAuditedTileIds] = useState<string[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [showDiscoveryGrid, setShowDiscoveryGrid] = useState<boolean>(true);

  // Live Location ("Lokalizacja na żywo") exploration state
  const [liveLocationEnabled, setLiveLocationEnabled] = useState<boolean>(false);
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [centerOnGpsTrigger, setCenterOnGpsTrigger] = useState<number>(0);

  // Ref to hold current discoveredTileIds to avoid stale closures in geolocation callbacks
  const discoveredTileIdsRef = useRef<string[]>([]);
  useEffect(() => {
    discoveredTileIdsRef.current = discoveredTileIds;
  }, [discoveredTileIds]);

  // Fetch barriers from API
  const fetchBarriers = useCallback(async () => {
    try {
      const res = await fetch('/api/barriers');
      if (res.ok) {
        const data = await res.json();
        setAllBarriers(data.barriers || []);
      }
    } catch (err) {
      console.warn('Nie udało się pobrać listy barier:', err);
    }
  }, []);

  // Fetch discovery tiles for current user (or guest)
  const fetchDiscoveryTiles = useCallback(async () => {
    try {
      const url = currentUser?.id ? `/api/discovery/my-tiles?user_id=${currentUser.id}` : '/api/discovery/my-tiles';
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

  // Check and unlock tile when user physically enters it with GPS in Live Location mode
  const checkAndUnlockLiveTile = useCallback(
    async (lat: number, lng: number) => {
      const tile = coordsToTile(lat, lng);
      if (!tile) return; // Outside Krakow exploration bounding box

      // Only unlock if not already discovered
      if (discoveredTileIdsRef.current.includes(tile.tileId)) {
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
          if (data.user_rank) {
            setUserRank(data.user_rank);
          }
          fetchDiscoveryTiles();
        }
      } catch (err) {
        console.warn('Błąd podczas odblokowywania kafelka GPS:', err);
      }
    },
    [currentUser, fetchDiscoveryTiles]
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
              localStorage.setItem('krakow_live_location_mode', 'true');
            }
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentGpsCoords(coords);
            setCenterOnGpsTrigger(Date.now());
            // Automatically switch to map view so user immediately sees their live location
            setMobileView('map');
            checkAndUnlockLiveTile(coords.lat, coords.lng);
          },
          (err) => {
            console.warn('Geolocation permission error:', err);
            setLiveLocationEnabled(false);
            if (typeof window !== 'undefined') {
              localStorage.setItem('krakow_live_location_mode', 'false');
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
          localStorage.setItem('krakow_live_location_mode', 'false');
        }
        setCurrentGpsCoords(null);
        setGpsStatusMessage(null);
        setCenterOnGpsTrigger(0);
      }
    },
    [checkAndUnlockLiveTile]
  );

  // Restore saved live location preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('krakow_live_location_mode');
      if (saved === 'true') {
        handleToggleLiveLocation(true);
      }
    }
  }, [handleToggleLiveLocation]);

  // Periodic GPS watching when liveLocationEnabled is true
  useEffect(() => {
    if (!liveLocationEnabled || !('geolocation' in navigator)) return;

    let lastCheckTime = 0;
    const THROTTLE_MS = 4000;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentGpsCoords({ lat, lng });

        const now = Date.now();
        if (now - lastCheckTime > THROTTLE_MS) {
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

    // Fallback interval check every 15s
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

  // Gamification: Unlock barrier tile with photo bonus (+100 XP / Golden tile)
  const handleBarrierCreatedDiscovery = async (lat: number, lng: number, hasPhoto: boolean) => {
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
  };

  // Handle Purge Bad Actor callback
  const handlePurgeComplete = useCallback((_result: BadActorPurgeResult) => {
    fetchBarriers();
    fetchDiscoveryTiles();
    if (startPoint && endPoint) {
      handleSearchRoute(startPoint, endPoint, route?.profile || 'wheelchair');
    }
  }, [fetchBarriers, fetchDiscoveryTiles, startPoint, endPoint, route?.profile]);

  useEffect(() => {
    fetchBarriers();
  }, [fetchBarriers]);

  // Handle route calculation
  const handleSearchRoute = async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    profile: NavigationProfile
  ) => {
    setIsLoadingRoute(true);
    setErrorMessage(null);
    setStartPoint(start);
    setEndPoint(end);

    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, profile }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Błąd wyznaczania trasy');
      }

      const data: RouteResult = await res.json();
      setRoute(data);

      // Gamification: Unlock tiles intersected by this route (+10 XP per tile) ONLY if liveLocationEnabled is FALSE!
      // In Live Location mode, tiles are ONLY unlocked by physical GPS traversal!
      if (!liveLocationEnabled && data.geometry?.coordinates && data.geometry.coordinates.length > 0) {
        const routeTiles = routeToTiles(data.geometry.coordinates);
        if (routeTiles.length > 0) {
          try {
            const unlockRes = await fetch('/api/discovery/unlock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: currentUser?.id,
                tile_ids: routeTiles,
                has_photo: false,
              }),
            });
            if (unlockRes.ok) {
              const unlockData = await unlockRes.json();
              if (unlockData.user_rank) {
                setUserRank(unlockData.user_rank);
              }
              fetchDiscoveryTiles();
            }
          } catch (unlockErr) {
            console.warn('Błąd podczas odblokowywania kafelków trasy:', unlockErr);
          }
        }
      }

      // Stay on navigation tab
      setActiveTab('navigation');
      // On mobile, show the route on the map
      setMobileView('map');
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Handle Map Click - does NOT switch tab when on navigation!
  const handleMapClick = useCallback((coords: { lat: number; lng: number }) => {
    if (activeTab === 'navigation') {
      if (pickingTarget === 'start') {
        setStartPoint(coords);
        setPickingTarget(null);
        // Switch back to panel on mobile after picking
        setMobileView('panel');
      } else if (pickingTarget === 'end') {
        setEndPoint(coords);
        setPickingTarget(null);
        setMobileView('panel');
      } else {
        // By default in navigation mode, clicking sets destination
        setEndPoint(coords);
      }
      return;
    }

    if (activeTab === 'crowdsource') {
      setPickedLocation(coords);
      setMobileView('panel');
    }
  }, [activeTab, pickingTarget]);

  // Handle Geolocation button in AddBarrierForm
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickedLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          alert('Nie udało się pobrać Twojej lokalizacji GPS.');
        }
      );
    } else {
      alert('Geolokalizacja nie jest wspierana w tej przeglądarce.');
    }
  };

  // When picking on mobile, switch to map view automatically
  const handleSetPickingTarget = (target: 'start' | 'end' | null) => {
    setPickingTarget(target);
    if (target) {
      setMobileView('map');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col antialiased">
      {/* Header - Mobile friendly */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-3 px-3 sm:px-6 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs shrink-0">
              ♿
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">
                Kraków bez barier
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[280px] sm:max-w-none">
                Inteligentna nawigacja miejska & crowdsourcing dostępności
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold self-start sm:self-auto">
            <span className="hidden md:flex px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              WCAG 2.2 AA
            </span>
            <span className="hidden sm:inline px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              PostGIS
            </span>
            <UserAccountMenu
              currentUser={currentUser}
              onUserChange={setCurrentUser}
              onPurgeComplete={handlePurgeComplete}
              liveLocationEnabled={liveLocationEnabled}
              onToggleLiveLocation={handleToggleLiveLocation}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 flex-1 flex flex-col gap-4 sm:gap-6">
        {/* Error Announcement */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs sm:text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Discovery Gamification / Fog of War Banner */}
        <DiscoveryBanner
          userRank={userRank}
          showDiscoveryGrid={showDiscoveryGrid}
          onToggleDiscoveryGrid={() => setShowDiscoveryGrid((prev) => !prev)}
          unlockedTilesCount={discoveredTileIds.length}
          auditedPhotosCount={auditedTileIds.length}
          liveLocationEnabled={liveLocationEnabled}
          gpsStatusMessage={gpsStatusMessage}
        />

        {/* Tab Navigation (Main Mode) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('navigation');
                setPickingTarget(null);
              }}
              className={`flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'navigation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              Nawigacja i Trasa
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('crowdsource');
                setPickingTarget(null);
              }}
              className={`flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'crowdsource'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              Zgłoś Barierę
            </button>
          </div>

          {/* Mobile Screen Segmented Switcher (Visible only on < lg) */}
          <div className="flex lg:hidden bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMobileView('panel')}
              className={`flex-1 min-h-[38px] py-1 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mobileView === 'panel'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              {activeTab === 'navigation' ? 'Planer i Wskazówki' : 'Formularz'}
            </button>

            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`flex-1 min-h-[38px] py-1 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mobileView === 'map'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Mapa ({route ? `${route.all_barriers.length} barier` : `${allBarriers.length}`})
            </button>
          </div>
        </div>

        {/* Content Layout: Responsive grid on lg, switchable on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 flex-1 items-start">
          {/* Left Column: Form & Route Info (Visible on mobile if mobileView === 'panel') */}
          <div
            className={`lg:col-span-5 flex flex-col gap-4 sm:gap-5 ${
              mobileView === 'panel' ? 'block' : 'hidden lg:block'
            }`}
          >
            {activeTab === 'navigation' ? (
              <>
                <RoutePlanner
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onSetStartPoint={setStartPoint}
                  onSetEndPoint={setEndPoint}
                  pickingTarget={pickingTarget}
                  onSetPickingTarget={handleSetPickingTarget}
                  onSearchRoute={handleSearchRoute}
                  isLoading={isLoadingRoute}
                />

                {/* Mobile Quick Action to jump to Map */}
                {route && (
                  <button
                    type="button"
                    onClick={() => setMobileView('map')}
                    className="lg:hidden w-full py-2.5 px-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <MapIcon className="w-4 h-4 text-blue-600" />
                    Zobacz trasę na mapie ({route.all_barriers.length} przeszkód)
                  </button>
                )}

                <RouteObstacleList route={route} isLoading={isLoadingRoute} />
              </>
            ) : (
              <>
                <AddBarrierForm
                  selectedLocation={pickedLocation}
                  onSelectCurrentLocation={handleUseCurrentLocation}
                  currentUser={currentUser}
                  onBarrierCreated={(info) => {
                    fetchBarriers();
                    if (info) {
                      handleBarrierCreatedDiscovery(info.latitude, info.longitude, info.hasPhoto);
                    }
                    if (startPoint && endPoint) {
                      handleSearchRoute(startPoint, endPoint, route?.profile || 'wheelchair');
                    }
                  }}
                />

                {/* Mobile quick button to pick point on map */}
                <button
                  type="button"
                  onClick={() => setMobileView('map')}
                  className="lg:hidden w-full py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <MapIcon className="w-4 h-4" />
                  Wskaż punkt na mapie
                </button>
              </>
            )}
          </div>

          {/* Right Column: Interactive Map (Visible on mobile if mobileView === 'map') */}
          <div
            className={`lg:col-span-7 h-[420px] sm:h-[500px] lg:h-[700px] sticky top-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col ${
              mobileView === 'map' ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Map Header Status */}
            <div className="p-2.5 sm:p-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold flex items-center gap-1.5 truncate max-w-[260px] sm:max-w-none">
                <MapIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                {activeTab === 'navigation' ? (
                  pickingTarget === 'start' ? (
                    <span className="text-green-700 dark:text-green-400 font-bold animate-pulse">
                      📍 Dotknij mapy, aby wybrać Start (A)
                    </span>
                  ) : pickingTarget === 'end' ? (
                    <span className="text-red-700 dark:text-red-400 font-bold animate-pulse">
                      🏁 Dotknij mapy, aby wybrać Cel (B)
                    </span>
                  ) : (
                    'Mapa Krakowa'
                  )
                ) : (
                  'Dotknij mapy, aby wskazać barierę'
                )}
              </span>

              <span className="text-[11px] text-zinc-500 shrink-0">
                {route ? `${route.all_barriers.length} barier` : `${allBarriers.length} barier`}
              </span>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
              <AccessibleMap
                start={startPoint}
                end={endPoint}
                routeCoordinates={route?.geometry?.coordinates || []}
                barriers={route?.all_barriers || allBarriers}
                selectedLocation={activeTab === 'crowdsource' ? pickedLocation : null}
                onMapClick={handleMapClick}
                discoveredTileIds={discoveredTileIds}
                auditedTileIds={auditedTileIds}
                showDiscoveryGrid={showDiscoveryGrid}
                currentGpsCoords={currentGpsCoords}
                centerOnGpsTrigger={centerOnGpsTrigger}
              />
            </div>

            {/* Mobile Bottom Floating Switch to return to list */}
            <div className="lg:hidden p-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
              <button
                type="button"
                onClick={() => setMobileView('panel')}
                className="w-full py-2.5 px-3 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-sm"
              >
                <ListFilter className="w-4 h-4" />
                {activeTab === 'navigation'
                  ? route
                    ? 'Zobacz listę kroków i przeszkód'
                    : 'Wróć do planera trasy'
                  : 'Wróć do formularza zgłoszenia'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-3.5 px-4 text-center text-[11px] sm:text-xs text-zinc-500">
        Kraków bez barier • Projekt na HackYeah • Dostępność WCAG 2.2 AA • PostGIS OpenStreetMap
      </footer>
    </div>
  );
}
