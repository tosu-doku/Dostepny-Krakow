'use client';

import { useState } from 'react';
import { UserRank, KRAKOW_GRID_CONFIG } from '@/services/grid';
import { Trophy, Compass, Camera, Sparkles, Eye, EyeOff, Info, X } from 'lucide-react';

interface DiscoveryBannerProps {
  userRank: UserRank | null;
  cityPercentage?: number;
  showDiscoveryGrid: boolean;
  onToggleDiscoveryGrid: () => void;
  unlockedTilesCount: number;
  auditedPhotosCount: number;
  liveLocationEnabled?: boolean;
  gpsStatusMessage?: string | null;
}

export default function DiscoveryBanner({
  userRank,
  cityPercentage: _cityPercentage = 0,
  showDiscoveryGrid,
  onToggleDiscoveryGrid,
  unlockedTilesCount,
  auditedPhotosCount,
  liveLocationEnabled = false,
  gpsStatusMessage = null,
}: DiscoveryBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const title = userRank?.title || 'Nowicjusz z Plant';
  const level = userRank?.level || 1;
  const totalXp = userRank?.totalXp || 0;
  const progressPercent = userRank?.progressPercent || 0;
  const nextLevelXp = userRank?.xpForNextLevel || 150;
  const currentXpInLevel = userRank?.xpInLevel || 0;

  return (
    <>
      <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-purple-900/90 text-white rounded-xl p-3 sm:p-3.5 shadow-md border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        {/* Left: User Level & Rank */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 font-black flex items-center justify-center text-base shadow-sm shrink-0">
            {level === 1 ? '🥉' : level === 2 ? '🥈' : level === 3 ? '🥇' : '🏆'}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold tracking-tight text-sm text-zinc-100">{title}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/30">
                Poziom {level}
              </span>
              {liveLocationEnabled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-bold text-[10px] border border-emerald-400/50 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Wędrówka GPS (na żywo)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 font-semibold text-[10px] border border-sky-400/30">
                  Planer tras
                </span>
              )}
              <span className="text-[11px] text-indigo-200 font-mono">
                {totalXp} XP
              </span>
              {gpsStatusMessage && (
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 animate-bounce">
                  ✨ {gpsStatusMessage}
                </span>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="w-48 sm:w-56 bg-zinc-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-blue-400 to-amber-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-300">
              {currentXpInLevel} / {nextLevelXp} XP do następnego poziomu
            </p>
          </div>
        </div>

        {/* Center / Right: Counters & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          {/* Tiles counters */}
          <div className="flex items-center gap-2 bg-black/25 px-2.5 py-1.5 rounded-lg border border-white/10 text-[11px]">
            <span className="flex items-center gap-1 text-sky-200" title="Odkryte kafelki siatki ~100m">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <strong>{unlockedTilesCount}</strong> / {KRAKOW_GRID_CONFIG.TOTAL_TILES}
            </span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1 text-amber-200" title="Złote kafelki zaudytowane ze zdjęciami">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <strong>{auditedPhotosCount}</strong> zdjęć (+100 XP)
            </span>
          </div>

          {/* Toggle Grid button */}
          <button
            type="button"
            onClick={onToggleDiscoveryGrid}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              showDiscoveryGrid
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold shadow-amber-400/20'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
          >
            {showDiscoveryGrid ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Siatka Odkryć: WŁ</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-300" />
                <span>Pokaż Siatkę</span>
              </>
            )}
          </button>

          {/* Info Modal Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Zasady grywalizacji i odkrywania mapy"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gamification Info Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Odkrywanie Krakowa & Grywalizacja
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <p>
                Centrum Krakowa (Stare Miasto, Kazimierz, Kleparz, Grzegórzki) podzielone zostało na siatkę
                <strong> 1 188 kafelków o wymiarach ~100m x 100m</strong>.
              </p>

              <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-zinc-100">Jak zdobywać punkty i odznaki:</p>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    +10
                  </span>
                  <div>
                    <strong>Przejście przez kafelek (XP):</strong> Zależnie od wybranego trybu w profilu:
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li><strong>Tryb Planera (domyślny):</strong> Kafelki odblokowują się wzdłuż wyszukiwanych tras A → B.</li>
                      <li><strong>Tryb Wędrówki na żywo (GPS):</strong> Kafelki odblokowują się automatycznie na bieżąco, gdy fizycznie wchodzisz w sektor siatki 100m.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    +50
                  </span>
                  <div>
                    <strong>Zgłoszenie nowej bariery:</strong> Poinformowanie o schodach, wysokim krawężniku lub braku pasów fakturowych.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    +100
                  </span>
                  <div>
                    <strong>Dodanie zdjęcia przeszkody (Złoty Kafelek):</strong> Zdjęcie to kluczowy dowód audytu! Zamienia kafelek w złoty punkt audytu dostępności.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-900 dark:text-blue-200 text-[11px]">
                🛡️ <strong>Prywatność (Privacy by Design):</strong> Aplikacja nie rejestruje ani nie przechowuje Twojego śladu GPS. Zapisywany jest wyłącznie fakt zaliczenia kafelka o danym numerze.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
              >
                Rozumiem, ruszajmy w miasto!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
