'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { RouteResult, NavigationProfile } from '@/types/routing';
import { Barrier } from '@/types/barrier';
import { User, BadActorPurgeResult } from '@/types/user';
import RouteSearchCard from '@/components/navigation/RouteSearchCard';
import TurnBanner from '@/components/navigation/TurnBanner';
import RouteStatCards from '@/components/navigation/RouteStatCards';
import RouteTimelineSheet from '@/components/navigation/RouteTimelineSheet';
import BottomNavigation, { ActiveMobileTab } from '@/components/layout/BottomNavigation';
import AddBarrierForm from '@/components/crowdsourcing/AddBarrierForm';
import ProfileView from '@/components/profile/ProfileView';
import DiscoveryBanner from '@/components/gamification/DiscoveryBanner';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import {
  Search,
  Camera,
  AlertCircle,
  Trophy,
  Compass,
  Flame,
  ChevronLeft,
} from 'lucide-react';

// Dynamically import Leaflet Map to prevent SSR errors
const AccessibleMap = dynamic(() => import('@/components/map/AccessibleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[380px] bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
      Ładowanie mapy Krakowa...
    </div>
  ),
});

export default function Home() {
  const [mobileTab, setMobileTab] = useState<ActiveMobileTab>('map');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [allBarriers, setAllBarriers] = useState<Barrier[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
  const [useCustomCoords, setUseCustomCoords] = useState(false);

  // Gamification & Discovery Hook
  const {
    discoveredTileIds,
    auditedTileIds,
    userRank,
    showDiscoveryGrid,
    toggleDiscoveryGrid,
    fetchDiscoveryTiles,
    unlockRouteTiles,
    unlockBarrierTile,
    discoveredTileIdsRef,
  } = useDiscovery(currentUser);

  // Live Location & GPS Exploration Hook
  const {
    liveLocationEnabled,
    currentGpsCoords,
    gpsStatusMessage,
    centerOnGpsTrigger,
    handleToggleLiveLocation,
    getCurrentLocation,
  } = useLiveLocation({
    currentUser,
    discoveredTileIdsRef,
    onTileUnlocked: fetchDiscoveryTiles,
    onModeActivated: () => setMobileTab('map'),
  });

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

  useEffect(() => {
    fetchBarriers();
  }, [fetchBarriers]);

  // Restore user session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.warn('Nie udało się sprawdzić aktywnej sesji:', err);
      }
    };
    checkSession();
  }, []);

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

      // In Planner mode (liveLocationEnabled = false), unlock tiles along the calculated route
      if (!liveLocationEnabled && data.geometry?.coordinates) {
        await unlockRouteTiles(data.geometry.coordinates);
      }

      // Switch to map view to display turn-by-turn navigation
      setMobileTab('map');
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Handle Purge Bad Actor callback
  const handlePurgeComplete = useCallback(
    (_result: BadActorPurgeResult) => {
      fetchBarriers();
      fetchDiscoveryTiles();
      if (startPoint && endPoint) {
        handleSearchRoute(startPoint, endPoint, route?.profile || 'foot_walking');
      }
    },
    [fetchBarriers, fetchDiscoveryTiles, startPoint, endPoint, route?.profile]
  );

  // Handle Map Click
  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (mobileTab === 'crowdsource') {
        setPickedLocation(coords);
        return;
      }

      if (mobileTab === 'map' || mobileTab === 'route') {
        if (!useCustomCoords) return;

        if (pickingTarget === 'start') {
          setStartPoint(coords);
          setPickingTarget(null);
          setMobileTab('route');
        } else if (pickingTarget === 'end') {
          setEndPoint(coords);
          setPickingTarget(null);
          setMobileTab('route');
        } else {
          setEndPoint(coords);
        }
      }
    },
    [mobileTab, useCustomCoords, pickingTarget]
  );

  // Handle Geolocation button in AddBarrierForm
  const handleUseCurrentLocation = async () => {
    const coords = await getCurrentLocation();
    if (coords) {
      setPickedLocation(coords);
    }
  };

  // When picking on mobile, switch to map view automatically
  const handleSetPickingTarget = (target: 'start' | 'end' | null) => {
    setPickingTarget(target);
    if (target) {
      setMobileTab('map');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 antialiased select-none font-sans">
      {/* Mobile Portrait Frame: max-w-md on desktop, 100% on phone */}
      <div className="w-full max-w-md min-h-screen bg-white relative flex flex-col shadow-2xl border-x border-slate-200/60 pb-20">
        
        {/* Subtle Top Status Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              ♿
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                Kraków bez barier
              </h1>
            </div>
          </div>

          {/* Non-clickable user tile: shows username, level and XP */}
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-2xl select-none pointer-events-none shadow-2xs"
            aria-label={`Użytkownik ${currentUser?.nickname || 'Odkrywca'}, Poziom ${userRank?.level ?? 1}, ${userRank?.totalXp ?? 0} punktów doświadczenia`}
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
              {currentUser?.nickname?.charAt(0).toUpperCase() || '👤'}
            </div>
            <div className="text-left flex flex-col justify-center">
              <span className="text-xs font-black text-slate-900 leading-none truncate max-w-[85px] sm:max-w-[110px]">
                {currentUser?.nickname || 'Odkrywca'}
              </span>
              <span className="text-[10px] font-bold text-purple-700 leading-tight mt-0.5 whitespace-nowrap">
                Poz. {userRank?.level ?? 1} • {userRank?.totalXp ?? 0} XP
              </span>
            </div>
          </div>
        </header>

        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="m-3 p-3 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="flex-1 font-medium">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* MAIN TAB 1: MAPA (Interactive Map with Floating Overlays - Attachment 1 & 2) */}
        <div className={`relative flex-1 ${mobileTab === 'map' ? 'flex flex-col' : 'hidden'}`}>
          {/* Top Overlays on Map */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2.5 pointer-events-none">
            {route ? (
              <>
                {/* Top Turn-by-Turn Banner (Attachment 2) */}
                <div className="pointer-events-auto">
                  <TurnBanner currentStep={route.steps?.[0]} />
                </div>

                {/* Floating Stat Cards (Attachment 2) */}
                <div className="pointer-events-auto">
                  <RouteStatCards route={route} />
                </div>
              </>
            ) : (
              /* Search Trigger Pill if no route */
              <>
                <button
                  type="button"
                  onClick={() => setMobileTab('route')}
                  className="w-full h-12 px-4 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center gap-3 text-xs font-semibold pointer-events-auto cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Search className="w-4 h-4 text-purple-600" />
                  <span className="flex-1 text-left truncate">Dokąd chcesz dotrzeć w Krakowie?</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Wyznacz trasę
                  </span>
                </button>

                {/* Nearby Daily Quest Indicator Pill (Attachment 4) */}
                <button
                  type="button"
                  onClick={() => setMobileTab('leaderboard')}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-md border border-pink-200/90 text-slate-800 flex items-center justify-between text-xs font-bold pointer-events-auto cursor-pointer transition-all active:scale-[0.99] hover:bg-pink-50/50"
                >
                  <span className="flex items-center gap-2 text-slate-900 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#d90479] animate-pulse shrink-0" />
                    <span className="truncate">Misja dnia: Park Krakowski (Krowodrza)</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-100 text-[#d90479] shrink-0">
                    +200 XP • 2x
                  </span>
                </button>
              </>
            )}

            {/* Picking Target Notice */}
            {pickingTarget && (
              <div className="p-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold text-center pointer-events-auto shadow-lg animate-pulse">
                {pickingTarget === 'start' ? '📍 Dotknij mapy, aby wybrać Punkt Startowy (A)' : '🏁 Dotknij mapy, aby wybrać Punkt Docelowy (B)'}
              </div>
            )}
          </div>

          {/* Leaflet Map Component */}
          <div className="w-full h-[calc(100vh-140px)] min-h-[480px]">
            <AccessibleMap
              start={startPoint}
              end={endPoint}
              routeCoordinates={route?.geometry?.coordinates || []}
              barriers={route?.all_barriers || []}
              selectedLocation={mobileTab === 'crowdsource' ? pickedLocation : null}
              onMapClick={handleMapClick}
              discoveredTileIds={discoveredTileIds}
              auditedTileIds={auditedTileIds}
              showDiscoveryGrid={showDiscoveryGrid}
              currentGpsCoords={currentGpsCoords}
              centerOnGpsTrigger={centerOnGpsTrigger}
              isLiveLocationActive={liveLocationEnabled}
            />
          </div>

          {/* Bottom Floating Actions on Map (Attachment 1) */}
          <div className="absolute bottom-4 left-3 right-3 z-20 flex flex-col gap-2.5 pointer-events-none">
            {/* Quick action button to add barrier / claim sector (Attachment 1) */}
            <div className="flex justify-end pointer-events-auto">
              <button
                type="button"
                onClick={() => setMobileTab('crowdsource')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl flex items-center gap-2.5 transition-transform active:scale-95 cursor-pointer border border-slate-700"
              >
                <span className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </span>
                <div className="text-left">
                  <div className="text-xs font-extrabold leading-tight">Dodaj zdjęcie</div>
                  <div className="text-[10px] text-slate-400 font-medium">Przejmij sektor</div>
                </div>
              </button>
            </div>

            {/* Magenta CTA "Apply / Zobacz trasę" if route active (Attachment 1) */}
            {route && (
              <button
                type="button"
                onClick={() => setMobileTab('route')}
                className="w-full h-12 bg-[#d90479] hover:bg-[#be185d] active:scale-[0.99] text-white font-extrabold text-sm rounded-full shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer pointer-events-auto transition-all"
              >
                <span>Apply – Zobacz punkty na trasie</span>
              </button>
            )}
          </div>
        </div>

        {/* MAIN TAB 2: TRASA (Route Planner & Timeline - Attachment 2 & 3) */}
        <div className={`p-4 flex-1 flex flex-col gap-4 ${mobileTab === 'route' ? 'block' : 'hidden'}`}>
          {route ? (
            /* Route Active: Show "Co czeka Cię po drodze" Timeline (Attachment 2) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRoute(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Nowa trasa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Pokaż na mapie</span>
                </button>
              </div>

              {/* Attachment 2 Bottom Sheet Component */}
              <RouteTimelineSheet route={route} />
            </div>
          ) : (
            /* Route Inactive: Show "Utwórz trasę" Card (Attachment 3) */
            <RouteSearchCard
              startPoint={startPoint}
              endPoint={endPoint}
              onSetStartPoint={setStartPoint}
              onSetEndPoint={setEndPoint}
              pickingTarget={pickingTarget}
              onSetPickingTarget={handleSetPickingTarget}
              useCustomCoords={useCustomCoords}
              onToggleCustomCoords={(enabled) => {
                setUseCustomCoords(enabled);
                if (!enabled) setPickingTarget(null);
              }}
              onSearchRoute={handleSearchRoute}
              isLoading={isLoadingRoute}
            />
          )}
        </div>

        {/* MAIN TAB 3: EKSPLORACJA (Gamification, Daily Quests & Kraków Discovery Stats) */}
        <div className={`p-4 flex-1 flex flex-col gap-4 ${mobileTab === 'leaderboard' ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <span className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Eksploracja & Zadania</h2>
              <p className="text-xs text-slate-500">Rozpraszaj mgłę wojny i realizuj misje z mnożnikiem 2x XP</p>
            </div>
          </div>

          <DiscoveryBanner
            userRank={userRank}
            showDiscoveryGrid={showDiscoveryGrid}
            onToggleDiscoveryGrid={toggleDiscoveryGrid}
            unlockedTilesCount={discoveredTileIds.length}
            auditedPhotosCount={auditedTileIds.length}
            liveLocationEnabled={liveLocationEnabled}
            gpsStatusMessage={gpsStatusMessage}
            onNavigateToCrowdsource={(coords) => {
              if (coords) setPickedLocation(coords);
              setMobileTab('crowdsource');
            }}
          />
        </div>

        {/* MAIN TAB 4: DODAJ (Crowdsourcing - Add Barrier with Photo) */}
        <div className={`p-4 flex-1 flex flex-col gap-4 ${mobileTab === 'crowdsource' ? 'block' : 'hidden'}`}>
          <AddBarrierForm
            selectedLocation={pickedLocation}
            onSelectCurrentLocation={handleUseCurrentLocation}
            currentUser={currentUser}
            onBarrierCreated={(info) => {
              fetchBarriers();
              if (info) {
                unlockBarrierTile(info.latitude, info.longitude, info.hasPhoto);
              }
              if (startPoint && endPoint) {
                handleSearchRoute(startPoint, endPoint, route?.profile || 'wheelchair');
              }
              setMobileTab('map');
            }}
          />
        </div>

        {/* MAIN TAB 5: PROFIL (Account, Settings & Moderation) */}
        <div className={`p-4 flex-1 flex flex-col gap-4 ${mobileTab === 'profile' ? 'block' : 'hidden'}`}>
          <ProfileView
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            userRank={userRank}
            unlockedTilesCount={discoveredTileIds.length}
            auditedPhotosCount={auditedTileIds.length}
            liveLocationEnabled={liveLocationEnabled}
            onToggleLiveLocation={handleToggleLiveLocation}
            onPurgeComplete={handlePurgeComplete}
          />
        </div>

        {/* 5-Item Bottom Navigation Bar (Attachment 1) */}
        <BottomNavigation
          activeTab={mobileTab}
          onChangeTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'map' && pickingTarget) {
              // Keep picking mode
            }
          }}
        />
      </div>
    </div>
  );
}
