'use client';

import React, { useEffect } from 'react';
import { Camera, ChevronRight, Trophy, Sparkles } from 'lucide-react';
import type { DailyQuest } from '@/types/gamification';

// Re-export for backwards-compatibility with components that import from here
export type { DailyQuest };

interface DailyQuestModalProps {
  quest: DailyQuest | null;
  isOpen: boolean;
  onClose: () => void;
  onActionClick: (quest: DailyQuest) => void;
}

export default function DailyQuestModal({
  quest,
  isOpen,
  onClose,
  onActionClick,
}: DailyQuestModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !quest) return null;

  const totalRewardXp = quest.baseXp * quest.multiplier;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        {/* Top Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto shrink-0 mb-0.5" />

        {/* Top Status Header (Attachment 4) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d90479] animate-pulse" />
            <span className="text-xs sm:text-sm font-extrabold text-[#d90479] tracking-tight">
              Nowe zadanie w pobliżu
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij zadanie na później"
            className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer px-2 py-1"
          >
            Później
          </button>
        </div>

        {/* Quest Title & Icon Block (Attachment 4) */}
        <div className="flex flex-col gap-1">
          <div className="text-sm font-extrabold text-[#d90479]">
            {quest.distanceText}
          </div>

          <div className="flex items-center gap-3.5 mt-0.5">
            {/* Magenta Icon Box */}
            <div className="w-13 h-13 rounded-2xl bg-[#d90479] text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-600/25">
              {quest.category === 'STAIRS' ? (
                /* Stairs Icon matching Attachment 4 */
                <svg
                  className="w-7 h-7 stroke-white stroke-[2.5] fill-none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 19h4v-4h4v-4h4V7h4" />
                </svg>
              ) : (
                /* Exploration Sparkles */
                <Sparkles className="w-7 h-7" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2
                id="quest-modal-title"
                className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight"
              >
                {quest.title}
              </h2>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {quest.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Quality Info Card (Attachment 4) */}
        <div className="bg-[#fff1f7] border border-pink-200/90 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 leading-none">
                {quest.currentChecks}
              </span>
              <span className="text-sm font-bold text-slate-700">
                dotychczasowe sprawdzenia
              </span>
            </div>

            <span className="text-xs font-black px-3.5 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-amber-300 shadow-2xs">
              {quest.qualityStatus}
            </span>
          </div>

          {/* 5-segment Progress Bar matching Attachment 4 */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((seg) => (
              <div
                key={seg}
                className={`h-2.5 flex-1 rounded-full transition-all ${
                  seg <= quest.progressCurrent
                    ? 'bg-[#d90479]'
                    : 'bg-pink-200/80'
                }`}
              />
            ))}
          </div>

          {/* Explanation Text */}
          <p className="text-sm text-slate-800 leading-relaxed font-semibold">
            {quest.qualityNote}
          </p>
        </div>

        {/* Rewards & Bonus Badges */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              +{totalRewardXp} XP za wykonanie zadania
            </span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
              {quest.multiplier}x XP Aktywny
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span>{quest.bonusBadge}</span>
            </span>
          </div>
        </div>

        {/* Primary Action Button (Attachment 4 Magenta CTA) */}
        <button
          type="button"
          onClick={() => onActionClick(quest)}
          className="w-full bg-[#d90479] hover:bg-[#be185d] active:scale-[0.99] text-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xl shadow-pink-600/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-white" />
            </div>

            <div className="text-left">
              <div className="text-base font-black leading-tight">
                Zrób zdjęcie i zalicz zadanie
              </div>
              <div className="text-xs text-pink-100 font-semibold mt-0.5">
                Zajmie około 30 sekund
              </div>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-white shrink-0" />
        </button>
      </div>
    </div>
  );
}
