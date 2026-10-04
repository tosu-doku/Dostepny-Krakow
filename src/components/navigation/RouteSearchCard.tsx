'use client';

import React, { useState, useEffect } from 'react';
import { NavigationProfile } from '@/types/routing';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import AccessibilityFilterModal from './AccessibilityFilterModal';

interface RouteSearchCardProps {
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  onSetStartPoint: (coords: { lat: number; lng: number }) => void;
  onSetEndPoint: (coords: { lat: number; lng: number }) => void;
  pickingTarget: 'start' | 'end' | null;
  onSetPickingTarget: (target: 'start' | 'end' | null) => void;
  useCustomCoords: boolean;
  onToggleCustomCoords: (enabled: boolean) => void;
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
    startName: 'Dworzec Główny (Kraków)',
    endName: 'Rynek Główny (Sukiennice)',
    start: { lat: 50.0664, lng: 19.9482 },
    end: { lat: 50.0614, lng: 19.9365 },
  },
  {
    name: 'Rynek Główny → Zamek na Wawelu',
    startName: 'Rynek Główny',
    endName: 'Zamek Królewski na Wawelu',
    start: { lat: 50.0614, lng: 19.9365 },
    end: { lat: 50.054, lng: 19.9354 },
  },
  {
    name: 'Plac Nowy (Kazimierz) → Sukiennice',
    startName: 'Plac Nowy (Kazimierz)',
    endName: 'Sukiennice',
    start: { lat: 50.052, lng: 19.945 },
    end: { lat: 50.0614, lng: 19.9365 },
  },
  {
    name: 'Park Bednarskiego → Plac Wolnica',
    startName: 'Park Bednarskiego',
    endName: 'Plac Wolnica',
    start: { lat: 50.0435, lng: 19.9485 },
    end: { lat: 50.0495, lng: 19.944 },
  },
];

export default function RouteSearchCard({
  startPoint,
  endPoint,
  onSetStartPoint,
  onSetEndPoint,
  pickingTarget,
  onSetPickingTarget,
  useCustomCoords,
  onToggleCustomCoords,
  onSearchRoute,
  isLoading,
}: RouteSearchCardProps) {
  const [profile, setProfile] = useState<NavigationProfile>('foot_walking');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);

  // Text representation for inputs
  const [startQuery, setStartQuery] = useState('Dworzec Główny (Kraków)');
  const [endQuery, setEndQuery] = useState('Rynek Główny (Sukiennice)');

  // Coordinates inputs
  const [startLat, setStartLat] = useState(startPoint ? startPoint.lat.toFixed(5) : '50.06640');
  const [startLng, setStartLng] = useState(startPoint ? startPoint.lng.toFixed(5) : '19.94820');
  const [endLat, setEndLat] = useState(endPoint ? endPoint.lat.toFixed(5) : '50.06140');
  const [endLng, setEndLng] = useState(endPoint ? endPoint.lng.toFixed(5) : '19.93650');

  useEffect(() => {
    if (startPoint) {
      setStartLat(startPoint.lat.toFixed(5));
      setStartLng(startPoint.lng.toFixed(5));
      if (useCustomCoords) {
        setStartQuery(`Współrzędne: ${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`);
      }
    }
  }, [startPoint, useCustomCoords]);

  useEffect(() => {
    if (endPoint) {
      setEndLat(endPoint.lat.toFixed(5));
      setEndLng(endPoint.lng.toFixed(5));
      if (useCustomCoords) {
        setEndQuery(`Współrzędne: ${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`);
      }
    }
  }, [endPoint, useCustomCoords]);

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = PRESET_ROUTES[idx];
    setStartQuery(p.startName);
    setEndQuery(p.endName);
    onSetStartPoint(p.start);
    onSetEndPoint(p.end);
    setStartLat(p.start.lat.toFixed(5));
    setStartLng(p.start.lng.toFixed(5));
    setEndLat(p.end.lat.toFixed(5));
    setEndLng(p.end.lng.toFixed(5));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
    const end = { lat: parseFloat(endLat), lng: parseFloat(endLng) };

    if (isNaN(start.lat) || isNaN(start.lng) || isNaN(end.lat) || isNaN(end.lng)) {
      alert('Podaj poprawne współrzędne liczbowe dla punktu startowego i docelowego.');
      return;
    }

    onSearchRoute(start, end, profile);
  };

  return (
    <div className="w-full bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
      {/* Title - Attachment 3 style */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4c0519]">
          Utwórz trasę
        </h1>
        {profile !== 'foot_walking' && (
          <span
            className={`text-[11px] font-extrabold px-3 py-1 rounded-full border shadow-2xs flex items-center gap-1.5 ${
              profile === 'wheelchair'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : profile === 'stroller'
                ? 'bg-pink-50 text-pink-800 border-pink-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {profile === 'wheelchair' && '♿ Wózek inwalidzki'}
            {profile === 'stroller' && '👶 Wózek dziecięcy'}
            {profile === 'visually_impaired' && '👁️ Osoba niedowidząca'}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Input 1: Start Point with Filter Icon (Attachment 3) */}
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={startQuery}
              onChange={(e) => setStartQuery(e.target.value)}
              placeholder="Wybierz początkowy punkt"
              aria-label="Wybierz początkowy punkt trasy"
              className="w-full h-13 pl-11 pr-4 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all shadow-xs"
            />
          </div>

          {/* Search Settings Icon Button (Attachment 3) */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            title="Ustawienia wyszukiwania i profilu dostępności"
            aria-label="Otwórz ustawienia dostępności i filtry trasy"
            className={`ml-2.5 w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 ${
              profile === 'wheelchair'
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : profile === 'stroller'
                ? 'border-pink-400 bg-pink-50 text-pink-700'
                : profile === 'visually_impaired'
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Input 2: Destination Point (Attachment 3) */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" aria-hidden="true" />
          </span>
          <input
            type="text"
            value={endQuery}
            onChange={(e) => setEndQuery(e.target.value)}
            placeholder="Wybierz końcowy punkt"
            aria-label="Wybierz końcowy punkt trasy"
            className="w-full h-13 pl-11 pr-4 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all shadow-xs"
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Popularne trasy w Krakowie:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ROUTES.map((p, idx) => {
              const isSelected = !useCustomCoords && selectedPresetIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (useCustomCoords) onToggleCustomCoords(false);
                    handleSelectPreset(idx);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom coordinates checkbox & map pickers */}
        <div className="border-t border-slate-100 pt-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomCoords}
              onChange={(e) => {
                const checked = e.target.checked;
                onToggleCustomCoords(checked);
                if (!checked) {
                  handleSelectPreset(selectedPresetIdx);
                }
              }}
              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
            />
            <span>Wskaż własne punkty (kliknięcie na mapie / edycja współrzędnych)</span>
          </label>

          {useCustomCoords && (
            <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              {/* Start point coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">A</span>
                    Punkt startowy:
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetPickingTarget(pickingTarget === 'start' ? null : 'start')}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      pickingTarget === 'start'
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pickingTarget === 'start' ? '📍 Dotknij mapy...' : 'Wskaż na mapie'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={startLat}
                    onChange={(e) => setStartLat(e.target.value)}
                    placeholder="Szerokość (Lat)"
                    className="w-1/2 p-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                  <input
                    type="text"
                    value={startLng}
                    onChange={(e) => setStartLng(e.target.value)}
                    placeholder="Długość (Lng)"
                    className="w-1/2 p-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* End point coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">B</span>
                    Punkt docelowy:
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetPickingTarget(pickingTarget === 'end' ? null : 'end')}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      pickingTarget === 'end'
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pickingTarget === 'end' ? '🏁 Dotknij mapy...' : 'Wskaż na mapie'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={endLat}
                    onChange={(e) => setEndLat(e.target.value)}
                    placeholder="Szerokość (Lat)"
                    className="w-1/2 p-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                  <input
                    type="text"
                    value={endLng}
                    onChange={(e) => setEndLng(e.target.value)}
                    placeholder="Długość (Lng)"
                    className="w-1/2 p-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button (Attachment 1 style: Vibrant Magenta) */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-[#d90479] hover:bg-[#be185d] active:scale-[0.99] text-white font-extrabold text-base rounded-full shadow-lg shadow-pink-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Wyznaczanie trasy...
            </span>
          ) : (
            <>
              <MapPin className="w-5 h-5" aria-hidden="true" />
              <span>Wyznacz Trasę Bez Barier</span>
            </>
          )}
        </button>
      </form>

      {/* Accessibility Filter Modal */}
      <AccessibilityFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedProfile={profile}
        onSelectProfile={setProfile}
      />
    </div>
  );
}
