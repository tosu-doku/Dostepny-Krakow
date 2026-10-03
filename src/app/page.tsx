'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { RouteResult, NavigationProfile } from '@/types/routing';
import { Barrier } from '@/types/barrier';
import RoutePlanner from '@/components/navigation/RoutePlanner';
import RouteObstacleList from '@/components/navigation/RouteObstacleList';
import AddBarrierForm from '@/components/crowdsourcing/AddBarrierForm';
import { ShieldCheck, Map as MapIcon, PlusCircle, AlertCircle, Compass, CheckCircle2 } from 'lucide-react';

// Dynamically import Leaflet Map to prevent SSR errors
const AccessibleMap = dynamic(() => import('@/components/map/AccessibleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500">
      Ładowanie interaktywnej mapy Krakowa...
    </div>
  ),
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<'navigation' | 'crowdsource'>('navigation');
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
      // Auto-switch to navigation tab to see results
      setActiveTab('navigation');
    } catch (err: any) {
      setErrorMessage(err.message || 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Handle Map Click - does NOT switch tab when on navigation!
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    if (activeTab === 'navigation') {
      if (pickingTarget === 'start') {
        setStartPoint(coords);
        setPickingTarget(null);
      } else if (pickingTarget === 'end') {
        setEndPoint(coords);
        setPickingTarget(null);
      } else {
        // By default in navigation mode, clicking sets the destination (B)
        setEndPoint(coords);
      }
      return;
    }

    if (activeTab === 'crowdsource') {
      setPickedLocation(coords);
    }
  };

  // Handle Geolocation
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

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-3.5 px-4 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              ♿
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Kraków bez barier</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inteligentna nawigacja miejska & crowdsourcing dostępności architektonicznej
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" aria-hidden="true" />
              WCAG 2.2 AA Ready
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              PostGIS + Supabase
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col gap-6">
        {/* Error Announcement */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('navigation');
              setPickingTarget(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'navigation'
                ? 'bg-blue-600 text-white shadow'
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
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'crowdsource'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Zgłoś Barierę (Crowdsourcing)
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Column: Form & Route info */}
          <div className="lg:col-span-5 flex flex-col gap-5 order-2 lg:order-1">
            {activeTab === 'navigation' ? (
              <>
                <RoutePlanner
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onSetStartPoint={setStartPoint}
                  onSetEndPoint={setEndPoint}
                  pickingTarget={pickingTarget}
                  onSetPickingTarget={setPickingTarget}
                  onSearchRoute={handleSearchRoute}
                  isLoading={isLoadingRoute}
                />
                <RouteObstacleList route={route} isLoading={isLoadingRoute} />
              </>
            ) : (
              <AddBarrierForm
                selectedLocation={pickedLocation}
                onSelectCurrentLocation={handleUseCurrentLocation}
                onBarrierCreated={() => {
                  fetchBarriers();
                  if (startPoint && endPoint) {
                    handleSearchRoute(startPoint, endPoint, route?.profile || 'wheelchair');
                  }
                }}
              />
            )}
          </div>

          {/* Right Column: Interactive Map */}
          <div className="lg:col-span-7 h-[500px] lg:h-[700px] sticky top-6 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 order-1 lg:order-2 flex flex-col">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold flex items-center gap-1.5">
                <MapIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                {activeTab === 'navigation' ? (
                  pickingTarget === 'start' ? (
                    <span className="text-green-700 dark:text-green-400 font-bold animate-pulse">
                      📍 Kliknij na mapie, aby ustawić Punkt Startowy (A)
                    </span>
                  ) : pickingTarget === 'end' ? (
                    <span className="text-red-700 dark:text-red-400 font-bold animate-pulse">
                      🏁 Kliknij na mapie, aby ustawić Punkt Docelowy (B)
                    </span>
                  ) : (
                    'Mapa Krakowa (kliknięcie ustawia punkt docelowy B)'
                  )
                ) : (
                  'Mapa Krakowa (kliknij, aby wskazać punkt nowej bariery)'
                )}
              </span>
              <span>
                {route ? `${route.all_barriers.length} barier w korytarzu trasy` : `${allBarriers.length} znanych barier`}
              </span>
            </div>

            <div className="flex-1 relative">
              <AccessibleMap
                start={startPoint}
                end={endPoint}
                routeCoordinates={route?.geometry?.coordinates || []}
                barriers={route?.all_barriers || allBarriers}
                selectedLocation={activeTab === 'crowdsource' ? pickedLocation : null}
                onMapClick={handleMapClick}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center text-xs text-zinc-500">
        Kraków bez barier • Projekt na HackYeah • Zgodność z WCAG 2.2 AA • PostGIS OpenStreetMap
      </footer>
    </div>
  );
}
