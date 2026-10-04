'use client';

import { useState } from 'react';
import { UserRank, KRAKOW_GRID_CONFIG } from '@/services/grid';
import {
  Compass,
  Camera,
  Eye,
  EyeOff,
  Info,
  X,
  Sparkles,
  Flame,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import DailyQuestModal, { DailyQuest } from './DailyQuestModal';

interface DiscoveryBannerProps {
  userRank: UserRank | null;
  cityPercentage?: number;
  showDiscoveryGrid: boolean;
  onToggleDiscoveryGrid: () => void;
  unlockedTilesCount: number;
  auditedPhotosCount: number;
  liveLocationEnabled?: boolean;
  gpsStatusMessage?: string | null;
  onNavigateToCrowdsource?: (coords?: { lat: number; lng: number }) => void;
}

const DEFAULT_DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'quest-krowodrza-stairs',
    title: 'Wejście do Parku Krakowskiego',
    subtitle: 'Schody i nawierzchnia (Krowodrza)',
    location: 'Krowodrza',
    distanceText: '18 m od Ciebie',
    currentChecks: 2,
    qualityStatus: 'Bardzo słabo sprawdzone',
    qualityNote: 'To miejsce ma mało aktualnych danych. Twoje zdjęcie będzie tu bardziej wartościowe niż w popularnych lokalizacjach.',
    progressCurrent: 1,
    progressTotal: 2,
    baseXp: 100,
    multiplier: 2,
    bonusBadge: 'Premia za rzadkie miejsce',
    category: 'STAIRS',
    coordinates: { lat: 50.0685, lng: 19.9238 },
  },
  {
    id: 'quest-center-discovery',
    title: 'Odkryj 5 nowych kafelków w centrum',
    subtitle: 'Mgła wojny i miejska dostępność',
    location: 'Stare Miasto',
    distanceText: 'W Twojej okolicy',
    currentChecks: 1,
    qualityStatus: 'Średnio sprawdzone',
    qualityNote: 'Wędruj w trybie na żywo lub zaplanuj trasę, aby odkryć nowe heksagony i podwoić zdobywane XP.',
    progressCurrent: 3,
    progressTotal: 5,
    baseXp: 50,
    multiplier: 2,
    bonusBadge: 'Szybki bonus dzienny',
    category: 'EXPLORATION',
    coordinates: { lat: 50.0614, lng: 19.9365 },
  },
];

export default function DiscoveryBanner({
  userRank,
  cityPercentage: _cityPercentage = 0,
  showDiscoveryGrid,
  onToggleDiscoveryGrid,
  unlockedTilesCount,
  auditedPhotosCount,
  liveLocationEnabled = false,
  gpsStatusMessage = null,
  onNavigateToCrowdsource,
}: DiscoveryBannerProps) {
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<DailyQuest | null>(null);

  const title = userRank?.title || 'Nowicjusz z Plant';
  const level = userRank?.level || 1;
  const totalXp = userRank?.totalXp || 0;
  const progressPercent = userRank?.progressPercent || 0;
  const nextLevelXp = userRank?.xpForNextLevel || 150;
  const currentXpInLevel = userRank?.xpInLevel || 0;

  const handleQuestAction = (quest: DailyQuest) => {
    setSelectedQuest(null);
    if (onNavigateToCrowdsource) {
      onNavigateToCrowdsource(quest.coordinates);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* 1. User Level & Exploration Progress Card (Pure Light Theme, Mobile-First) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            {/* Level Badge + Rank Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-900 border border-amber-300/80 font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                {level === 1 ? '🥉' : level === 2 ? '🥈' : level === 3 ? '🥇' : '🏆'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-slate-900 tracking-tight truncate">
                    {title}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300 shadow-2xs">
                    Poziom {level}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-semibold flex-wrap">
                  <span className="text-purple-700 font-bold">{totalXp} XP</span>
                  <span>•</span>
                  <span>{currentXpInLevel} / {nextLevelXp} XP</span>
                </div>
              </div>
            </div>

            {/* GPS Mode Badge */}
            {liveLocationEnabled ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1.5 shrink-0 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span>GPS Live</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px] shrink-0">
                Planer
              </span>
            )}
          </div>

          {/* Level XP Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold">
              <span>Postęp poziomu: {progressPercent}%</span>
              <span>Do poziomu {level + 1}: {nextLevelXp - currentXpInLevel} XP</span>
            </div>
          </div>

          {gpsStatusMessage && (
            <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{gpsStatusMessage}</span>
            </div>
          )}

          {/* Stats Grid: H3 Hexagons & Photos */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                <Compass className="w-3.5 h-3.5 text-purple-600" />
                <span>Odkryte heksagony</span>
              </div>
              <div className="text-base font-black text-slate-900">
                {unlockedTilesCount}{' '}
                <span className="text-xs text-slate-600 font-bold">/ {KRAKOW_GRID_CONFIG.TOTAL_TILES}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                <span>Zaudytowane</span>
              </div>
              <div className="text-base font-black text-slate-900">
                {auditedPhotosCount}{' '}
                <span className="text-xs text-slate-600 font-bold">zdjęć (+100 XP)</span>
              </div>
            </div>
          </div>

          {/* Map Grid Toggle & Info Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onToggleDiscoveryGrid}
              className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                showDiscoveryGrid
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {showDiscoveryGrid ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Ukryj siatkę heksagonów H3</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span>Pokaż siatkę heksagonów H3</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              aria-label="Informacje o grywalizacji"
              title="Zasady grywalizacji"
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Daily Quests Section (2 Daily Quests with 2x XP Multiplier) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-pink-100 text-[#d90479] flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
                  Misje Dnia
                </h3>
                <span className="text-[11px] font-bold text-[#d90479]">
                  Mnożnik 2x XP aktywny
                </span>
              </div>
            </div>

            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-pink-50 text-[#d90479] border border-pink-200">
              Reset o 00:00
            </span>
          </div>

          <div className="space-y-2.5">
            {DEFAULT_DAILY_QUESTS.map((quest) => {
              const totalXpReward = quest.baseXp * quest.multiplier;
              const progressPct = Math.round((quest.progressCurrent / quest.progressTotal) * 100);

              return (
                <div
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-pink-300 bg-white hover:bg-pink-50/30 transition-all cursor-pointer shadow-2xs active:scale-[0.99] group flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#d90479] mb-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{quest.distanceText}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug group-hover:text-[#d90479] transition-colors truncate">
                        {quest.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {quest.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-200 shadow-2xs">
                        +{totalXpReward} XP
                      </span>
                      <span className="text-[9px] font-extrabold text-[#d90479] bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                        {quest.multiplier}x Multiplier
                      </span>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                      <span>Postęp zadania</span>
                      <span>
                        {quest.progressCurrent} / {quest.progressTotal} ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80">
                      <div
                        className="bg-[#d90479] h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                    <span className="text-[#92400e] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                      {quest.qualityStatus}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#d90479] group-hover:translate-x-0.5 transition-transform">
                      <span>Szczegóły zadania</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Quest Modal (Matching Attachment 4) */}
      <DailyQuestModal
        quest={selectedQuest}
        isOpen={!!selectedQuest}
        onClose={() => setSelectedQuest(null)}
        onActionClick={handleQuestAction}
      />

      {/* Gamification Rules Modal */}
      {isRulesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">
                Jak działa eksploracja i punkty XP?
              </h2>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
              <p>
                <strong className="text-slate-900">Mgła Wojny (Uber H3):</strong> Cały Kraków podzielony jest na 697 regularnych komórek heksagonalnych. Nieodkryte sektory pokrywa mgła wojny.
              </p>
              <p>
                <strong className="text-slate-900">Odblokowywanie (+10 XP):</strong> Każdy nowy heksagon, przez który zaplanujesz trasę lub przejdziesz z aktywnym GPS, zostaje trwale odsłonięty.
              </p>
              <p>
                <strong className="text-slate-900">Audyt ze zdjęciem (+100 XP):</strong> Dodanie zweryfikowanego zdjęcia przeszkody lub podjazdu trwale oznacza heksagon złotym statusem.
              </p>
              <p>
                <strong className="text-slate-900">Misje Dnia (2x XP):</strong> Codziennie czekają na Ciebie 2 zadania terenowe z podwójną nagrodą punktową.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRulesModalOpen(false)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-full shadow-md transition-colors cursor-pointer"
            >
              Rozumiem, ruszam w miasto!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
