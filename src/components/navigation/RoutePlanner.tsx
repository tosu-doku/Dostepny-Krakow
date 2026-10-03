'use client';

import { useState, useEffect } from 'react';
import { NavigationProfile } from '@/types/routing';
import { Navigation, Accessibility, Baby, Eye, Footprints, MapPin, Flag, Check } from 'lucide-react';

interface RoutePlannerProps {
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  onSetStartPoint: (coords: { lat: number; lng: number }) => void;
  onSetEndPoint: (coords: { lat: number; lng: number }) => void;
  pickingTarget: 'start' | 'end' | null;
  onSetPickingTarget: (target: 'start' | 'end' | null) => void;
  onSearchRoute: (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    profile: NavigationProfile
  ) => void;
  isLoading: boolean;
}

const PRESET_ROUTES = [
  {
    name: 'Dworzec Główny → Rynek Główny (Sukiennice)',
    start: { lat: 50.0664, lng: 19.9482 },
    end: { lat: 50.0614, lng: 19.9365 },
  },
  {
    name: 'Rynek Główny → Zamek Królewski na Wawelu',
    start: { lat: 50.0614, lng: 19.9365 },
    end: { lat: 50.0540, lng: 19.9354 },
  },
  {
    name: 'Plac Nowy (Kazimierz) → Sukiennice',
    start: { lat: 50.0520, lng: 19.9450 },
    end: { lat: 50.0614, lng: 19.9365 },
  },
  {
    name: 'Park Bednarskiego → Plac Wolnica',
    start: { lat: 50.0435, lng: 19.9485 },
    end: { lat: 50.0495, lng: 19.9440 },
  },
];

export default function RoutePlanner({
  startPoint,
  endPoint,
  onSetStartPoint,
  onSetEndPoint,
  pickingTarget,
  onSetPickingTarget,
  onSearchRoute,
  isLoading,
}: RoutePlannerProps) {
  const [profile, setProfile] = useState<NavigationProfile>('wheelchair');
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [useCustomCoords, setUseCustomCoords] = useState(false);

  // Sync inputs with startPoint and endPoint
  const [startLat, setStartLat] = useState(startPoint ? startPoint.lat.toString() : '50.0664');
  const [startLng, setStartLng] = useState(startPoint ? startPoint.lng.toString() : '19.9482');
  const [endLat, setEndLat] = useState(endPoint ? endPoint.lat.toString() : '50.0614');
  const [endLng, setEndLng] = useState(endPoint ? endPoint.lng.toString() : '19.9365');

  useEffect(() => {
    if (startPoint) {
      setStartLat(startPoint.lat.toFixed(5));
      setStartLng(startPoint.lng.toFixed(5));
    }
  }, [startPoint]);

  useEffect(() => {
    if (endPoint) {
      setEndLat(endPoint.lat.toFixed(5));
      setEndLng(endPoint.lng.toFixed(5));
    }
  }, [endPoint]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
    const end = { lat: parseFloat(endLat), lng: parseFloat(endLng) };

    if (isNaN(start.lat) || isNaN(start.lng) || isNaN(end.lat) || isNaN(end.lng)) {
      alert('Wprowadź poprawne współrzędne liczbowe dla punktu Start i Cel.');
      return;
    }

    onSearchRoute(start, end, profile);
  };

  const handlePresetChange = (idx: number) => {
    setSelectedPreset(idx);
    const p = PRESET_ROUTES[idx];
    onSetStartPoint(p.start);
    onSetEndPoint(p.end);
    setStartLat(p.start.lat.toString());
    setStartLng(p.start.lng.toString());
    setEndLat(p.end.lat.toString());
    setEndLng(p.end.lng.toString());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex flex-col gap-4"
      aria-label="Wyszukiwanie dostępnej trasy"
    >
      <div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Planer Trasy Bez Barier
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Wybierz profil użytkownika i punkty trasy w Krakowie.
        </p>
      </div>

      {/* Wybór Profilu Użytkownika */}
      <fieldset>
        <legend className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2">
          Profil Dostępności:
        </legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={profile === 'wheelchair'}
            onClick={() => setProfile('wheelchair')}
            className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              profile === 'wheelchair'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600'
                : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            <Accessibility className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-bold">Wózek inwalidzki</div>
              <div className="text-[10px] text-zinc-500">Unikaj schodów, wysokich krawężników</div>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={profile === 'stroller'}
            onClick={() => setProfile('stroller')}
            className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              profile === 'stroller'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600'
                : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            <Baby className="w-4 h-4 text-pink-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-bold">Wózek dziecięcy</div>
              <div className="text-[10px] text-zinc-500">Płaska nawierzchnia, rampy</div>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={profile === 'visually_impaired'}
            onClick={() => setProfile('visually_impaired')}
            className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              profile === 'visually_impaired'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600'
                : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-bold">Osoba niedowidząca</div>
              <div className="text-[10px] text-zinc-500">Faktury ostrzegawcze, dźwięk</div>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={profile === 'foot_walking'}
            onClick={() => setProfile('foot_walking')}
            className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              profile === 'foot_walking'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600'
                : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            <Footprints className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-bold">Pieszy (standard)</div>
              <div className="text-[10px] text-zinc-500">Standardowa trasa piesza</div>
            </div>
          </button>
        </div>
      </fieldset>

      {/* Szybkie Trasy w Krakowie */}
      <div>
        <label htmlFor="preset-select" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide block mb-1">
          Trasy testowe (Kraków):
        </label>
        <select
          id="preset-select"
          value={selectedPreset}
          onChange={(e) => handlePresetChange(Number(e.target.value))}
          disabled={useCustomCoords}
          className="w-full text-xs p-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        >
          {PRESET_ROUTES.map((p, i) => (
            <option key={i} value={i}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Wybór Własnych Współrzędnych z Mapy */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={useCustomCoords}
            onChange={(e) => setUseCustomCoords(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Wskaż własne punkty (kliknięcie na mapie / edycja)</span>
        </label>

        {useCustomCoords && (
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            {/* Punkt Startowy A */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">A</span>
                  Punkt Startowy:
                </span>
                <button
                  type="button"
                  onClick={() => onSetPickingTarget(pickingTarget === 'start' ? null : 'start')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    pickingTarget === 'start'
                      ? 'bg-green-600 text-white animate-pulse'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-green-100 hover:text-green-800'
                  }`}
                >
                  {pickingTarget === 'start' ? '📍 Kliknij na mapie...' : 'Wskaż na mapie'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={startLat}
                  onChange={(e) => {
                    setStartLat(e.target.value);
                    const lat = parseFloat(e.target.value);
                    if (!isNaN(lat) && startPoint) onSetStartPoint({ lat, lng: startPoint.lng });
                  }}
                  className="w-1/2 p-1.5 text-xs border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  placeholder="Szerokość (Lat)"
                />
                <input
                  type="text"
                  value={startLng}
                  onChange={(e) => {
                    setStartLng(e.target.value);
                    const lng = parseFloat(e.target.value);
                    if (!isNaN(lng) && startPoint) onSetStartPoint({ lat: startPoint.lat, lng });
                  }}
                  className="w-1/2 p-1.5 text-xs border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  placeholder="Długość (Lng)"
                />
              </div>
            </div>

            {/* Punkt Docelowy B */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">B</span>
                  Punkt Docelowy:
                </span>
                <button
                  type="button"
                  onClick={() => onSetPickingTarget(pickingTarget === 'end' ? null : 'end')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    pickingTarget === 'end'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-red-100 hover:text-red-800'
                  }`}
                >
                  {pickingTarget === 'end' ? '🏁 Kliknij na mapie...' : 'Wskaż na mapie'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={endLat}
                  onChange={(e) => {
                    setEndLat(e.target.value);
                    const lat = parseFloat(e.target.value);
                    if (!isNaN(lat) && endPoint) onSetEndPoint({ lat, lng: endPoint.lng });
                  }}
                  className="w-1/2 p-1.5 text-xs border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  placeholder="Szerokość (Lat)"
                />
                <input
                  type="text"
                  value={endLng}
                  onChange={(e) => {
                    setEndLng(e.target.value);
                    const lng = parseFloat(e.target.value);
                    if (!isNaN(lng) && endPoint) onSetEndPoint({ lat: endPoint.lat, lng });
                  }}
                  className="w-1/2 p-1.5 text-xs border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  placeholder="Długość (Lng)"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 text-white font-bold text-sm rounded-lg shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        <MapPin className="w-4 h-4" aria-hidden="true" />
        {isLoading ? 'Wyznaczanie...' : 'Wyznacz Trasę Bez Barier'}
      </button>
    </form>
  );
}
